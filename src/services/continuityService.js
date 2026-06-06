import { generateStorageId, getStorageNowIso } from './storage';
import { getLocalAccount, normalizeAccount, updateLocalAccount } from './accountService';

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

function normalizeTraceText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function cleanText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function trimPreviewText(text, maxLength = 84) {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
}

function limitTraces(items, max) {
  return items.slice(-max);
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

function getTraceTimestamp(trace) {
  const timestamp = trace?.updatedAt || trace?.createdAt;
  const value = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
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
  return sanitizeCloudValue({
    sourceEnvironment: 'room',
    traceKind: 'derived',
    language: trace?.language || null,
    interactionType: trace?.interactionType || 'encountered',
    structureFamily: trace?.structureFamily || null,
    functionHint: trace?.functionHint || null,
    patternHint: trace?.patternHint || null,
    movementHint: trace?.movementHint || null,
    createdAt: trace?.createdAt || null,
    updatedAt: trace?.updatedAt || null,
    counts: trace?.counts || null,
    density: trace?.density || null
  });
}

function deriveRoomMovementTraceForCloud(trace) {
  return sanitizeCloudValue({
    sourceEnvironment: 'room',
    traceKind: 'derived',
    language: trace?.language || null,
    interactionType: trace?.interactionType || 'nearby-path',
    structureFamily: trace?.structureFamily || null,
    functionHint: trace?.functionHint || null,
    patternHint: trace?.patternHint || null,
    movementHint: trace?.movementHint || null,
    createdAt: trace?.createdAt || null,
    updatedAt: trace?.updatedAt || null,
    counts: trace?.counts || null,
    density: trace?.density || null
  });
}

function buildCloudExposureTrace(trace) {
  if (!trace || typeof trace !== 'object') return null;
  if (trace.sourceEnvironment === 'room') return deriveRoomExposureTraceForCloud(trace);
  return sanitizeCloudValue(trace);
}

function buildCloudMovementTrace(trace) {
  if (!trace || typeof trace !== 'object') return null;
  if (trace.sourceEnvironment === 'room') return deriveRoomMovementTraceForCloud(trace);
  return sanitizeCloudValue(trace);
}

function buildExposureDedupKey(trace) {
  if (trace?.sourceEnvironment === 'room') {
    return [
      trace.sourceEnvironment,
      trace.interactionType,
      trace.language || '',
      trace.structureFamily || '',
      trace.functionHint || '',
      trace.patternHint || '',
      trace.movementHint || ''
    ].join('|');
  }

  const normalizedText = trace?.normalizedText || normalizeTraceText(trace?.text);
  return [trace?.sourceEnvironment || '', normalizedText, trace?.interactionType || 'encountered'].join('|');
}

function buildMovementDedupKey(trace) {
  if (trace?.sourceEnvironment === 'room') {
    return [
      trace.sourceEnvironment,
      trace.interactionType,
      trace.language || '',
      trace.structureFamily || '',
      trace.functionHint || '',
      trace.patternHint || '',
      trace.movementHint || ''
    ].join('|');
  }

  const normalizedFrom = normalizeTraceText(trace?.fromText);
  const normalizedTo = normalizeTraceText(trace?.toText);
  return [
    trace?.sourceEnvironment || '',
    `${normalizedFrom}->${normalizedTo}`,
    trace?.interactionType || 'nearby-path'
  ].join('|');
}

function dedupeCloudTraces(traces, buildKey) {
  const deduped = new Map();

  traces.forEach((trace) => {
    const key = buildKey(trace);
    const existing = deduped.get(key);

    if (!existing || getTraceTimestamp(trace) >= getTraceTimestamp(existing)) {
      deduped.set(key, trace);
    }
  });

  return Array.from(deduped.values()).sort((a, b) => getTraceTimestamp(a) - getTraceTimestamp(b));
}

function prepareExposureTracesForCloud(traces) {
  if (!Array.isArray(traces)) return [];

  const prepared = traces
    .map(buildCloudExposureTrace)
    .filter(Boolean);

  return dedupeCloudTraces(prepared, buildExposureDedupKey).slice(-MAX_CLOUD_EXPOSURE_TRACES);
}

function prepareMovementTracesForCloud(traces) {
  if (!Array.isArray(traces)) return [];

  const prepared = traces
    .map(buildCloudMovementTrace)
    .filter(Boolean);

  return dedupeCloudTraces(prepared, buildMovementDedupKey).slice(-MAX_CLOUD_MOVEMENT_TRACES);
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

    const text = cleanText(trace?.text);
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

export function getCloudContinuityPayload(account) {
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
    const text = cleanText(trace?.text);
    const normalized = trace?.normalizedText || normalizeTraceText(text);

    if (trace?.sourceEnvironment === 'room') continue;
    if (!text || !normalized || seenPhraseKeys.has(normalized) || !isMeaningfulTraceText(text)) continue;

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
    const fromText = cleanText(trace?.fromText);
    const toText = cleanText(trace?.toText);
    const normalizedFrom = normalizeTraceText(fromText);
    const normalizedTo = normalizeTraceText(toText);

    if (!fromText || !toText || !normalizedFrom || !normalizedTo) continue;
    if (normalizedFrom === normalizedTo) continue;

    const pairKey = `${normalizedFrom}->${normalizedTo}`;
    const nextPriority = getMovementPriority(trace?.interactionType);
    const existing = movementByPair.get(pairKey);

    if (!existing || nextPriority > existing.priority) {
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
  return collectTraceTexts(account?.continuity?.exposureTraces || [], {
    max: options.max || 6,
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

    const text = cleanText(trace?.toText || trace?.fromText);
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

  const timestamp = getStorageNowIso();

  return updateLocalAccount((account) => ({
    ...account,
    continuity: {
      ...account.continuity,
      exposureTraces: limitTraces(
        [
          ...account.continuity.exposureTraces,
          {
            id: generateStorageId('exposure'),
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

  const timestamp = getStorageNowIso();

  return updateLocalAccount((account) => ({
    ...account,
    continuity: {
      ...account.continuity,
      movementTraces: limitTraces(
        [
          ...account.continuity.movementTraces,
          {
            id: generateStorageId('movement'),
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
