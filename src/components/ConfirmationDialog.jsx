import React from 'react';
import { FaTimes } from 'react-icons/fa';

function ConfirmationDialog({ onConfirm, onCancel }) {
  return (
    <div className="confirmation-overlay">
      <div className="confirmation-dialog">
        <button className="dialog-close" onClick={onCancel}>
          <FaTimes />
        </button>
        <h2 className="dialog-title">Delete all data?</h2>
        <p className="dialog-body">
          This will permanently delete all conversations and settings stored on this device. This can't be undone.
        </p>
        <div className="dialog-actions">
          <button className="dialog-btn dialog-delete" onClick={onConfirm}>
            Delete
          </button>
          <button className="dialog-btn dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .confirmation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .confirmation-dialog {
          background: #2b2d31;
          border-radius: 12px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          position: relative;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .dialog-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #b0b0b0;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }
        
        .dialog-close:hover {
          color: #e0e0e0;
        }
        
        .dialog-title {
          margin: 0 0 16px 0;
          font-size: 22px;
          font-weight: 500;
          color: #e0e0e0;
        }
        
        .dialog-body {
          margin: 0 0 24px 0;
          font-size: 15px;
          line-height: 1.5;
          color: #b8bcc2;
        }
        
        .dialog-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .dialog-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dialog-delete {
          background: #d84040;
          color: white;
        }
        
        .dialog-delete:hover {
          background: #c23030;
        }
        
        .dialog-cancel {
          background: #404040;
          color: #e0e0e0;
        }
        
        .dialog-cancel:hover {
          background: #4a4a4a;
        }
      `}</style>
    </div>
  );
}

export default ConfirmationDialog;
