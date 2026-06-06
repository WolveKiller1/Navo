/**
 * Low-level local persistence for Navo.
 * Uses IndexedDB with localStorage fallback and keeps the legacy keys intact.
 */

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

let db = null;
let useLocalStorage = false;

function readJsonFromLocalStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getStorageNowIso() {
  return new Date().toISOString();
}

export function generateStorageId(prefix = 'id') {
  try {
    return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function initStorage() {
  try {
    if (!window.indexedDB) {
      useLocalStorage = true;
      return;
    }

    return new Promise((resolve) => {
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
  } catch {
    useLocalStorage = true;
  }
}

export async function readLegacyPreferencesRecord() {
  try {
    if (useLocalStorage || !db) {
      return readJsonFromLocalStorage(LOCAL_PREFERENCES_KEY, null);
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

export async function readLegacyLastLanguageRecord() {
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

export async function readLegacyProfileRecord() {
  try {
    if (useLocalStorage || !db) {
      return readJsonFromLocalStorage(LOCAL_PROFILE_KEY, null);
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

export async function readAccountRecord() {
  try {
    if (useLocalStorage || !db) {
      return readJsonFromLocalStorage(LOCAL_ACCOUNT_KEY, null);
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([ACCOUNT_STORE], 'readonly');
      const store = transaction.objectStore(ACCOUNT_STORE);
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function writeAccountRecord(account) {
  if (!account) return null;

  try {
    if (useLocalStorage || !db) {
      writeJsonToLocalStorage(LOCAL_ACCOUNT_KEY, account);
      return account;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([ACCOUNT_STORE], 'readwrite');
      const store = transaction.objectStore(ACCOUNT_STORE);
      const request = store.put(account);
      request.onsuccess = () => resolve(account);
      request.onerror = () => resolve(account);
    });
  } catch {
    return account;
  }
}

export async function createSessionRecord(session) {
  if (!session) return null;

  try {
    if (useLocalStorage || !db) {
      const sessions = readJsonFromLocalStorage(LOCAL_SESSIONS_KEY, []);
      sessions.push(session);
      writeJsonToLocalStorage(LOCAL_SESSIONS_KEY, sessions);
      return session;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.add(session);
      request.onsuccess = () => resolve(session);
      request.onerror = () => resolve(session);
    });
  } catch {
    return session;
  }
}

export async function updateSessionRecord(sessionId, mutator) {
  if (!sessionId || typeof mutator !== 'function') return null;

  try {
    if (useLocalStorage || !db) {
      const sessions = readJsonFromLocalStorage(LOCAL_SESSIONS_KEY, []);
      const index = sessions.findIndex((session) => session.sessionId === sessionId);
      if (index === -1) return null;

      const current = sessions[index];
      const next = mutator(current);
      if (!next) return current;

      sessions[index] = next;
      writeJsonToLocalStorage(LOCAL_SESSIONS_KEY, sessions);
      return next;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        const current = request.result;
        if (!current) {
          resolve(null);
          return;
        }

        const next = mutator(current);
        if (!next) {
          resolve(current);
          return;
        }

        const putRequest = store.put(next);
        putRequest.onsuccess = () => resolve(next);
        putRequest.onerror = () => resolve(next);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getAllSessionRecords() {
  try {
    if (useLocalStorage || !db) {
      return readJsonFromLocalStorage(LOCAL_SESSIONS_KEY, []);
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteSessionRecord(sessionId) {
  if (!sessionId) {
    return { success: false, error: 'Invalid session ID.' };
  }

  try {
    if (useLocalStorage || !db) {
      const sessions = readJsonFromLocalStorage(LOCAL_SESSIONS_KEY, []);
      const filtered = sessions.filter((session) => session.sessionId !== sessionId);
      writeJsonToLocalStorage(LOCAL_SESSIONS_KEY, filtered);
      return { success: true };
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.delete(sessionId);
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
    });
  } catch {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}

export async function clearSessionRecords() {
  try {
    if (useLocalStorage || !db) {
      localStorage.setItem(LOCAL_SESSIONS_KEY, '[]');
      return { success: true };
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
    });
  } catch {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}

export async function clearAllStoredData() {
  try {
    if (useLocalStorage || !db) {
      localStorage.removeItem(LOCAL_SESSIONS_KEY);
      localStorage.removeItem(LOCAL_LAST_LANGUAGE_KEY);
      localStorage.removeItem(LOCAL_PROFILE_KEY);
      localStorage.removeItem(LOCAL_PREFERENCES_KEY);
      localStorage.removeItem(LOCAL_ACCOUNT_KEY);
      return { success: true };
    }

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

      const resolveIfDone = () => {
        if (sessionsCleared && settingsCleared && profileCleared && accountCleared) {
          resolve({ success: true });
        }
      };

      clearSessions.onsuccess = () => {
        sessionsCleared = true;
        resolveIfDone();
      };

      clearSettings.onsuccess = () => {
        settingsCleared = true;
        resolveIfDone();
      };

      clearProfile.onsuccess = () => {
        profileCleared = true;
        resolveIfDone();
      };

      clearAccount.onsuccess = () => {
        accountCleared = true;
        resolveIfDone();
      };

      clearSessions.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      clearSettings.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      clearProfile.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      clearAccount.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
    });
  } catch {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}
