import React, { useState, useEffect } from 'react';
import { exportSessionsAsJSON, deleteAllSessions, deleteAllData, getUserPreferences, saveUserPreferences } from '../services/storage';
import ConfirmationDialog from './ConfirmationDialog';
import SubPageLayout from './SubPageLayout';
import '../styles/AccountPage.css';

function AccountPage() {
  const [currentSection, setCurrentSection] = useState('general');
  const [preferences, setPreferences] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({
    action: null,
    title: '',
    body: '',
    confirmText: 'Confirm'
  });

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getUserPreferences();
      setPreferences(prefs);
      applyTheme(prefs.theme);
    };
    loadPreferences();
  }, []);

  const clearError = () => {
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const applyTheme = (theme) => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  };

  const updatePreference = async (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    await saveUserPreferences(updated);

    if (key === 'theme') {
      applyTheme(value);
    }
  };

  const handleExport = async () => {
    setConfirmDialogConfig({
      action: 'export',
      title: 'Export conversations?',
      body: 'Your conversations will be downloaded as a JSON file.',
      confirmText: 'Export',
      isDangerous: false
    });
    setShowConfirmDialog(true);
  };

  const handleDeleteAllSessions = async () => {
    setConfirmDialogConfig({
      action: 'deleteSessions',
      title: 'Delete all conversations?',
      body: 'This permanently removes all local conversations. This cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true
    });
    setShowConfirmDialog(true);
  };

  const handleDeleteAllData = () => {
    setConfirmDialogConfig({
      action: 'deleteData',
      title: 'Delete all data?',
      body: 'This removes all local conversations and settings. This cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmDialog(false);
    setErrorMessage('');

    if (confirmDialogConfig.action === 'export') {
      const result = await exportSessionsAsJSON();
      if (!result.success) {
        setErrorMessage(result.error);
        clearError();
      }
    } else if (confirmDialogConfig.action === 'deleteSessions') {
      const result = await deleteAllSessions();
      if (!result.success) {
        setErrorMessage(result.error);
        clearError();
      }
    } else if (confirmDialogConfig.action === 'deleteData') {
      const result = await deleteAllData();
      if (!result.success) {
        setErrorMessage(result.error);
        clearError();
      }
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };

  if (!preferences) {
    return null;
  }

  return (
    <>
      <SubPageLayout
        title="Account"
        subtitle="Profile and local-device controls for this preview build."
      >
        <section className="account-hero navo-card navo-hairline-top">
          <div className="account-avatar">N</div>
          <div className="account-meta">
            <p className="account-name">Navo Preview User</p>
            <p className="account-sub">Local profile · no cloud account connected</p>
          </div>
        </section>

        <div className="account-tabs">
          <button
            className={`tab-btn ${currentSection === 'general' ? 'active' : ''}`}
            onClick={() => setCurrentSection('general')}
          >
            General
          </button>
          <button
            className={`tab-btn ${currentSection === 'data' ? 'active' : ''}`}
            onClick={() => setCurrentSection('data')}
          >
            Data
          </button>
        </div>

        {errorMessage && (
          <div className="settings-error">{errorMessage}</div>
        )}

        {currentSection === 'general' && (
          <section className="settings-panel navo-card navo-hairline-top">
            <div className="setting-row">
              <label className="setting-label">Active language</label>
              <div className="setting-options">
                <button
                  className={`option-btn ${preferences.activeLanguage === 'en' ? 'active' : ''}`}
                  onClick={() => updatePreference('activeLanguage', 'en')}
                >
                  English
                </button>
                <button
                  className={`option-btn ${preferences.activeLanguage === 'pt' ? 'active' : ''}`}
                  onClick={() => updatePreference('activeLanguage', 'pt')}
                >
                  Portuguese
                </button>
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label">Theme</label>
              <div className="setting-options">
                <button
                  className={`option-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => updatePreference('theme', 'dark')}
                >
                  Dark
                </button>
                <button
                  className={`option-btn ${preferences.theme === 'light' ? 'active' : ''}`}
                  onClick={() => updatePreference('theme', 'light')}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label">Show heard speech</label>
              <div className="setting-toggle">
                <button
                  className={`toggle-btn ${preferences.showHeardSpeech ? 'on' : 'off'}`}
                  onClick={() => updatePreference('showHeardSpeech', !preferences.showHeardSpeech)}
                >
                  <span className="toggle-slider"></span>
                </button>
                <span className="toggle-label">{preferences.showHeardSpeech ? 'On' : 'Off'}</span>
              </div>
            </div>
          </section>
        )}

        {currentSection === 'data' && (
          <section className="settings-panel navo-card navo-hairline-top">
            <div className="data-controls">
              <button className="data-btn" onClick={handleExport}>
                Export conversations
              </button>
              <button className="data-btn" onClick={handleDeleteAllSessions}>
                Delete all conversations
              </button>
              <button className="data-btn data-btn-danger" onClick={handleDeleteAllData}>
                Delete all data
              </button>
            </div>
          </section>
        )}
      </SubPageLayout>

      {showConfirmDialog && (
        <ConfirmationDialog
          onConfirm={handleConfirmAction}
          onCancel={handleCancelDelete}
          title={confirmDialogConfig.title}
          body={confirmDialogConfig.body}
          confirmText={confirmDialogConfig.confirmText}
          isDangerous={confirmDialogConfig.isDangerous}
        />
      )}
    </>
  );
}

export default AccountPage;
