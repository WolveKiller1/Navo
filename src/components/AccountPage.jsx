import React, { useState } from 'react';
import SubPageLayout from './SubPageLayout';
import { exportSessionsAsJSON, deleteAllSessions, deleteAllData } from '../services/storage';
import ConfirmationDialog from './ConfirmationDialog';
import '../styles/AccountPage.css';

function AccountPage() {
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const clearError = () => {
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleExport = async () => {
    setErrorMessage('');
    const result = await exportSessionsAsJSON();
    if (!result.success) {
      setErrorMessage(result.error);
      clearError();
    }
  };

  const handleDeleteAllSessions = async () => {
    setErrorMessage('');
    const result = await deleteAllSessions();
    if (!result.success) {
      setErrorMessage(result.error);
      clearError();
    }
  };

  const handleDeleteAllData = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmDeleteAllData = async () => {
    setShowConfirmDialog(false);
    setErrorMessage('');
    const result = await deleteAllData();
    if (!result.success) {
      setErrorMessage(result.error);
      clearError();
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <SubPageLayout title="Account">
        {errorMessage && (
          <div className="account-error">{errorMessage}</div>
        )}
        
        <div className="account-section">
          <h2 className="account-section-title">Data Controls</h2>
          <button className="account-btn" onClick={handleExport}>
            Export conversations
          </button>
          <button className="account-btn" onClick={handleDeleteAllSessions}>
            Delete all conversations
          </button>
          <button className="account-btn account-btn-danger" onClick={handleDeleteAllData}>
            Delete all data
          </button>
        </div>
      </SubPageLayout>
      
      {showConfirmDialog && (
        <ConfirmationDialog 
          onConfirm={handleConfirmDeleteAllData}
          onCancel={handleCancelDelete}
        />
      )}
    </>
  );
}

export default AccountPage;
