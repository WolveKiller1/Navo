/**
 * Local storage service for Rylingo transcripts and session metadata
 * Uses IndexedDB with localStorage fallback
 * Silent failure on all operations
 */

const DB_NAME = 'RylingoStorage';
const DB_VERSION = 2;
const SESSIONS_STORE = 'sessions';
const SETTINGS_STORE = 'settings';
const PROFILE_STORE = 'immersionProfile';

let db = null;
let useLocalStorage = false;

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
  const sessionId = crypto.randomUUID();
  const session = {
    sessionId,
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
    if (useLocalStorage) {
      return localStorage.getItem('rylingo_lastLanguage');
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get('lastLanguage');
        
        request.onsuccess = () => {
          resolve(request.result?.value || null);
        };
        
        request.onerror = () => resolve(null);
      });
    }
  } catch (error) {
    return null;
  }
}

/**
 * Save last used language
 */
export async function saveLastLanguage(language) {
  try {
    if (useLocalStorage) {
      if (language) {
        localStorage.setItem('rylingo_lastLanguage', language);
      } else {
        localStorage.removeItem('rylingo_lastLanguage');
      }
    } else if (db) {
      const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      store.put({ key: 'lastLanguage', value: language });
    }
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
    if (useLocalStorage) {
      const stored = localStorage.getItem('rylingo_immersionProfile');
      return stored ? JSON.parse(stored) : null;
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([PROFILE_STORE], 'readonly');
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.get('current');
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = () => resolve(null);
      });
    }
  } catch (error) {
    return null;
  }
}

/**
 * Save immersion profile
 */
export async function saveImmersionProfile(profile) {
  try {
    if (useLocalStorage) {
      localStorage.setItem('rylingo_immersionProfile', JSON.stringify(profile));
    } else if (db) {
      const transaction = db.transaction([PROFILE_STORE], 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      store.put(profile);
    }
  } catch (error) {
    // Silent failure
  }
}

/**
 * Export all sessions as JSON file (includes immersion profile)
 * Returns { success: boolean, error?: string }
 */
export async function exportSessionsAsJSON() {
  try {
    const sessions = await getAllSessions();
    const profile = await getImmersionProfile();
    
    if (!sessions || sessions.length === 0) {
      return { success: false, error: 'No conversations to export.' };
    }
    
    const exportData = {
      sessions: sessions,
      immersionProfile: profile,
      exportTimestamp: Date.now()
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rylingo-conversations-${Date.now()}.json`;
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
      localStorage.removeItem('rylingo_sessions');
      localStorage.removeItem('rylingo_lastLanguage');
      localStorage.removeItem('rylingo_immersionProfile');
      return { success: true };
    } else if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([SESSIONS_STORE, SETTINGS_STORE, PROFILE_STORE], 'readwrite');
        const sessionsStore = transaction.objectStore(SESSIONS_STORE);
        const settingsStore = transaction.objectStore(SETTINGS_STORE);
        const profileStore = transaction.objectStore(PROFILE_STORE);
        
        const clearSessions = sessionsStore.clear();
        const clearSettings = settingsStore.clear();
        const clearProfile = profileStore.clear();
        
        let sessionsCleared = false;
        let settingsCleared = false;
        let profileCleared = false;
        
        clearSessions.onsuccess = () => {
          sessionsCleared = true;
          if (settingsCleared && profileCleared) resolve({ success: true });
        };
        
        clearSettings.onsuccess = () => {
          settingsCleared = true;
          if (sessionsCleared && profileCleared) resolve({ success: true });
        };
        
        clearProfile.onsuccess = () => {
          profileCleared = true;
          if (sessionsCleared && settingsCleared) resolve({ success: true });
        };
        
        clearSessions.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
        clearSettings.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
        clearProfile.onerror = () => resolve({ success: false, error: 'Delete failed. Try again.' });
      });
    }
    return { success: false, error: 'Storage not initialized.' };
  } catch (error) {
    return { success: false, error: 'Delete failed. Try again.' };
  }
}
