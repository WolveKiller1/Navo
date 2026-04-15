import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportSessionsAsJSON, deleteAllSessions, deleteAllData, getUserPreferences, saveUserPreferences } from '../services/storage';
import ConfirmationDialog from './ConfirmationDialog';
import HomeArrow from './HomeArrow';
import '../styles/AccountPage.css';

function AccountPage() {
  const navigate = useNavigate();
  
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

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getUserPreferences();
      setPreferences(prefs);
      
      // Apply theme on load
      applyTheme(prefs.theme);
    };
    loadPreferences();
  }, []);

  const clearError = () => {
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // Apply theme to document
  const applyTheme = (theme) => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  };

  // Update preference and save
  const updatePreference = async (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    await saveUserPreferences(updated);
    
    // Apply theme immediately if changed
    if (key === 'theme') {
      applyTheme(value);
    }
  };

  // Data controls
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
      body: 'This will permanently delete all conversations stored on this device. This can\'t be undone.',
      confirmText: 'Delete',
      isDangerous: true
    });
    setShowConfirmDialog(true);
  };

  const handleDeleteAllData = () => {
    setConfirmDialogConfig({
      action: 'deleteData',
      title: 'Delete all data?',
      body: 'This will permanently delete all conversations and settings stored on this device. This can\'t be undone.',
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
    return null; // Loading
  }

  return (
    <>
      <div className="settings-page">
        <HomeArrow />
        
        <div className="settings-container">
          {/* Left Sidebar */}
          <div className="settings-sidebar">
            <h1 className="settings-title">Settings</h1>
            <nav className="settings-nav">
              <button
                className={`nav-item ${currentSection === 'general' ? 'active' : ''}`}
                onClick={() => setCurrentSection('general')}
              >
                General
              </button>
              <button
                className={`nav-item ${currentSection === 'data' ? 'active' : ''}`}
                onClick={() => setCurrentSection('data')}
              >
                Data
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="settings-content">
            {errorMessage && (
              <div className="settings-error">{errorMessage}</div>
            )}

            {/* General Section */}
            {currentSection === 'general' && (
              <div className="settings-section">
                <h2 className="section-title">General</h2>

                {/* Active Language */}
                <div className="setting-group">
                  <label className="setting-label">Active Language</label>
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

                {/* Theme */}
                <div className="setting-group">
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

                {/* Show Heard Speech */}
                <div className="setting-group">
                  <label className="setting-label">Show Heard Speech</label>
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
              </div>
            )}

            {/* Data Section */}
            {currentSection === 'data' && (
              <div className="settings-section">
                <h2 className="section-title">Data</h2>
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
              </div>
            )}
          </div>
        </div>
      </div>
      
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
