import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

function SystemNotice({ message, onRetry, onDismiss, persistent = false }) {
  useEffect(() => {
    if (!persistent && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [persistent, onDismiss]);

  return (
    <div className="system-notice">
      <span className="notice-message">{message}</span>
      <div className="notice-actions">
        {onRetry && (
          <button className="notice-retry" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="notice-dismiss" onClick={onDismiss}>
            <FaTimes />
          </button>
        )}
      </div>
      
      <style jsx>{`
        .system-notice {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 193, 7, 0.95);
          color: #000;
          padding: 12px 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideDown 0.3s ease;
          max-width: 90%;
        }
        
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .notice-message {
          font-size: 0.95rem;
          font-weight: 500;
          flex: 1;
        }
        
        .notice-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .notice-retry {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .notice-retry:hover {
          background: rgba(0, 0, 0, 0.9);
        }
        
        .notice-dismiss {
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.7);
          font-size: 1rem;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        
        .notice-dismiss:hover {
          color: rgba(0, 0, 0, 0.9);
        }
      `}</style>
    </div>
  );
}

export default SystemNotice;
