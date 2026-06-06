import {
  attachLocalAccountToCloud,
  buildLocalAccountFromCloud,
  detachLocalAccountFromCloud,
  getLocalAccount,
  replaceLocalAccount,
  subscribeToLocalAccount
} from './accountService';
import { getCloudContinuityPayload } from './continuityService';
import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';

const CONTINUITY_TABLE = 'navo_account_continuity';
const SAVE_DEBOUNCE_MS = 900;

const listeners = new Set();
const state = {
  initialized: false,
  cloudConfigured: hasSupabaseConfig,
  isAuthenticated: false,
  user: null,
  email: '',
  pendingAuth: false,
  saveStatus: hasSupabaseConfig ? 'signed-out' : 'local-only',
  lastSyncedAt: null,
  notice: '',
  errorMessage: ''
};

let initPromise = null;
let authSubscription = null;
let localAccountUnsubscribe = null;
let saveTimer = null;
let pendingAccount = null;
let lastSyncedPayloadKey = '';
let reconcilePromise = Promise.resolve();

function emit() {
  const snapshot = getAccountSystemSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

function setState(patch) {
  Object.assign(state, patch);
  emit();
}

function normalizeErrorMessage(error, fallback) {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

function getPayloadKey(account) {
  const payload = getCloudContinuityPayload(account);
  return payload ? JSON.stringify(payload) : '';
}

function buildCloudLink(user, syncedAt = null, attachedAt = null) {
  return {
    userId: user.id,
    email: user.email || '',
    attachedAt: attachedAt || syncedAt || new Date().toISOString(),
    lastSyncedAt: syncedAt
  };
}

async function fetchCloudContinuity(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(CONTINUITY_TABLE)
    .select('user_id, email, continuity_payload, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertCloudContinuity(account, user) {
  const supabase = getSupabaseClient();
  const payload = getCloudContinuityPayload(account);
  if (!supabase || !payload) return null;

  const { data, error } = await supabase
    .from(CONTINUITY_TABLE)
    .upsert(
      {
        user_id: user.id,
        email: user.email || null,
        account_id: payload.accountId,
        continuity_version: payload.version,
        continuity_payload: payload,
        created_at: payload.createdAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select('user_id, email, continuity_payload, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function markLocalAccountSynced(account, user, syncedAt, attachedAt = null) {
  const nextAccount = {
    ...account,
    kind: 'cloud-linked',
    cloud: buildCloudLink(user, syncedAt, attachedAt || account.cloud?.attachedAt || syncedAt)
  };

  const savedAccount = await replaceLocalAccount(nextAccount, {
    keepUpdatedAt: true,
    source: 'cloud'
  });

  lastSyncedPayloadKey = getPayloadKey(savedAccount);
  return savedAccount;
}

async function loadCloudAccountIntoLocal(record, user) {
  const nextAccount = buildLocalAccountFromCloud(
    record?.continuity_payload,
    buildCloudLink(user, record?.updated_at, record?.created_at)
  );

  if (!nextAccount) {
    return null;
  }

  const savedAccount = await replaceLocalAccount(nextAccount, {
    keepUpdatedAt: true,
    source: 'cloud'
  });

  lastSyncedPayloadKey = getPayloadKey(savedAccount);
  return savedAccount;
}

async function flushPendingSave() {
  if (!pendingAccount || !state.user) return;

  const accountToSave = pendingAccount;
  pendingAccount = null;

  try {
    const record = await upsertCloudContinuity(accountToSave, state.user);
    await markLocalAccountSynced(accountToSave, state.user, record?.updated_at, accountToSave.cloud?.attachedAt);
    setState({
      saveStatus: 'saved',
      lastSyncedAt: record?.updated_at || new Date().toISOString(),
      errorMessage: ''
    });
  } catch (error) {
    setState({
      saveStatus: 'error',
      errorMessage: normalizeErrorMessage(error, 'Cloud continuity could not be saved.'),
      notice: ''
    });
  }
}

function scheduleSave(account) {
  pendingAccount = account;

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  setState({
    saveStatus: 'saving',
    errorMessage: ''
  });

  saveTimer = setTimeout(() => {
    void flushPendingSave();
  }, SAVE_DEBOUNCE_MS);
}

async function reconcileSignedInUser(user) {
  const task = async () => {
    setState({
      initialized: true,
      isAuthenticated: true,
      user,
      email: user.email || '',
      pendingAuth: false,
      saveStatus: 'syncing',
      notice: '',
      errorMessage: ''
    });

    try {
      const cloudRecord = await fetchCloudContinuity(user.id);

      if (!cloudRecord) {
        const localAccount = await attachLocalAccountToCloud(buildCloudLink(user));
        const record = await upsertCloudContinuity(localAccount, user);
        await markLocalAccountSynced(localAccount, user, record?.updated_at, localAccount.cloud?.attachedAt);
        setState({
          saveStatus: 'saved',
          lastSyncedAt: record?.updated_at || new Date().toISOString(),
          notice: 'Your local environment is now attached to this Navo Account.',
          errorMessage: ''
        });
        return;
      }

      await loadCloudAccountIntoLocal(cloudRecord, user);
      setState({
        saveStatus: 'saved',
        lastSyncedAt: cloudRecord.updated_at || null,
        notice: '',
        errorMessage: ''
      });
    } catch (error) {
      setState({
        saveStatus: 'error',
        errorMessage: normalizeErrorMessage(error, 'Cloud continuity could not be loaded.'),
        notice: ''
      });
    }
  };

  reconcilePromise = reconcilePromise.then(task);
  return reconcilePromise;
}

async function handleSignedOut() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  pendingAccount = null;
  lastSyncedPayloadKey = '';

  await detachLocalAccountFromCloud();

  setState({
    initialized: true,
    isAuthenticated: false,
    user: null,
    email: '',
    pendingAuth: false,
    saveStatus: hasSupabaseConfig ? 'signed-out' : 'local-only',
    lastSyncedAt: null,
    notice: '',
    errorMessage: ''
  });
}

function handleLocalAccountChange(account, metadata = {}) {
  if (!state.isAuthenticated || !state.user) return;
  if (!account) return;

  if (metadata.source === 'cloud' || metadata.source === 'cloud-link' || metadata.source === 'cloud-detach') {
    return;
  }

  const payloadKey = getPayloadKey(account);
  if (!payloadKey || payloadKey === lastSyncedPayloadKey) {
    return;
  }

  scheduleSave(account);
}

export function getAccountSystemSnapshot() {
  return {
    ...state,
    userId: state.user?.id || null
  };
}

export function subscribeToAccountSystem(listener) {
  listeners.add(listener);
  listener(getAccountSystemSnapshot());
  return () => listeners.delete(listener);
}

export async function initAccountSystem() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!hasSupabaseConfig) {
      setState({
        initialized: true,
        cloudConfigured: false,
        saveStatus: 'local-only'
      });
      return getAccountSystemSnapshot();
    }

    if (!localAccountUnsubscribe) {
      localAccountUnsubscribe = subscribeToLocalAccount(handleLocalAccountChange);
    }

    const supabase = getSupabaseClient();

    const {
      data: { session }
    } = await supabase.auth.getSession();

    authSubscription = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        void handleSignedOut();
        return;
      }

      void reconcileSignedInUser(nextSession.user);
    });

    if (session?.user) {
      await reconcileSignedInUser(session.user);
    } else {
      setState({
        initialized: true,
        isAuthenticated: false,
        user: null,
        email: '',
        pendingAuth: false,
        saveStatus: 'signed-out'
      });
    }

    return getAccountSystemSnapshot();
  })();

  return initPromise;
}

export async function signUpWithEmail(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured in this build.');
  }

  setState({
    pendingAuth: true,
    errorMessage: '',
    notice: ''
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    setState({
      pendingAuth: false,
      errorMessage: normalizeErrorMessage(error, 'Account creation failed.'),
      notice: ''
    });
    throw error;
  }

  if (!data.session) {
    setState({
      pendingAuth: false,
      notice: 'Check your email to confirm this Navo Account before signing in.',
      errorMessage: ''
    });
  }

  return data;
}

export async function signInWithEmail(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured in this build.');
  }

  setState({
    pendingAuth: true,
    errorMessage: '',
    notice: ''
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setState({
      pendingAuth: false,
      errorMessage: normalizeErrorMessage(error, 'Sign-in failed.'),
      notice: ''
    });
    throw error;
  }

  return data;
}

export async function signOutAccount() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    setState({
      errorMessage: normalizeErrorMessage(error, 'Sign-out failed.'),
      notice: ''
    });
    throw error;
  }
}

export async function saveCloudContinuityNow() {
  if (!state.isAuthenticated || !state.user) return;

  const localAccount = await getLocalAccount();
  const payloadKey = getPayloadKey(localAccount);
  if (payloadKey === lastSyncedPayloadKey) {
    setState({
      saveStatus: 'saved'
    });
    return;
  }

  pendingAccount = localAccount;
  await flushPendingSave();
}
