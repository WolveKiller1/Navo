import { getDefaultProfile } from './immersionProfile';
import {
  clearAllStoredData,
  generateStorageId,
  getStorageNowIso,
  readAccountRecord,
  readLegacyLastLanguageRecord,
  readLegacyPreferencesRecord,
  readLegacyProfileRecord,
  writeAccountRecord
} from './storage';

const ACCOUNT_VERSION = 0;
const DEFAULT_PREFERENCES = {
  activeLanguage: 'en',
  theme: 'dark',
  showHeardSpeech: true,
  voiceFeel: 'calm',
  phraseSpacing: 'balanced',
  softHaptics: false
};

const listeners = new Set();

function emitLocalAccountChange(account, metadata = {}) {
  listeners.forEach((listener) => {
    try {
      listener(account, metadata);
    } catch {
      // Silent failure
    }
  });
}

export function normalizeCloudAccount(cloud) {
  if (!cloud || typeof cloud !== 'object') return null;
  if (typeof cloud.userId !== 'string' || !cloud.userId.trim()) return null;

  return {
    provider: 'supabase',
    userId: cloud.userId.trim(),
    email: typeof cloud.email === 'string' ? cloud.email.trim() : '',
    attachedAt: typeof cloud.attachedAt === 'string' ? cloud.attachedAt : getStorageNowIso(),
    lastSyncedAt: typeof cloud.lastSyncedAt === 'string' ? cloud.lastSyncedAt : null
  };
}

export function buildDefaultAccount(seed = {}) {
  const createdAt = seed.createdAt || getStorageNowIso();
  const activeLanguage = seed.activeLanguage || seed.lastLanguage || 'en';
  const learningProfile = seed.learningProfile || getDefaultProfile();
  const cloud = normalizeCloudAccount(seed.cloud);

  return {
    key: 'current',
    version: ACCOUNT_VERSION,
    id: seed.id || generateStorageId('navo_account'),
    kind: cloud ? 'cloud-linked' : 'local',
    createdAt,
    updatedAt: seed.updatedAt || createdAt,
    languageSettings: {
      activeLanguage,
      lastLanguage: seed.lastLanguage || activeLanguage,
      availableLanguages: ['en', 'pt']
    },
    voiceSettings: {
      voiceFeel: seed.voiceFeel || 'calm',
      phraseSpacing: seed.phraseSpacing || 'balanced'
    },
    immersionProfile: {
      theme: seed.theme || 'dark',
      showHeardSpeech: seed.showHeardSpeech ?? true,
      softHaptics: seed.softHaptics ?? false,
      learningProfile
    },
    continuity: {
      exposureTraces: Array.isArray(seed.exposureTraces) ? seed.exposureTraces : [],
      movementTraces: Array.isArray(seed.movementTraces) ? seed.movementTraces : [],
      patternMapReserved: seed.patternMapReserved && typeof seed.patternMapReserved === 'object'
        ? seed.patternMapReserved
        : {}
    },
    cloud
  };
}

export function normalizeAccount(account) {
  if (!account || typeof account !== 'object') return null;

  return buildDefaultAccount({
    ...account,
    id: typeof account.id === 'string' ? account.id : undefined,
    createdAt: typeof account.createdAt === 'string' ? account.createdAt : undefined,
    updatedAt: typeof account.updatedAt === 'string' ? account.updatedAt : undefined,
    activeLanguage: account.languageSettings?.activeLanguage,
    lastLanguage: account.languageSettings?.lastLanguage,
    voiceFeel: account.voiceSettings?.voiceFeel,
    phraseSpacing: account.voiceSettings?.phraseSpacing,
    theme: account.immersionProfile?.theme,
    showHeardSpeech: account.immersionProfile?.showHeardSpeech,
    softHaptics: account.immersionProfile?.softHaptics,
    learningProfile: account.immersionProfile?.learningProfile,
    exposureTraces: account.continuity?.exposureTraces,
    movementTraces: account.continuity?.movementTraces,
    patternMapReserved: account.continuity?.patternMapReserved,
    cloud: account.cloud
  });
}

function toPreferences(account) {
  return {
    activeLanguage: account.languageSettings.activeLanguage,
    theme: account.immersionProfile.theme,
    showHeardSpeech: account.immersionProfile.showHeardSpeech,
    voiceFeel: account.voiceSettings.voiceFeel,
    phraseSpacing: account.voiceSettings.phraseSpacing,
    softHaptics: account.immersionProfile.softHaptics
  };
}

function mergePreferencesIntoAccount(account, preferences = {}) {
  return normalizeAccount({
    ...account,
    updatedAt: getStorageNowIso(),
    languageSettings: {
      ...account.languageSettings,
      activeLanguage: preferences.activeLanguage || account.languageSettings.activeLanguage,
      lastLanguage:
        preferences.lastLanguage ||
        preferences.activeLanguage ||
        account.languageSettings.lastLanguage
    },
    voiceSettings: {
      ...account.voiceSettings,
      voiceFeel: preferences.voiceFeel || account.voiceSettings.voiceFeel,
      phraseSpacing: preferences.phraseSpacing || account.voiceSettings.phraseSpacing
    },
    immersionProfile: {
      ...account.immersionProfile,
      theme: preferences.theme || account.immersionProfile.theme,
      showHeardSpeech:
        typeof preferences.showHeardSpeech === 'boolean'
          ? preferences.showHeardSpeech
          : account.immersionProfile.showHeardSpeech,
      softHaptics:
        typeof preferences.softHaptics === 'boolean'
          ? preferences.softHaptics
          : account.immersionProfile.softHaptics
    }
  });
}

async function persistAccount(account, metadata = {}) {
  const normalized = normalizeAccount(account);
  if (!normalized) return null;

  await writeAccountRecord(normalized);
  emitLocalAccountChange(normalized, metadata);
  return normalized;
}

async function loadOrCreateLocalAccount() {
  const stored = normalizeAccount(await readAccountRecord());
  if (stored) return stored;

  const legacyPreferences = await readLegacyPreferencesRecord();
  const legacyLastLanguage = await readLegacyLastLanguageRecord();
  const legacyProfile = await readLegacyProfileRecord();

  const created = buildDefaultAccount({
    activeLanguage: legacyPreferences?.activeLanguage || legacyLastLanguage || 'en',
    lastLanguage: legacyLastLanguage || legacyPreferences?.activeLanguage || 'en',
    theme: legacyPreferences?.theme,
    showHeardSpeech: legacyPreferences?.showHeardSpeech,
    voiceFeel: legacyPreferences?.voiceFeel,
    phraseSpacing: legacyPreferences?.phraseSpacing,
    softHaptics: legacyPreferences?.softHaptics,
    learningProfile: legacyProfile || getDefaultProfile()
  });

  return persistAccount(created, { source: 'local-bootstrap' });
}

export async function getLocalAccount() {
  try {
    return await loadOrCreateLocalAccount();
  } catch {
    return buildDefaultAccount();
  }
}

export async function updateLocalAccount(mutator, options = {}) {
  const current = await loadOrCreateLocalAccount();
  const next = normalizeAccount(mutator(current));
  if (!next) return current;
  next.updatedAt = getStorageNowIso();
  return persistAccount(next, { source: options.source || 'local-update' });
}

export async function replaceLocalAccount(account, options = {}) {
  const nextAccount = normalizeAccount(account);
  if (!nextAccount) {
    return loadOrCreateLocalAccount();
  }

  nextAccount.updatedAt = options.keepUpdatedAt ? nextAccount.updatedAt : getStorageNowIso();
  return persistAccount(nextAccount, { source: options.source || 'local-replace' });
}

export function subscribeToLocalAccount(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function attachLocalAccountToCloud(cloud) {
  return updateLocalAccount(
    (account) => ({
      ...account,
      kind: cloud?.userId ? 'cloud-linked' : 'local',
      cloud: normalizeCloudAccount({
        ...account.cloud,
        ...cloud,
        attachedAt: account.cloud?.attachedAt || getStorageNowIso()
      })
    }),
    { source: 'cloud-link' }
  );
}

export async function detachLocalAccountFromCloud() {
  return updateLocalAccount(
    (account) => ({
      ...account,
      kind: 'local',
      cloud: null
    }),
    { source: 'cloud-detach' }
  );
}

export async function getLastLanguage() {
  try {
    const account = await loadOrCreateLocalAccount();
    return account.languageSettings.lastLanguage || account.languageSettings.activeLanguage || null;
  } catch {
    return null;
  }
}

export async function saveLastLanguage(language) {
  try {
    await updateLocalAccount((account) => ({
      ...account,
      languageSettings: {
        ...account.languageSettings,
        lastLanguage: language || account.languageSettings.activeLanguage
      }
    }));
  } catch {
    // Silent failure
  }
}

export async function getUserPreferences() {
  try {
    const account = await loadOrCreateLocalAccount();
    return { ...DEFAULT_PREFERENCES, ...toPreferences(account) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function saveUserPreferences(preferences) {
  try {
    await updateLocalAccount((account) => mergePreferencesIntoAccount(account, preferences));
  } catch {
    // Silent failure
  }
}

export async function getImmersionProfile() {
  try {
    const account = await loadOrCreateLocalAccount();
    return account.immersionProfile.learningProfile || null;
  } catch {
    return null;
  }
}

export async function saveImmersionProfile(profile) {
  try {
    await updateLocalAccount((account) => ({
      ...account,
      immersionProfile: {
        ...account.immersionProfile,
        learningProfile: profile || getDefaultProfile()
      }
    }));
  } catch {
    // Silent failure
  }
}

export function buildLocalAccountFromCloud(payload, cloud) {
  if (!payload || typeof payload !== 'object') return null;

  return normalizeAccount({
    id: payload.accountId,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    kind: cloud ? 'cloud-linked' : 'local',
    languageSettings: payload.languageSettings,
    voiceSettings: payload.voiceSettings,
    immersionProfile: payload.immersionProfile,
    continuity: payload.continuity,
    cloud: normalizeCloudAccount(cloud)
  });
}

export async function deleteLocalAccountData() {
  return clearAllStoredData();
}
