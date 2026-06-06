import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlay, FaTrash } from 'react-icons/fa';
import {
  buildSessionNearbyPhrases,
  buildSessionPreviewText,
  buildSessionReentryState,
  deleteSession,
  exportSessionsAsJSON,
  getMeaningfulSessions
} from '../services/sessionService';
import { speak } from '../services/tts';
import '../styles/SessionHistory.css';

function formatConversationDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatConversationMeta(session) {
  const parts = [formatConversationDate(session.startTimestamp)];

  if (session.language) {
    parts.push(session.language.toUpperCase());
  }

  if (session.exchangeCount) {
    parts.push(`${session.exchangeCount} turns`);
  }

  return parts.join(' - ');
}

function SessionHistoryContent() {
  const navigate = useNavigate();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadSessions = async () => {
      const meaningfulSessions = await getMeaningfulSessions();
      const sorted = meaningfulSessions.sort((a, b) => b.startTimestamp - a.startTimestamp);
      setSessions(sorted);
    };

    void loadSessions();
  }, []);

  const clearError = () => setTimeout(() => setErrorMessage(''), 5000);

  const handleDeleteClick = (event, sessionId) => {
    event.stopPropagation();
    setConfirmDeleteId(sessionId);
  };

  const handleCancelDelete = (event) => {
    event.stopPropagation();
    setConfirmDeleteId(null);
  };

  const handleConfirmDelete = async (event, sessionId) => {
    event.stopPropagation();
    setErrorMessage('');
    const result = await deleteSession(sessionId);

    if (result.success) {
      setSessions((current) => current.filter((session) => session.sessionId !== sessionId));
      setConfirmDeleteId(null);
      if (selectedSessionId === sessionId) setSelectedSessionId(null);
      return;
    }

    setErrorMessage(result.error);
    clearError();
    setConfirmDeleteId(null);
  };

  const handleExport = async () => {
    setErrorMessage('');
    const result = await exportSessionsAsJSON();

    if (!result.success) {
      setErrorMessage(result.error);
      clearError();
    }
  };

  const handlePlayReply = (replyText) => speak(replyText);

  const handleReenterRoom = (session, event) => {
    event.stopPropagation();
    const reentryState = buildSessionReentryState(session);
    sessionStorage.setItem('rylingo_access', 'granted');
    navigate('/room', { state: reentryState });
  };

  if (selectedSessionId !== null) {
    const session = sessions.find((item) => item.sessionId === selectedSessionId);
    if (!session) return null;

    const nearbyPhrases = buildSessionNearbyPhrases(session, { max: 3 });

    return (
      <div className="session-history-content">
        {errorMessage && <div className="history-error">{errorMessage}</div>}

        <div className="history-toolbar navo-card navo-hairline-top">
          <p className="history-toolbar-copy">Stored on this device. Re-enter starts a fresh room nearby, not a restored thread.</p>
          <button className="detail-reenter-btn history-secondary-btn" onClick={handleExport}>Export conversation data</button>
        </div>

        <div className="detail-header navo-card navo-hairline-top">
          <button className="detail-back-btn" onClick={() => setSelectedSessionId(null)}><FaArrowLeft /></button>
          <span className="detail-date">{formatConversationMeta(session)}</span>
          <button className="detail-reenter-btn" onClick={(event) => handleReenterRoom(session, event)}>Re-enter</button>
          {confirmDeleteId === session.sessionId ? (
            <div className="inline-confirm">
              <button className="confirm-delete-btn" onClick={(event) => handleConfirmDelete(event, session.sessionId)}>Delete</button>
              <button className="cancel-delete-btn" onClick={handleCancelDelete}>Cancel</button>
            </div>
          ) : (
            <button className="delete-btn" onClick={(event) => handleDeleteClick(event, session.sessionId)} title="Delete local conversation"><FaTrash /></button>
          )}
        </div>

        {nearbyPhrases.length > 0 && (
          <div className="conversation-phrases navo-card navo-hairline-top">
            <p className="conversation-phrases-label">Nearby phrases from this local room</p>
            <div className="conversation-chip-wrap">
              {nearbyPhrases.map((phrase) => (
                <span key={phrase} className="conversation-chip">"{phrase}"</span>
              ))}
            </div>
          </div>
        )}

        <div className="detail-transcript">
          {session.exchanges.map((exchange, index) => (
            <div key={index} className="transcript-exchange navo-card navo-hairline-top">
              <div className="transcript-user">
                <span className="transcript-label">You</span>
                <span className="transcript-text">{exchange.userUtterance}</span>
              </div>
              <div className="transcript-ai">
                <span className="transcript-label">Navo</span>
                <span className="transcript-text">{exchange.rylingoReply}</span>
                <button className="play-reply-btn" onClick={() => handlePlayReply(exchange.rylingoReply)} title="Play audio"><FaPlay /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="session-history-content">
      {errorMessage && <div className="history-error">{errorMessage}</div>}

      <div className="history-toolbar navo-card navo-hairline-top">
        <p className="history-toolbar-copy">Local rooms are stored on this device. Re-enter starts fresh nearby, and export keeps conversation data local to you.</p>
        <button className="detail-reenter-btn history-secondary-btn" onClick={handleExport}>Export conversation data</button>
      </div>

      {sessions.length === 0 ? (
        <div className="history-empty navo-card navo-hairline-top">
          <span className="navo-dot" />
          <p className="history-empty-title">No recent conversations yet.</p>
          <p className="history-empty-copy">Meaningful rooms will gather here once a conversation has actually started.</p>
          <button className="detail-reenter-btn" onClick={(event) => handleReenterRoom({ language: 'en', exchanges: [], exchangeCount: 0, startTimestamp: Date.now() }, event)}>Open the Room</button>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((session, index) => {
            const nearbyPhrases = buildSessionNearbyPhrases(session, { max: 3 });
            const previewText = buildSessionPreviewText(session);

            return (
              <div key={session.sessionId} className="history-item navo-card navo-hairline-top navo-reveal" style={{ animationDelay: `${index * 60}ms` }} onClick={() => setSelectedSessionId(session.sessionId)}>
                <div className="history-copy">
                  <p className="history-preview">"{previewText}"</p>
                  <p className="session-date">{formatConversationMeta(session)}</p>
                  {nearbyPhrases.length > 0 && (
                    <div className="conversation-chip-wrap history-chip-wrap">
                      {nearbyPhrases.map((phrase) => (
                        <span key={`${session.sessionId}-${phrase}`} className="conversation-chip history-chip">"{phrase}"</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="history-card-actions">
                  <button className="reenter-btn" onClick={(event) => handleReenterRoom(session, event)}>Re-enter</button>
                  {confirmDeleteId === session.sessionId ? (
                    <div className="inline-confirm">
                      <button className="confirm-delete-btn" onClick={(event) => handleConfirmDelete(event, session.sessionId)}>Delete</button>
                      <button className="cancel-delete-btn" onClick={handleCancelDelete}>Cancel</button>
                    </div>
                  ) : (
                    <button className="delete-btn" onClick={(event) => handleDeleteClick(event, session.sessionId)} title="Delete local conversation"><FaTrash /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SessionHistoryContent;
