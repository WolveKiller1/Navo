import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPlay, FaTrash } from 'react-icons/fa';
import { getAllSessions, deleteSession } from '../services/storage';
import { speak } from '../services/tts';
import '../styles/SessionHistory.css';

function SessionHistoryContent() {
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

  const clearError = () => {
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    setConfirmDeleteId(sessionId);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const handleConfirmDelete = async (e, sessionId) => {
    e.stopPropagation();
    setErrorMessage('');
    
    const result = await deleteSession(sessionId);
    
    if (result.success) {
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
      setConfirmDeleteId(null);
      
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } else {
      setErrorMessage(result.error);
      clearError();
      setConfirmDeleteId(null);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatMinutes = (duration) => {
    if (!duration || duration <= 0) return null;
    return Math.max(1, Math.round(duration / 60000));
  };

  const handlePlayReply = (replyText) => {
    speak(replyText);
  };

  // Detail view
  if (selectedSessionId !== null) {
    const session = sessions.find(s => s.sessionId === selectedSessionId);
    
    if (!session) {
      return null;
    }

    return (
      <div className="session-history-content">
        {errorMessage && (
          <div className="history-error">{errorMessage}</div>
        )}
        <div className="detail-header">
          <button className="detail-back-btn" onClick={() => setSelectedSessionId(null)}>
            <FaArrowLeft />
          </button>
          <span className="detail-date">{formatDate(session.startTimestamp)}</span>
          {confirmDeleteId === session.sessionId ? (
            <div className="inline-confirm">
              <button 
                className="confirm-delete-btn" 
                onClick={(e) => handleConfirmDelete(e, session.sessionId)}
              >
                Delete
              </button>
              <button 
                className="cancel-delete-btn" 
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              className="delete-btn" 
              onClick={(e) => handleDeleteClick(e, session.sessionId)}
              title="Delete conversation"
            >
              <FaTrash />
            </button>
          )}
        </div>
        <div className="detail-transcript">
          {session.exchanges.map((exchange, index) => (
            <div key={index} className="transcript-exchange">
              <div className="transcript-user">
                <span className="transcript-label">You:</span>
                <span className="transcript-text">{exchange.userUtterance}</span>
              </div>
              <div className="transcript-ai">
                <span className="transcript-label">Navo:</span>
                <span className="transcript-text">{exchange.rylingoReply}</span>
                <button 
                  className="play-reply-btn" 
                  onClick={() => handlePlayReply(exchange.rylingoReply)}
                  title="Play audio"
                >
                  <FaPlay />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="session-history-content">
      {errorMessage && (
        <div className="history-error">{errorMessage}</div>
      )}
      
      {sessions.length === 0 ? (
        <div className="history-empty">
          <p>No conversations yet</p>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((session) => (
            <div 
              key={session.sessionId} 
              className="history-item"
              onClick={() => setSelectedSessionId(session.sessionId)}
            >
              <div className="history-copy">
                <p className="history-preview">
                  "{session.exchanges?.[0]?.userUtterance || 'Conversation'}"
                </p>
                <p className="session-date">
                  {formatDate(session.startTimestamp)}
                  {session.language ? ` · ${session.language.toUpperCase()}` : ''}
                  {formatMinutes(session.duration) ? ` · ${formatMinutes(session.duration)} min` : ''}
                  {session.exchangeCount ? ` · ${session.exchangeCount} turns` : ''}
                </p>
              </div>
              {confirmDeleteId === session.sessionId ? (
                <div className="inline-confirm">
                  <button 
                    className="confirm-delete-btn" 
                    onClick={(e) => handleConfirmDelete(e, session.sessionId)}
                  >
                    Delete
                  </button>
                  <button 
                    className="cancel-delete-btn" 
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  className="delete-btn" 
                  onClick={(e) => handleDeleteClick(e, session.sessionId)}
                  title="Delete conversation"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SessionHistoryContent;
