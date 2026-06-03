import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportSessionsAsJSON, deleteAllSessions, deleteAllData, getLocalAccount, getAllSessions } from '../services/storage';
import ConfirmationDialog from './ConfirmationDialog';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/AccountPage.css';

const LANGUAGE_META = {
  en: { name: 'English' },
  pt: { name: 'Portuguese' }
};

function formatTotalMinutes(totalDurationMs, fallbackTurns) {
  if (totalDurationMs > 0) return Math.max(1, Math.round(totalDurationMs / 60000));
  if (fallbackTurns > 0) return Math.max(1, Math.round(fallbackTurns * 0.6));
  return 0;
}

function AccountPage() {
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({
    sessionCount: 0,
    turns: 0,
    minutes: 0,
    recentExposure: [],
    recentMovement: [],
    languages: []
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({ action: null, title: '', body: '', confirmText: 'Confirm', isDangerous: false });

  const loadAccount = async () => {
    const localAccount = await getLocalAccount();
    const sessions = await getAllSessions();
    const ordered = [...sessions].sort((a, b) => b.startTimestamp - a.startTimestamp);

    const totalDuration = ordered.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalTurns = ordered.reduce((sum, session) => sum + (session.exchangeCount || session.exchanges?.length || 0), 0);
    const minutes = formatTotalMinutes(totalDuration, totalTurns);

    const languageSet = new Set(ordered.map((session) => session.language).filter(Boolean));
    if (localAccount.languageSettings.activeLanguage) languageSet.add(localAccount.languageSettings.activeLanguage);

    setAccount(localAccount);
    setStats({
      sessionCount: ordered.length,
      turns: totalTurns,
      minutes,
      recentExposure: [...(localAccount.continuity?.exposureTraces || [])].slice(-5).reverse(),
      recentMovement: [...(localAccount.continuity?.movementTraces || [])].slice(-5).reverse(),
      languages: Array.from(languageSet)
    });
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const clearError = () => setTimeout(() => setErrorMessage(''), 5000);

  const queueConfirm = (action, title, body, confirmText, isDangerous) => {
    setConfirmDialogConfig({ action, title, body, confirmText, isDangerous });
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
      } else {
        loadAccount();
      }
      return;
    }

    if (confirmDialogConfig.action === 'deleteData') {
      const result = await deleteAllData();
      if (!result.success) {
        setErrorMessage(result.error);
        clearError();
      } else {
        loadAccount();
      }
    }
  };

  if (!account) return null;

  const activeLanguage = account.languageSettings.activeLanguage || 'en';
  const knownLanguages = ['en', 'pt'];

  return (
    <>
      <div className="account-page navo-shell">
        <NavoNav compact />

        <main className="account-main navo-container navo-container--normal">
          <section className="account-profile-row">
            <div className="account-avatar">{(LANGUAGE_META[activeLanguage]?.name || 'N').slice(0, 1)}</div>
            <div>
              <p className="account-name">Local account</p>
              <p className="account-sub">{account.id} - this device only</p>
            </div>
          </section>

          <p className="account-eyebrow">Continuity</p>
          <section className="account-traces-grid">
            <article className="trace-card navo-card navo-hairline-top">
              <p className="trace-label">Exposure traces</p>
              <p className="trace-value">{account.continuity?.exposureTraces?.length || 0}</p>
              <p className="trace-note">Language you have lived around.</p>
            </article>
            <article className="trace-card navo-card navo-hairline-top">
              <p className="trace-label">Movement traces</p>
              <p className="trace-value">{account.continuity?.movementTraces?.length || 0}</p>
              <p className="trace-note">Language carried and shifted.</p>
            </article>
            <article className="trace-card navo-card navo-hairline-top">
              <p className="trace-label">Current language</p>
              <p className="trace-value">{LANGUAGE_META[activeLanguage]?.name || activeLanguage.toUpperCase()}</p>
              <p className="trace-note">Voice: {account.voiceSettings?.voiceFeel || 'calm'}</p>
            </article>
          </section>

          <section className="account-language-wrap">
            <h2>Environment</h2>
            <div className="language-list">
              {knownLanguages.map((langCode) => {
                const lang = LANGUAGE_META[langCode];
                const isActive = activeLanguage === langCode;
                const seenInSessions = stats.languages.includes(langCode);

                return (
                  <div key={langCode} className="language-row">
                    <div>
                      <p className="language-name">{lang.name}</p>
                      <p className="language-note">{isActive ? 'Active in your local account' : seenInSessions ? 'Seen in local continuity' : 'Available in this build'}</p>
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
              <p className="account-link-kicker">Continuity</p>
              <p className="account-link-title">Session traces</p>
              <p className="account-link-body">Re-enter rooms you have already been in.</p>
            </Link>
            <Link to="/settings" className="account-link-card navo-card navo-hairline-top">
              <p className="account-link-kicker">Environment</p>
              <p className="account-link-title">Settings</p>
              <p className="account-link-body">Language, voice, spacing, and room behavior.</p>
            </Link>
          </section>

          <section className="account-latest navo-card navo-hairline-top">
            <p className="account-latest-label">Recently nearby phrases</p>
            {stats.recentExposure.length > 0 ? (
              stats.recentExposure.map((trace) => (
                <p key={trace.id} className="account-latest-line">"{trace.text}"</p>
              ))
            ) : (
              <p className="account-latest-line">No nearby phrases yet.</p>
            )}
          </section>

          <section className="account-latest navo-card navo-hairline-top">
            <p className="account-latest-label">Recent movements</p>
            {stats.recentMovement.length > 0 ? (
              stats.recentMovement.map((trace) => (
                <p key={trace.id} className="account-latest-line">{trace.fromText} → {trace.toText}</p>
              ))
            ) : (
              <p className="account-latest-line">No movements yet.</p>
            )}
          </section>

          {errorMessage && <div className="settings-error">{errorMessage}</div>}

          <section className="account-data-panel navo-card navo-hairline-top">
            <h2>Local continuity</h2>
            <p>Your local account owns language settings, voice settings, immersion profile, and continuity traces.</p>
            <div className="data-controls">
              <button className="data-btn" onClick={() => queueConfirm('export', 'Export local account?', 'Your local account, continuity traces, and conversations will be downloaded as a JSON file.', 'Export', false)}>Export local account</button>
              <button className="data-btn" onClick={() => queueConfirm('deleteSessions', 'Delete all conversations?', 'This permanently removes all local conversations. This cannot be undone.', 'Delete', true)}>Delete all conversations</button>
              <button className="data-btn data-btn-danger" onClick={() => queueConfirm('deleteData', 'Delete local account data?', 'This removes your local account, continuity traces, conversations, and settings from this device. This cannot be undone.', 'Delete', true)}>Delete local account data</button>
            </div>
          </section>

          <p className="account-preview-note">Local account only - no cloud account connected.</p>
        </main>

        <NavoFooter />
      </div>

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
