import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  exportSessionsAsJSON,
  deleteAllSessions,
  deleteAllData,
  getUserPreferences,
  getAllSessions
} from '../services/storage';
import ConfirmationDialog from './ConfirmationDialog';
import SubPageLayout from './SubPageLayout';
import '../styles/AccountPage.css';

const LANGUAGE_META = {
  en: { name: 'English', note: 'Available in this build' },
  pt: { name: 'Portuguese', note: 'Available in this build' }
};

function formatTotalMinutes(totalDurationMs, fallbackTurns) {
  if (totalDurationMs > 0) {
    return Math.max(1, Math.round(totalDurationMs / 60000));
  }

  if (fallbackTurns > 0) {
    return Math.max(1, Math.round(fallbackTurns * 0.6));
  }

  return 0;
}

function AccountPage() {
  const [preferences, setPreferences] = useState(null);
  const [stats, setStats] = useState({
    sessionCount: 0,
    turns: 0,
    minutes: 0,
    latestLine: null,
    languages: []
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({
    action: null,
    title: '',
    body: '',
    confirmText: 'Confirm',
    isDangerous: false
  });

  useEffect(() => {
    const loadAccount = async () => {
      const prefs = await getUserPreferences();
      const sessions = await getAllSessions();
      const ordered = [...sessions].sort((a, b) => b.startTimestamp - a.startTimestamp);

      const totalDuration = ordered.reduce((sum, session) => sum + (session.duration || 0), 0);
      const totalTurns = ordered.reduce((sum, session) => sum + (session.exchangeCount || session.exchanges?.length || 0), 0);
      const minutes = formatTotalMinutes(totalDuration, totalTurns);

      const languageSet = new Set(
        ordered
          .map(session => session.language)
          .filter(Boolean)
      );

      if (prefs.activeLanguage) {
        languageSet.add(prefs.activeLanguage);
      }

      setPreferences(prefs);
      setStats({
        sessionCount: ordered.length,
        turns: totalTurns,
        minutes,
        latestLine: ordered[0]?.exchanges?.[0]?.userUtterance || null,
        languages: Array.from(languageSet)
      });
    };

    loadAccount();
  }, []);

  const clearError = () => {
    setTimeout(() => setErrorMessage(''), 5000);
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
      return;
    }

    if (confirmDialogConfig.action === 'deleteSessions') {
      const result = await deleteAllSessions();
      if (!result.success) {
        setErrorMessage(result.error);
        clearError();
      }
      return;
    }

    if (confirmDialogConfig.action === 'deleteData') {
      const result = await deleteAllData();
      if (!result.success) {
        setErrorMessage(result.error);
        clearError();
      }
    }
  };

  if (!preferences) {
    return null;
  }

  const activeLanguage = preferences.activeLanguage || 'en';
  const knownLanguages = ['en', 'pt'];

  return (
    <>
      <SubPageLayout
        title="Account"
        headline="Your quiet profile"
        subtitle="Local profile details and traces from your sessions in Navo."
      >
        <section className="account-hero navo-card navo-hairline-top">
          <div className="account-avatar">N</div>
          <div className="account-meta">
            <p className="account-name">Navo Preview User</p>
            <p className="account-sub">Local profile · no cloud account connected</p>
          </div>
        </section>

        <section className="account-traces">
          <article className="trace-card navo-card navo-hairline-top">
            <p className="trace-label">Time in the room</p>
            <p className="trace-value">{stats.minutes > 0 ? `${stats.minutes} min` : 'No time yet'}</p>
            <p className="trace-note">Across {stats.sessionCount} saved session{stats.sessionCount === 1 ? '' : 's'}.</p>
          </article>
          <article className="trace-card navo-card navo-hairline-top">
            <p className="trace-label">Conversation turns</p>
            <p className="trace-value">{stats.turns || 0}</p>
            <p className="trace-note">Observed exchanges, not a score.</p>
          </article>
          <article className="trace-card navo-card navo-hairline-top">
            <p className="trace-label">Current language</p>
            <p className="trace-value">{LANGUAGE_META[activeLanguage]?.name || activeLanguage.toUpperCase()}</p>
            <p className="trace-note">Active in your local preferences.</p>
          </article>
        </section>

        <section className="account-language-panel navo-card navo-hairline-top">
          <div className="account-language-header">
            <h2>Languages</h2>
            <p>Use Settings to switch your active language.</p>
          </div>
          <div className="language-list">
            {knownLanguages.map((langCode) => {
              const lang = LANGUAGE_META[langCode];
              const isActive = activeLanguage === langCode;
              const seenInSessions = stats.languages.includes(langCode);

              return (
                <div key={langCode} className="language-row">
                  <div>
                    <p className="language-name">{lang.name}</p>
                    <p className="language-note">
                      {isActive
                        ? 'Active now'
                        : seenInSessions
                          ? 'Seen in your traces'
                          : lang.note}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="language-active-pill"><span className="navo-dot" /> Active</span>
                  ) : (
                    <Link to="/settings" className="language-action-link">Set active</Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="account-links-grid">
          <Link to="/sessions" className="account-link-card navo-card navo-hairline-top">
            <p className="account-link-kicker">Archive</p>
            <p className="account-link-title">Past sessions</p>
            <p className="account-link-body">Re-enter rooms and revisit phrase traces.</p>
          </Link>
          <Link to="/settings" className="account-link-card navo-card navo-hairline-top">
            <p className="account-link-kicker">Atmosphere</p>
            <p className="account-link-title">Settings</p>
            <p className="account-link-body">Tune language, voice feel, and display behavior.</p>
          </Link>
        </section>

        {stats.latestLine && (
          <section className="account-latest navo-card navo-hairline-top">
            <p className="account-latest-label">Latest carried line</p>
            <p className="account-latest-line">"{stats.latestLine}"</p>
          </section>
        )}

        {errorMessage && <div className="settings-error">{errorMessage}</div>}

        <section className="account-data-panel navo-card navo-hairline-top">
          <h2>Local data</h2>
          <p>Data stays on this device unless you export it.</p>
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
      </SubPageLayout>

      {showConfirmDialog && (
        <ConfirmationDialog
          onConfirm={handleConfirmAction}
          onCancel={() => setShowConfirmDialog(false)}
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
