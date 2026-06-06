/**
 * Local storage service for Rylingo transcripts and session metadata
 * Uses IndexedDB with localStorage fallback
 * Silent failure on all operations
 */

import { getDefaultProfile } from './immersionProfile';
import { isReusableSentence } from './sentenceUtils';

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
const MAX_CLOUD_EXPOSURE_TRACES = 220;
const MAX_CLOUD_MOVEMENT_TRACES = 220;
const CLOUD_EXCLUDED_KEYS = new Set([
  'sessions',
  'exchanges',
  'transcript',
  'transcripts',
  'conversation',
  'conversations',
  'messages',
  'userutterance',
  'rylingoreply',
  'aitext',
  'usertext',
  'fulltext',
  'sessionhistory',
  'roomhistory'
]);

let db = null;
let useLocalStorage = false;
const accountListeners = new Set();

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

function normalizeCloudAccount(cloud) {
  if (!cloud || typeof cloud !== 'object') return null;
  if (typeof cloud.userId !== 'string' || !cloud.userId.trim()) return null;

  return {
    provider: 'supabase',
    userId: cloud.userId.trim(),
    email: typeof cloud.email === 'string' ? cloud.email.trim() : '',
    attachedAt: typeof cloud.attachedAt === 'string' ? cloud.attachedAt : nowIso(),
    lastSyncedAt: typeof cloud.lastSyncedAt === 'string' ? cloud.lastSyncedAt : null
  };
}

function isCloudExcludedKey(key) {
  return CLOUD_EXCLUDED_KEYS.has(String(key || '').trim().toLowerCase());
}

function sanitizeCloudValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeCloudValue(item))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized = {};

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (isCloudExcludedKey(key)) {
      return;
    }

    const nextValue = sanitizeCloudValue(nestedValue);
    if (nextValue !== undefined) {
      sanitized[key] = nextValue;
    }
  });

  return sanitized;
}

function buildLocalSessionSummary(account) {
  return {
    exposureTraceCount: Array.isArray(account?.continuity?.exposureTraces)
      ? account.continuity.exposureTraces.length
      : 0,
    movementTraceCount: Array.isArray(account?.continuity?.movementTraces)
      ? account.continuity.movementTraces.length
      : 0,
    roomConversationsStoredLocally: true,
    roomTranscriptsInCloud: false
  };
}

function deriveRoomExposureTraceForCloud(trace) {
  if (!trace || typeof trace !== 'object') return null;

  return sanitizeCloudValue({
    sourceEnvironment: 'room',
    traceKind: 'derived',
    language: trace.language || null,
    interactionType: trace.interactionType || 'encountered',
    structureFamily: trace.structureFamily || null,
    functionHint: trace.functionHint || null,
    patternHint: trace.patternHint || null,
    movementHint: trace.movementHint || null,
    createdAt: trace.createdAt || null,
    updatedAt: trace.updatedAt || null,
    counts: trace.counts || null,
    density: trace.density || null
  });
}

function deriveRoomMovementTraceForCloud(trace) {
  if (!trace || typeof trace !== 'object') return null;

  return sanitizeCloudValue({
    sourceEnvironment: 'room',
    traceKind: 'derived',
    language: trace.language || null,
    interactionType: trace.interactionType || 'nearby-path',
    structureFamily: trace.structureFamily || null,
    functionHint: trace.functionHint || null,
    patternHint: trace.patternHint || null,
    movementHint: trace.movementHint || null,
    createdAt: trace.createdAt || null,
    updatedAt: trace.updatedAt || null,
    counts: trace.counts || null,
    density: trace.density || null
  });
}

function prepareExposureTracesForCloud(traces) {
  if (!Array.isArray(traces)) return [];

  return limitCloudTraces(dedupeCloudTraces(traces
    .map((trace) => {
      if (trace?.sourceEnvironment === 'room') {
        return deriveRoomExposureTraceForCloud(trace);
      }

      return sanitizeCloudValue(trace);
    })
    .filter(Boolean)), MAX_CLOUD_EXPOSURE_TRACES);
}

function prepareMovementTracesForCloud(traces) {
  if (!Array.isArray(traces)) return [];

  return limitCloudTraces(dedupeCloudTraces(traces
    .map((trace) => {
      if (trace?.sourceEnvironment === 'room') {
        return deriveRoomMovementTraceForCloud(trace);
      }

      return sanitizeCloudValue(trace);
    })
    .filter(Boolean)), MAX_CLOUD_MOVEMENT_TRACES);
}

function emitAccountChange(account, metadata = {}) {
  accountListeners.forEach((listener) => {
    try {
      listener(account, metadata);
    } catch {
      // Silent failure
    }
  });
}

function buildDefaultAccount(seed = {}) {
  const createdAt = seed.createdAt || nowIso();
  const learningProfile = seed.learningProfile || getDefaultProfile();
  const activeLanguage = seed.activeLanguage || seed.lastLanguage || 'en';
  const cloud = normalizeCloudAccount(seed.cloud);

  return {
    key: 'current',
    version: ACCOUNT_VERSION,
    id: seed.id || createStableAccountId(),
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
    patternMapReserved: account.continuity?.patternMapReserved,
    cloud: account.cloud
  });
}

function buildCloudContinuityPayload(account) {
  const normalized = normalizeAccount(account);
  if (!normalized) return null;

  const payload = {
    version: 1,
    accountId: normalized.id,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    kind: 'navo-account',
    languageSettings: normalized.languageSettings,
    voiceSettings: normalized.voiceSettings,
    immersionProfile: normalized.immersionProfile,
    continuity: {
      exposureTraces: prepareExposureTracesForCloud(normalized.continuity?.exposureTraces),
      movementTraces: prepareMovementTracesForCloud(normalized.continuity?.movementTraces),
      patternMapReserved: normalized.continuity?.patternMapReserved || {}
    },
    metadata: {
      localKind: normalized.kind || 'local',
      sessionSummary: buildLocalSessionSummary(normalized)
    }
  };

  return sanitizeCloudValue(payload);
}

function buildAccountFromCloudPayload(payload, cloud = null) {
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
    cloud
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

function limitCloudTraces(items, max) {
  return items.slice(-max);
}

function isMeaningfulTraceText(text) {
  const normalized = normalizeTraceText(text);
  if (!normalized) return false;

  const roomRepairPrefixes = [
    'i heard',
    'can you repeat',
    'could you repeat',
    'say that again',
    'i did not catch',
    "i didn't catch",
    'what did you say',
    'sorry, i',
    'sorry i'
  ];

  return !roomRepairPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function getMovementPriority(interactionType) {
  switch (interactionType) {
    case 'carried':
      return 4;
    case 'transformed':
      return 3;
    case 'stabilized':
      return 2;
    case 'redirected':
      return 1;
    case 'nearby-path':
    default:
      return 0;
  }
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

async function writeStoredAccount(account, options = {}) {
  const normalized = normalizeAccount(account);
  if (!normalized) return null;

  try {
    if (useLocalStorage || !db) {
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(normalized));
      if (options.notify !== false) {
        emitAccountChange(normalized, options.metadata || {});
      }
      return normalized;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([ACCOUNT_STORE], 'readwrite');
      const store = transaction.objectStore(ACCOUNT_STORE);
      const request = store.put(normalized);
      request.onsuccess = () => {
        if (options.notify !== false) {
          emitAccountChange(normalized, options.metadata || {});
        }
        resolve(normalized);
      };
      request.onerror = () => resolve(normalized);
    });
  } catch {
    return normalized;
  }
}

function cleanSessionText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function trimPreviewText(text, maxLength = 84) {
  const cleaned = cleanSessionText(text);
  if (!cleaned) return '';
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
}

function collectTraceTexts(traces, options = {}) {
  const max = options.max || 6;
  const sourceEnvironment = options.sourceEnvironment || null;
  const interactionTypes = Array.isArray(options.interactionTypes) ? options.interactionTypes : null;
  const language = options.language || null;
  const seen = new Set();
  const collected = [];

  for (let index = traces.length - 1; index >= 0; index -= 1) {
    const trace = traces[index];
    if (sourceEnvironment && trace?.sourceEnvironment !== sourceEnvironment) continue;
    if (interactionTypes && !interactionTypes.includes(trace?.interactionType)) continue;
    if (language && trace?.language && trace.language !== language) continue;

    const text = cleanSessionText(trace?.text);
    const normalized = trace?.normalizedText || normalizeTraceText(text);

    if (!text || !normalized || seen.has(normalized) || !isMeaningfulTraceText(text)) {
      continue;
    }

    seen.add(normalized);
    collected.push(text);
    if (collected.length >= max) break;
  }

  return collected;
}

function dedupeCloudTraces(traces) {
  const deduped = new Map();

  traces.forEach((trace) => {
    const key = JSON.stringify(trace);
    deduped.set(key, trace);
  });

  return Array.from(deduped.values());
}

function isMeaningfulExchange(exchange) {
  const userText = cleanSessionText(exchange?.userUtterance);
  const aiText = cleanSessionText(exchange?.rylingoReply);

  if (isReusableSentence(userText) || isReusableSentence(aiText)) {
    return true;
  }

  return userText.length >= 8 || aiText.length >= 8;
}

function getSessionPreviewCandidates(session) {
  if (!Array.isArray(session?.exchanges)) return [];

  const candidates = [];
  const seen = new Set();

  session.exchanges.forEach((exchange) => {
    [exchange?.userUtterance, exchange?.rylingoReply].forEach((text) => {
      const cleaned = cleanSessionText(text);
      const normalized = normalizeTraceText(cleaned);
      if (!cleaned || !normalized || seen.has(normalized) || !isReusableSentence(cleaned)) {
        return;
      }

      seen.add(normalized);
      candidates.push(cleaned);
    });
  });

  return candidates;
}

function deriveReentrySummary(session, nearbyPhrases, openingSentence) {
  const languageLabel = session?.language === 'pt' ? 'Portuguese' : 'English';
  const parts = [`Returning near a previous local room in ${languageLabel}.`];

  if (nearbyPhrases.length > 0) {
    parts.push(`Nearby phrases: ${nearbyPhrases.join(' | ')}.`);
  }

  if (openingSentence) {
    parts.push(`A familiar sentence nearby: ${openingSentence}.`);
  }

  if (session?.exchangeCount) {
    parts.push(`Keep the exchange brief and natural. Do not mention memory, history, or summaries unless the learner does.`);
  } else {
    parts.push('Do not mention memory, history, or summaries unless the learner does.');
  }

  return parts.join(' ');
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

  return writeStoredAccount(created, { metadata: { source: 'local-bootstrap' } });
}

async function updateLocalAccount(mutator, options = {}) {
  const current = await loadOrCreateLocalAccount();
  const next = normalizeAccount(mutator(current));
  if (!next) return current;
  next.updatedAt = nowIso();
  return writeStoredAccount(next, {
    metadata: {
      source: options.source || 'local-update'
    }
  });
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

export function isMeaningfulSession(session) {
  if (!session || !Array.isArray(session.exchanges) || session.exchanges.length === 0) {
    return false;
  }

  return session.exchanges.some(isMeaningfulExchange);
}

export async function getMeaningfulSessions() {
  const sessions = await getAllSessions();
  return sessions.filter(isMeaningfulSession);
}

export function buildSessionNearbyPhrases(session, options = {}) {
  const max = options.max || 3;
  const phrases = getSessionPreviewCandidates(session)
    .slice(0, max)
    .map((text) => trimPreviewText(text, 54));

  return phrases;
}

export function buildSessionPreviewText(session) {
  const [firstPhrase] = buildSessionNearbyPhrases(session, { max: 1 });
  if (firstPhrase) return firstPhrase;

  const fallback = cleanSessionText(session?.exchanges?.[0]?.userUtterance || session?.exchanges?.[0]?.rylingoReply);
  return fallback ? trimPreviewText(fallback, 64) : 'Conversation';
}

export function buildSessionReentryState(session) {
  const nearbyPhrases = buildSessionNearbyPhrases(session, { max: 3 });
  const reusableUserSentence = Array.isArray(session?.exchanges)
    ? [...session.exchanges]
      .reverse()
      .map((exchange) => cleanSessionText(exchange?.userUtterance))
      .find((text) => isReusableSentence(text))
    : '';
  const openingSentence = reusableUserSentence || nearbyPhrases[0] || '';

  return {
    language: session?.language || 'en',
    openingSentence: openingSentence || undefined,
    openingContext: deriveReentrySummary(session, nearbyPhrases, openingSentence),
    nearbyPhrases
  };
}

export function subscribeToLocalAccount(listener) {
  accountListeners.add(listener);
  return () => accountListeners.delete(listener);
}

export async function replaceLocalAccount(account, options = {}) {
  const nextAccount = normalizeAccount(account);
  if (!nextAccount) {
    return loadOrCreateLocalAccount();
  }

  nextAccount.updatedAt = options.keepUpdatedAt ? nextAccount.updatedAt : nowIso();

  return writeStoredAccount(nextAccount, {
    metadata: {
      source: options.source || 'local-replace'
    }
  });
}

export async function attachLocalAccountToCloud(cloud) {
  return updateLocalAccount(
    (account) => ({
      ...account,
      kind: cloud?.userId ? 'cloud-linked' : 'local',
      cloud: normalizeCloudAccount({
        ...account.cloud,
        ...cloud,
        attachedAt: account.cloud?.attachedAt || nowIso()
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

export function getCloudContinuityPayload(account) {
  return buildCloudContinuityPayload(account);
}

export function buildLocalAccountFromCloud(payload, cloud) {
  return buildAccountFromCloudPayload(payload, normalizeCloudAccount(cloud));
}

export function buildContinuityPreview(account, options = {}) {
  const maxPhrases = options.maxPhrases || 6;
  const maxMovements = options.maxMovements || 4;
  const exposureTraces = Array.isArray(account?.continuity?.exposureTraces)
    ? account.continuity.exposureTraces
    : [];
  const movementTraces = Array.isArray(account?.continuity?.movementTraces)
    ? account.continuity.movementTraces
    : [];

  const recentNearby = [];
  const seenPhraseKeys = new Set();

  for (let index = exposureTraces.length - 1; index >= 0; index -= 1) {
    const trace = exposureTraces[index];
    const text = typeof trace?.text === 'string' ? trace.text.trim() : '';
    const normalized = trace?.normalizedText || normalizeTraceText(text);

    if (trace?.sourceEnvironment === 'room') {
      continue;
    }

    if (!text || !normalized || seenPhraseKeys.has(normalized) || !isMeaningfulTraceText(text)) {
      continue;
    }

    seenPhraseKeys.add(normalized);
    recentNearby.push({
      id: trace.id,
      text,
      normalizedText: normalized,
      sourceEnvironment: trace.sourceEnvironment,
      interactionType: trace.interactionType,
      updatedAt: trace.updatedAt || trace.createdAt || null
    });

    if (recentNearby.length >= maxPhrases) break;
  }

  const movementByPair = new Map();
  for (let index = movementTraces.length - 1; index >= 0; index -= 1) {
    const trace = movementTraces[index];
    const fromText = typeof trace?.fromText === 'string' ? trace.fromText.trim() : '';
    const toText = typeof trace?.toText === 'string' ? trace.toText.trim() : '';
    const normalizedFrom = normalizeTraceText(fromText);
    const normalizedTo = normalizeTraceText(toText);

    if (!fromText || !toText || !normalizedFrom || !normalizedTo) continue;
    if (normalizedFrom === normalizedTo) continue;

    const pairKey = `${normalizedFrom}->${normalizedTo}`;
    const nextPriority = getMovementPriority(trace.interactionType);
    const existing = movementByPair.get(pairKey);

    if (!existing) {
      movementByPair.set(pairKey, {
        id: trace.id,
        fromText,
        toText,
        interactionType: trace.interactionType,
        sourceEnvironment: trace.sourceEnvironment,
        pressureLabel: trace.pressureLabel || null,
        updatedAt: trace.updatedAt || trace.createdAt || null,
        priority: nextPriority
      });
      continue;
    }

    if (nextPriority > existing.priority) {
      movementByPair.set(pairKey, {
        ...existing,
        id: trace.id,
        fromText,
        toText,
        interactionType: trace.interactionType,
        sourceEnvironment: trace.sourceEnvironment,
        pressureLabel: trace.pressureLabel || null,
        updatedAt: trace.updatedAt || trace.createdAt || null,
        priority: nextPriority
      });
    }
  }

  const recentMovement = Array.from(movementByPair.values())
    .filter((trace) => trace.priority > 0)
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return bTime - aTime;
    })
    .slice(0, maxMovements)
    .map(({ priority, ...trace }) => trace);

  return {
    recentNearby,
    recentMovement,
    nearbyPhraseCount: recentNearby.length,
    movementCount: recentMovement.length,
    hasContinuity: recentNearby.length > 0 || recentMovement.length > 0
  };
}

export async function getRecurringPracticeLoopPhraseTexts(language, options = {}) {
  const account = await getLocalAccount();
  const max = options.max || 6;

  return collectTraceTexts(account?.continuity?.exposureTraces || [], {
    max,
    sourceEnvironment: 'practice-loop',
    language
  });
}

export async function getRecurringPlaygroundSeedTexts(language, options = {}) {
  const account = await getLocalAccount();
  const max = options.max || 6;
  const seen = new Set();
  const recurring = [];
  const movementTraces = Array.isArray(account?.continuity?.movementTraces)
    ? account.continuity.movementTraces
    : [];

  for (let index = movementTraces.length - 1; index >= 0; index -= 1) {
    const trace = movementTraces[index];
    if (trace?.sourceEnvironment !== 'pattern-playground') continue;
    if (!['carried', 'transformed', 'stabilized'].includes(trace?.interactionType)) continue;
    if (language && trace?.language && trace.language !== language) continue;

    const text = cleanSessionText(trace?.toText || trace?.fromText);
    const normalized = normalizeTraceText(text);
    if (!text || !normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    recurring.push(trimPreviewText(text, 72));
    if (recurring.length >= max) break;
  }

  return recurring;
}

export async function recordExposureTrace({
  sourceEnvironment,
  text,
  normalizedText = null,
  interactionType = 'encountered',
  language = null,
  structureFamily = null,
  functionHint = null,
  patternHint = null,
  movementHint = null,
  counts = null,
  density = null
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
            language,
            interactionType,
            structureFamily,
            functionHint,
            patternHint,
            movementHint,
            counts,
            density,
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
  interactionType = 'nearby-path',
  language = null,
  structureFamily = null,
  functionHint = null,
  patternHint = null,
  movementHint = null,
  counts = null,
  density = null
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
            language,
            interactionType,
            structureFamily,
            functionHint,
            patternHint,
            movementHint,
            counts,
            density,
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
      exportTimestamp: Date.now(),
      privacyBoundary: {
        roomConversationsStoredLocally: true,
        roomConversationsUploadedToCloud: false,
        exportIncludesLocalConversationData: true
      }
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
