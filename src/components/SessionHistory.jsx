import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowLeft, FaPlay, FaTrash } from 'react-icons/fa';
import { getAllSessions, deleteSession } from '../services/storage';
import { speak } from '../services/tts';

function SessionHistory({ onClose }) {
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
      // Remove from local state
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
      setConfirmDeleteId(null);
      
      // If we're viewing this session in detail, return to list
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
      <div className="history-overlay">
        {errorMessage && (
          <div className="history-error">{errorMessage}</div>
        )}
        <div className="detail-header">
          <button className="back-btn" onClick={() => setSelectedSessionId(null)}>
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
              <div className="transcript-rylingo">
                <span className="transcript-label">Rylingo:</span>
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
    <div className="history-overlay">
      <div className="history-header">
        <h2>Past Conversations</h2>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>
      
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
              <span className="session-date">{formatDate(session.startTimestamp)}</span>
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
      
      <style jsx>{`
        .history-error {
          background: rgba(216, 64, 64, 0.2);
          border: 1px solid rgba(216, 64, 64, 0.4);
          color: #ff8888;
          padding: 12px 16px;
          border-radius: 6px;
          margin: 0 20px 16px 20px;
          font-size: 14px;
        }
        
        .inline-confirm {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        
        .confirm-delete-btn,
        .cancel-delete-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .confirm-delete-btn {
          background: #d84040;
          color: white;
        }
        
        .confirm-delete-btn:hover {
          background: #c23030;
        }
        
        .cancel-delete-btn {
          background: #404040;
          color: #e0e0e0;
        }
        
        .cancel-delete-btn:hover {
          background: #4a4a4a;
        }
        
        .delete-btn {
          background: none;
          border: none;
          color: #b0b0b0;
          font-size: 16px;
          cursor: pointer;
          padding: 8px;
          margin-left: auto;
          transition: color 0.2s;
        }
        
        .delete-btn:hover {
          color: #ff8888;
        }
      `}</style>
    </div>
  );
}

export default SessionHistory;
