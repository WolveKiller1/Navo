/**
 * Local storage service for Rylingo transcripts and session metadata
 * Uses IndexedDB with localStorage fallback
 * Silent failure on all operations
 */

import { getDefaultProfile } from './immersionProfile';

const DB_NAME = 'RylingoStorage';
const DB_VERSION = 3;
const SESSIONS_STORE = 'sessions';
const SETTINGS_STORE = 'settings';
const PROFILE_STORE = 'immersionProfile';
const ACCOUNT_STORE = 'account';

const LOCAL_ACCOUNT_KEY = 'rylingo_localAccount';
const LOCAL_SESSIONS_KEY = 'rylingo_sessions';
const LOCAL_LAST_LANGUAGE_KEY = 'rylingo_lastLanguage';
const LOCAL_PROFILE_KEY = 'rylingo_immersionProfile';
const LOCAL_PREFERENCES_KEY = 'rylingo_userPreferences';
const ACCOUNT_VERSION = 0;
const MAX_EXPOSURE_TRACES = 600;
const MAX_MOVEMENT_TRACES = 600;

let db = null;
let useLocalStorage = false;

function nowIso() {
  return new Date().toISOString();
}

function createStableAccountId() {
  try {
    return `navo_account_${crypto.randomUUID()}`;
  } catch {
    return `navo_account_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function buildDefaultAccount(seed = {}) {
  const createdAt = seed.createdAt || nowIso();
  const learningProfile = seed.learningProfile || getDefaultProfile();
  const activeLanguage = seed.activeLanguage || seed.lastLanguage || 'en';

  return {
    key: 'current',
    version: ACCOUNT_VERSION,
    id: seed.id || createStableAccountId(),
    kind: 'local',
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
    }
  };
}

function normalizeAccount(account) {
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
    patternMapReserved: account.continuity?.patternMapReserved
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
    updatedAt: nowIso(),
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

function createTraceId(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function normalizeTraceText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function limitTraces(items, max) {
  return items.slice(-max);
}

async function readLegacyPreferences() {
  try {
    if (useLocalStorage || !db) {
      const stored = localStorage.getItem(LOCAL_PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : null;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('userPreferences');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function readLegacyLastLanguage() {
  try {
    if (useLocalStorage || !db) {
      return localStorage.getItem(LOCAL_LAST_LANGUAGE_KEY);
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('lastLanguage');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function readLegacyProfile() {
  try {
    if (useLocalStorage || !db) {
      const stored = localStorage.getItem(LOCAL_PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([PROFILE_STORE], 'readonly');
      const store = transaction.objectStore(PROFILE_STORE);
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function readStoredAccount() {
  try {
    if (useLocalStorage || !db) {
      const stored = localStorage.getItem(LOCAL_ACCOUNT_KEY);
      return stored ? normalizeAccount(JSON.parse(stored)) : null;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([ACCOUNT_STORE], 'readonly');
      const store = transaction.objectStore(ACCOUNT_STORE);
      const request = store.get('current');
      request.onsuccess = () => resolve(normalizeAccount(request.result));
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeStoredAccount(account) {
  const normalized = normalizeAccount(account);
  if (!normalized) return null;

  try {
    if (useLocalStorage || !db) {
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(normalized));
      return normalized;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([ACCOUNT_STORE], 'readwrite');
      const store = transaction.objectStore(ACCOUNT_STORE);
      const request = store.put(normalized);
      request.onsuccess = () => resolve(normalized);
      request.onerror = () => resolve(normalized);
    });
  } catch {
    return normalized;
  }
}

async function loadOrCreateLocalAccount() {
  const stored = await readStoredAccount();
  if (stored) return stored;

  const legacyPreferences = await readLegacyPreferences();
  const legacyLastLanguage = await readLegacyLastLanguage();
  const legacyProfile = await readLegacyProfile();

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

  return writeStoredAccount(created);
}

async function updateLocalAccount(mutator) {
  const current = await loadOrCreateLocalAccount();
  const next = normalizeAccount(mutator(current));
  if (!next) return current;
  next.updatedAt = nowIso();
  return writeStoredAccount(next);
}

/**
 * Initialize storage (IndexedDB or localStorage fallback)
 */
export async function initStorage() {
  try {
    if (!window.indexedDB) {
      useLocalStorage = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        useLocalStorage = true;
        resolve();
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        
        if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
          database.createObjectStore(SESSIONS_STORE, { keyPath: 'sessionId' });
        }
        
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
        
        if (!database.objectStoreNames.contains(PROFILE_STORE)) {
          database.createObjectStore(PROFILE_STORE, { keyPath: 'key' });
        }

        if (!database.objectStoreNames.contains(ACCOUNT_STORE)) {
          database.createObjectStore(ACCOUNT_STORE, { keyPath: 'key' });
        }
      };
    });
  } catch (error) {
    useLocalStorage = true;
  }
}

/**
 * Create new session record
 */
export async function createSession(language = null) {
  const account = await loadOrCreateLocalAccount();
  const sessionId = crypto.randomUUID();
  const session = {
    sessionId,
    accountId: account.id,
    startTimestamp: Date.now(),
    endTimestamp: null,
    duration: null,
    exchangeCount: null,
    language,
    exchanges: []
  };

  try {
    if (useLocalStorage) {
      const sessions = JSON.parse(localStorage.getItem('rylingo_sessions') || '[]');
      sessions.push(session);
      localStorage.setItem('rylingo_sessions', JSON.stringify(sessions));
    } else if (db) {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      store.add(session);
    }
  } catch (error) {
    // Silent failure
  }

  return sessionId;
}

/**
 * Add exchange to existing session (incremental write)
 */
export async function addExchange(sessionId, userUtterance, rylingoReply) {
  if (!sessionId) return;

  const exchange = {
    userUtterance,
    rylingoReply,
    exchangeTimestamp: Date.now()
  };

  try {
    if (useLocalStorage) {
      const sessions = JSON.parse(localStorage.getItem('rylingo_sessions') || '[]');
      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        session.exchanges.push(exchange);
        localStorage.setItem('rylingo_sessions', JSON.stringify(sessions));
      }
    } else if (db) {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(sessionId);
      
      request.onsuccess = () => {
        const session = request.result;
        if (session) {
          session.exchanges.push(exchange);
          store.put(session);
        }
      };
    }
  } catch (error) {
    // Silent failure
  }
}

/**
 * Close session (write end timestamp, duration, and derived exchangeCount)
 */
export async function closeSession(sessionId) {
  if (!sessionId) return;

  try {
    if (useLocalStorage) {
      const sessions = JSON.parse(localStorage.getItem('rylingo_sessions') || '[]');
      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        session.endTimestamp = Date.now();
        session.duration = session.endTimestamp - session.startTimestamp;
        session.exchangeCount = session.exchanges.length;
        
        // Check if exchangeCount is 0
        if (session.exchangeCount === 0) {
          // Remove the session from storage
          sessions.splice(sessions.indexOf(session), 1);
          localStorage.setItem('rylingo_sessions', JSON.stringify(sessions));
        } else {
          localStorage.setItem('rylingo_sessions', JSON.stringify(sessions));
        }
      }
    } else if (db) {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        const session = request.result;
        if (session) {
          session.endTimestamp = Date.now();
          session.duration = session.endTimestamp - session.startTimestamp;
          session.exchangeCount = session.exchanges.length;
          
          // Check if exchangeCount is 0
          if (session.exchangeCount === 0) {
            // Remove the session from storage
            store.delete(sessionId);
          } else {
            store.put(session);
          }
        }
      };
    }
  } catch (error) {
    // Silent failure
  }
}

/**
 * Get last used language
 */
export async function getLastLanguage() {
  try {
    const account = await loadOrCreateLocalAccount();
    return account.languageSettings.lastLanguage || account.languageSettings.activeLanguage || null;
  } catch (error) {
    return null;
  }
}

/**
 * Save last used language
 */
export async function saveLastLanguage(language) {
  try {
    await updateLocalAccount((account) => ({
      ...account,
      languageSettings: {
        ...account.languageSettings,
        lastLanguage: language || account.languageSettings.activeLanguage
      }
    }));
  } catch (error) {
    // Silent failure
  }
}

/**
 * Get user preferences
 * Returns stored preferences or defaults
 */
export async function getUserPreferences() {
  const defaults = {
    activeLanguage: 'en',
    theme: 'dark',
    showHeardSpeech: true,
    voiceFeel: 'calm',
    phraseSpacing: 'balanced',
    softHaptics: false
  };

  try {
    const account = await loadOrCreateLocalAccount();
    return { ...defaults, ...toPreferences(account) };
  } catch (error) {
    return defaults;
  }
}

/**
 * Save user preferences
 */
export async function saveUserPreferences(preferences) {
  try {
    await updateLocalAccount((account) => mergePreferencesIntoAccount(account, preferences));
  } catch (error) {
    // Silent failure
  }
}

/**
 * Get all sessions (developer only - for console inspection)
 */
export async function getAllSessions() {
  try {
    if (useLocalStorage) {
      return JSON.parse(localStorage.getItem('rylingo_sessions') || '[]');
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readonly');
        const store = transaction.objectStore(SESSIONS_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    }
  } catch (error) {
    return [];
  }
}

/**
 * Get immersion profile
 */
export async function getImmersionProfile() {
  try {
    const account = await loadOrCreateLocalAccount();
    return account.immersionProfile.learningProfile || null;
  } catch (error) {
    return null;
  }
}

/**
 * Save immersion profile
 */
export async function saveImmersionProfile(profile) {
  try {
    await updateLocalAccount((account) => ({
      ...account,
      immersionProfile: {
        ...account.immersionProfile,
        learningProfile: profile || getDefaultProfile()
      }
    }));
  } catch (error) {
    // Silent failure
  }
}

export async function getLocalAccount() {
  try {
    return await loadOrCreateLocalAccount();
  } catch {
    return buildDefaultAccount();
  }
}

export async function recordExposureTrace({
  sourceEnvironment,
  text,
  normalizedText = null,
  interactionType = 'encountered'
}) {
  if (!text || !sourceEnvironment) return null;

  const timestamp = nowIso();

  return updateLocalAccount((account) => ({
    ...account,
    continuity: {
      ...account.continuity,
      exposureTraces: limitTraces(
        [
          ...account.continuity.exposureTraces,
          {
            id: createTraceId('exposure'),
            accountId: account.id,
            sourceEnvironment,
            text,
            normalizedText: normalizedText || normalizeTraceText(text),
            interactionType,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ],
        MAX_EXPOSURE_TRACES
      )
    }
  }));
}

export async function recordMovementTrace({
  sourceEnvironment,
  fromText,
  toText,
  pressureLabel = null,
  interactionType = 'nearby-path'
}) {
  if (!sourceEnvironment || !fromText || !toText) return null;

  const timestamp = nowIso();

  return updateLocalAccount((account) => ({
    ...account,
    continuity: {
      ...account.continuity,
      movementTraces: limitTraces(
        [
          ...account.continuity.movementTraces,
          {
            id: createTraceId('movement'),
            accountId: account.id,
            sourceEnvironment,
            fromText,
            toText,
            pressureLabel,
            interactionType,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ],
        MAX_MOVEMENT_TRACES
      )
    }
  }));
}

/**
 * Export all sessions as JSON file (includes immersion profile)
 * Returns { success: boolean, error?: string }
 */
export async function exportSessionsAsJSON() {
  try {
    const sessions = await getAllSessions();
    const account = await getLocalAccount();
    
    if ((!sessions || sessions.length === 0) && (!account?.continuity?.exposureTraces?.length) && (!account?.continuity?.movementTraces?.length)) {
      return { success: false, error: 'No local continuity to export.' };
    }
    
    const exportData = {
      localAccount: account,
      sessions,
      exportTimestamp: Date.now()
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `navo-local-account-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Export failed. Try again.' };
  }
}

/**
 * Delete a single session by ID
 * Returns { success: boolean, error?: string }
 */
export async function deleteSession(sessionId) {
  if (!sessionId) {
    return { success: false, error: 'Invalid session ID.' };
  }
  
  try {
    if (useLocalStorage) {
      const sessions = JSON.parse(localStorage.getItem('rylingo_sessions') || '[]');
      const filtered = sessions.filter(s => s.sessionId !== sessionId);
      localStorage.setItem('rylingo_sessions', JSON.stringify(filtered));
      return { success: true };
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
        const store = transaction.objectStore(SESSIONS_STORE);
        const request = store.delete(sessionId);
        
        request.onsuccess = () => resolve({ success: true });
        request.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      });
    }
    return { success: false, error: 'Storage not initialized.' };
  } catch (error) {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}

/**
 * Delete all sessions (keep settings)
 * Returns { success: boolean, error?: string }
 */
export async function deleteAllSessions() {
  try {
    if (useLocalStorage) {
      localStorage.setItem('rylingo_sessions', '[]');
      return { success: true };
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
        const store = transaction.objectStore(SESSIONS_STORE);
        const request = store.clear();
        
        request.onsuccess = () => resolve({ success: true });
        request.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      });
    }
    return { success: false, error: 'Storage not initialized.' };
  } catch (error) {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}

/**
 * Delete all data (sessions + settings + profile)
 * Returns { success: boolean, error?: string }
 */
export async function deleteAllData() {
  try {
    if (useLocalStorage) {
      localStorage.removeItem(LOCAL_SESSIONS_KEY);
      localStorage.removeItem(LOCAL_LAST_LANGUAGE_KEY);
      localStorage.removeItem(LOCAL_PROFILE_KEY);
      localStorage.removeItem(LOCAL_PREFERENCES_KEY);
      localStorage.removeItem(LOCAL_ACCOUNT_KEY);
      return { success: true };
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([SESSIONS_STORE, SETTINGS_STORE, PROFILE_STORE, ACCOUNT_STORE], 'readwrite');
        const sessionsStore = transaction.objectStore(SESSIONS_STORE);
        const settingsStore = transaction.objectStore(SETTINGS_STORE);
        const profileStore = transaction.objectStore(PROFILE_STORE);
        const accountStore = transaction.objectStore(ACCOUNT_STORE);
        
        const clearSessions = sessionsStore.clear();
        const clearSettings = settingsStore.clear();
        const clearProfile = profileStore.clear();
        const clearAccount = accountStore.clear();
        
        let sessionsCleared = false;
        let settingsCleared = false;
        let profileCleared = false;
        let accountCleared = false;
        
        clearSessions.onsuccess = () => {
          sessionsCleared = true;
          if (settingsCleared && profileCleared && accountCleared) resolve({ success: true });
        };
        
        clearSettings.onsuccess = () => {
          settingsCleared = true;
          if (sessionsCleared && profileCleared && accountCleared) resolve({ success: true });
        };
        
        clearProfile.onsuccess = () => {
          profileCleared = true;
          if (sessionsCleared && settingsCleared && accountCleared) resolve({ success: true });
        };

        clearAccount.onsuccess = () => {
          accountCleared = true;
          if (sessionsCleared && settingsCleared && profileCleared) resolve({ success: true });
        };
        
        clearSessions.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
        clearSettings.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
        clearProfile.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
        clearAccount.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      });
    }
    return { success: false, error: 'Storage not initialized.' };
  } catch (error) {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}
