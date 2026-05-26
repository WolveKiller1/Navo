import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlay, FaTrash } from 'react-icons/fa';
import { getAllSessions, deleteSession } from '../services/storage';
import { speak } from '../services/tts';
import '../styles/SessionHistory.css';

function SessionHistoryContent() {
  const navigate = useNavigate();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await getAllSessions();
      const sorted = allSessions.sort((a, b) => b.startTimestamp - a.startTimestamp);
      setSessions(sorted);
    };

    loadSessions();
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
      setSessions(sessions.filter((session) => session.sessionId !== sessionId));
      setConfirmDeleteId(null);
      if (selectedSessionId === sessionId) setSelectedSessionId(null);
      return;
    }

    setErrorMessage(result.error);
    clearError();
    setConfirmDeleteId(null);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatMinutes = (duration) => {
    if (!duration || duration <= 0) return null;
    return Math.max(1, Math.round(duration / 60000));
  };

  const handlePlayReply = (replyText) => speak(replyText);

  const handleReenterRoom = (session, event) => {
    event.stopPropagation();
    const seedPhrase = session.exchanges?.[0]?.userUtterance || '';
    sessionStorage.setItem('rylingo_access', 'granted');
    navigate('/room', {
      state: {
        language: session.language || 'en',
        openingSentence: seedPhrase || undefined
      }
    });
  };

  if (selectedSessionId !== null) {
    const session = sessions.find((item) => item.sessionId === selectedSessionId);
    if (!session) return null;

    return (
      <div className="session-history-content">
        {errorMessage && <div className="history-error">{errorMessage}</div>}

        <div className="detail-header navo-card navo-hairline-top">
          <button className="detail-back-btn" onClick={() => setSelectedSessionId(null)}><FaArrowLeft /></button>
          <span className="detail-date">{formatDate(session.startTimestamp)}</span>
          <button className="detail-reenter-btn" onClick={(event) => handleReenterRoom(session, event)}>Re-enter room</button>
          {confirmDeleteId === session.sessionId ? (
            <div className="inline-confirm">
              <button className="confirm-delete-btn" onClick={(event) => handleConfirmDelete(event, session.sessionId)}>Delete</button>
              <button className="cancel-delete-btn" onClick={handleCancelDelete}>Cancel</button>
            </div>
          ) : (
            <button className="delete-btn" onClick={(event) => handleDeleteClick(event, session.sessionId)} title="Delete conversation"><FaTrash /></button>
          )}
        </div>

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

      {sessions.length === 0 ? (
        <div className="history-empty navo-card navo-hairline-top">
          <span className="navo-dot" />
          <p className="history-empty-title">No rooms yet.</p>
          <p className="history-empty-copy">When you step into the Room, the conversation will rest here, quietly.</p>
          <button className="detail-reenter-btn" onClick={(event) => handleReenterRoom({ language: 'en', exchanges: [] }, event)}>Open the Room</button>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((session, index) => (
            <div key={session.sessionId} className="history-item navo-card navo-hairline-top navo-reveal" style={{ animationDelay: `${index * 60}ms` }} onClick={() => setSelectedSessionId(session.sessionId)}>
              <div className="history-copy">
                <p className="history-preview">"{session.exchanges?.[0]?.userUtterance || 'Conversation'}"</p>
                <p className="session-date">
                  {formatDate(session.startTimestamp)}
                  {session.language ? ` · ${session.language.toUpperCase()}` : ''}
                  {formatMinutes(session.duration) ? ` · ${formatMinutes(session.duration)} min` : ''}
                  {session.exchangeCount ? ` · ${session.exchangeCount} turns` : ''}
                </p>
              </div>

              <button className="reenter-btn" onClick={(event) => handleReenterRoom(session, event)}>Re-enter</button>

              {confirmDeleteId === session.sessionId ? (
                <div className="inline-confirm">
                  <button className="confirm-delete-btn" onClick={(event) => handleConfirmDelete(event, session.sessionId)}>Delete</button>
                  <button className="cancel-delete-btn" onClick={handleCancelDelete}>Cancel</button>
                </div>
              ) : (
                <button className="delete-btn" onClick={(event) => handleDeleteClick(event, session.sessionId)} title="Delete conversation"><FaTrash /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SessionHistoryContent;
