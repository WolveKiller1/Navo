import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  exportSessionsAsJSON,
  deleteAllSessions,
  deleteAllData,
  getLocalAccount,
  getAllSessions,
  buildContinuityPreview
} from '../services/storage';
import ConfirmationDialog from './ConfirmationDialog';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/AccountPage.css';

const LANGUAGE_META = {
  en: { name: 'English' },
  pt: { name: 'Portuguese' }
};

function AccountPage() {
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({
    continuityPreview: null,
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
    const continuityPreview = buildContinuityPreview(localAccount);

    const languageSet = new Set(ordered.map((session) => session.language).filter(Boolean));
    if (localAccount.languageSettings.activeLanguage) {
      languageSet.add(localAccount.languageSettings.activeLanguage);
    }

    setAccount(localAccount);
    setStats({
      continuityPreview,
      recentExposure: continuityPreview.recentNearby,
      recentMovement: continuityPreview.recentMovement,
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
  const continuityPreview = stats.continuityPreview || buildContinuityPreview(account);
  const continuityNote = continuityPreview.hasContinuity
    ? 'Recent language and movement stay close without becoming a dashboard.'
    : 'Continuity will gather quietly as you move through phrases and rooms.';

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
          <section className="account-summary-grid">
            <article className="summary-card navo-card navo-hairline-top">
              <p className="summary-label">Language</p>
              <p className="summary-title">{LANGUAGE_META[activeLanguage]?.name || activeLanguage.toUpperCase()}</p>
              <p className="summary-note">Held as the active environment in this local account.</p>
            </article>
            <article className="summary-card navo-card navo-hairline-top">
              <p className="summary-label">Voice and pace</p>
              <p className="summary-title">{account.voiceSettings?.voiceFeel || 'calm'}</p>
              <p className="summary-note">Phrase spacing: {account.voiceSettings?.phraseSpacing || 'balanced'}.</p>
            </article>
            <article className="summary-card navo-card navo-hairline-top">
              <p className="summary-label">Local continuity</p>
              <p className="summary-title">{continuityPreview.hasContinuity ? 'Quietly present' : 'Still forming'}</p>
              <p className="summary-note">{continuityNote}</p>
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
                      <p className="language-note">
                        {isActive
                          ? 'Active in your local account'
                          : seenInSessions
                            ? 'Seen in local continuity'
                            : 'Available in this build'}
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

          <section className="continuity-panel navo-card navo-hairline-top">
            <div className="continuity-panel-head">
              <p className="account-latest-label">Recently nearby</p>
              <p className="continuity-panel-note">Unique phrases the language has left close at hand.</p>
            </div>
            {stats.recentExposure.length > 0 ? (
              <div className="nearby-chip-wrap">
                {stats.recentExposure.map((trace) => (
                  <span key={trace.id} className="nearby-chip">“{trace.text}”</span>
                ))}
              </div>
            ) : (
              <p className="account-empty-copy">No nearby phrases yet. They will collect here as the language starts to linger.</p>
            )}
          </section>

          <section className="continuity-panel navo-card navo-hairline-top">
            <div className="continuity-panel-head">
              <p className="account-latest-label">Recent movement</p>
              <p className="continuity-panel-note">Meaningful shifts that were carried, shaped, or settled.</p>
            </div>
            {stats.recentMovement.length > 0 ? (
              <div className="movement-list">
                {stats.recentMovement.map((trace) => (
                  <div key={trace.id} className="movement-row">
                    <p className="movement-line">
                      <span>{trace.fromText}</span>
                      <span className="movement-arrow">→</span>
                      <span>{trace.toText}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="account-empty-copy">No meaningful movement yet. Carried and reshaped phrases will settle here.</p>
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
