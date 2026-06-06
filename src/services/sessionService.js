import { isReusableSentence } from './sentenceUtils';
import { getLocalAccount } from './accountService';
import {
  clearSessionRecords,
  createSessionRecord,
  deleteSessionRecord,
  generateStorageId,
  getAllSessionRecords,
  getStorageNowIso,
  updateSessionRecord
} from './storage';

function cleanSessionText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function trimPreviewText(text, maxLength = 84) {
  const cleaned = cleanSessionText(text);
  if (!cleaned) return '';
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
}

function normalizeSessionText(text) {
  return cleanSessionText(text).toLowerCase();
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
      const normalized = normalizeSessionText(cleaned);
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
    parts.push('Keep the exchange brief and natural. Do not mention memory, history, or summaries unless the learner does.');
  } else {
    parts.push('Do not mention memory, history, or summaries unless the learner does.');
  }

  return parts.join(' ');
}

export async function createSession(language = null) {
  const account = await getLocalAccount();
  const sessionId = generateStorageId('session');
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

  await createSessionRecord(session);
  return sessionId;
}

export async function addExchange(sessionId, userUtterance, rylingoReply) {
  if (!sessionId) return;

  const exchange = {
    userUtterance,
    rylingoReply,
    exchangeTimestamp: Date.now()
  };

  await updateSessionRecord(sessionId, (session) => ({
    ...session,
    exchanges: [...(session.exchanges || []), exchange]
  }));
}

export async function closeSession(sessionId) {
  if (!sessionId) return;

  const closedAt = Date.now();

  const updated = await updateSessionRecord(sessionId, (session) => ({
    ...session,
    endTimestamp: closedAt,
    duration: closedAt - session.startTimestamp,
    exchangeCount: Array.isArray(session.exchanges) ? session.exchanges.length : 0
  }));

  if (updated && updated.exchangeCount === 0) {
    await deleteSessionRecord(sessionId);
  }
}

export async function getAllSessions() {
  return getAllSessionRecords();
}

export function isMeaningfulSession(session) {
  if (!session || !Array.isArray(session.exchanges) || session.exchanges.length === 0) {
    return false;
  }

  return session.exchanges.some(isMeaningfulExchange);
}

export async function getMeaningfulSessions() {
  const sessions = await getAllSessionRecords();
  return sessions.filter(isMeaningfulSession);
}

export function buildSessionNearbyPhrases(session, options = {}) {
  const max = options.max || 3;
  return getSessionPreviewCandidates(session)
    .slice(0, max)
    .map((text) => trimPreviewText(text, 54));
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

export async function exportSessionsAsJSON() {
  try {
    const sessions = await getAllSessionRecords();
    const account = await getLocalAccount();

    if (
      (!sessions || sessions.length === 0) &&
      !account?.continuity?.exposureTraces?.length &&
      !account?.continuity?.movementTraces?.length
    ) {
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
  } catch {
    return { success: false, error: 'Export failed. Try again.' };
  }
}

export async function deleteSession(sessionId) {
  return deleteSessionRecord(sessionId);
}

export async function deleteAllSessions() {
  return clearSessionRecords();
}
