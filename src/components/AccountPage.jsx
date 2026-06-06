import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteLocalAccountData,
  getLocalAccount
} from '../services/accountService';
import { buildContinuityPreview } from '../services/continuityService';
import { deleteAllSessions, exportSessionsAsJSON } from '../services/sessionService';
import {
  saveCloudContinuityNow,
  signInWithEmail,
  signOutAccount,
  signUpWithEmail
} from '../services/accountSync';
import { useAccountSystem } from '../hooks/useAccountSystem';
import ConfirmationDialog from './ConfirmationDialog';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/AccountPage.css';

const LANGUAGE_META = {
  en: { name: 'English' },
  pt: { name: 'Portuguese' }
};

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Not saved yet';

  try {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return 'Not saved yet';
  }
}

function getCloudStatusCopy(accountSystem) {
  switch (accountSystem.saveStatus) {
    case 'syncing':
      return 'Loading your Navo Account environment...';
    case 'saving':
      return 'Saving core environment continuity to Supabase...';
    case 'saved':
      return accountSystem.lastSyncedAt
        ? `Core environment saved ${formatTimestamp(accountSystem.lastSyncedAt)}.`
        : 'Core environment saved to your Navo Account.';
    case 'error':
      return accountSystem.errorMessage || 'Cloud continuity is temporarily unavailable.';
    case 'signed-out':
      return 'This device keeps a local working copy until you sign in.';
    case 'local-only':
    default:
      return 'Supabase is not configured in this build. Local continuity still works on this device.';
  }
}

function AccountPage() {
  const accountSystem = useAccountSystem();
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({
    continuityPreview: null,
    recentExposure: [],
    recentMovement: []
  });
  const [localMessage, setLocalMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({
    action: null,
    title: '',
    body: '',
    confirmText: 'Confirm',
    isDangerous: false
  });
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loadAccount = async () => {
    const localAccount = await getLocalAccount();
    const continuityPreview = buildContinuityPreview(localAccount);

    setAccount(localAccount);
    setStats({
      continuityPreview,
      recentExposure: continuityPreview.recentNearby,
      recentMovement: continuityPreview.recentMovement
    });
  };

  useEffect(() => {
    void loadAccount();
  }, [
    accountSystem.isAuthenticated,
    accountSystem.email,
    accountSystem.lastSyncedAt,
    accountSystem.saveStatus
  ]);

  const clearLocalMessage = () => setTimeout(() => setLocalMessage(''), 5000);

  const queueConfirm = (action, title, body, confirmText, isDangerous) => {
    setConfirmDialogConfig({ action, title, body, confirmText, isDangerous });
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmDialog(false);
    setLocalMessage('');

    if (confirmDialogConfig.action === 'export') {
      const result = await exportSessionsAsJSON();
      if (!result.success) {
        setLocalMessage(result.error);
        clearLocalMessage();
      }
      return;
    }

    if (confirmDialogConfig.action === 'deleteSessions') {
      const result = await deleteAllSessions();
      if (!result.success) {
        setLocalMessage(result.error);
        clearLocalMessage();
      } else {
        await loadAccount();
      }
      return;
    }

    if (confirmDialogConfig.action === 'deleteData') {
      const result = await deleteLocalAccountData();
      if (!result.success) {
        setLocalMessage(result.error);
        clearLocalMessage();
      } else {
        await loadAccount();
      }
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      if (authMode === 'create') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      setPassword('');
    } catch {
      // Account service already exposes user-facing error state.
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAccount();
    } catch {
      // Account service already exposes user-facing error state.
    }
  };

  const handleSaveNow = async () => {
    try {
      await saveCloudContinuityNow();
    } catch {
      // Account service already exposes user-facing error state.
    }
  };

  if (!account) return null;

  const activeLanguage = account.languageSettings.activeLanguage || 'en';
  const continuityPreview = stats.continuityPreview || buildContinuityPreview(account);
  const continuityNote = continuityPreview.hasContinuity
    ? 'Recent language and movement stay close without becoming a dashboard.'
    : 'Continuity will gather quietly as you move through phrases and rooms.';
  const cloudStatusCopy = getCloudStatusCopy(accountSystem);
  const authMessage = accountSystem.errorMessage || accountSystem.notice;
  const accountLabel = accountSystem.isAuthenticated ? 'Navo Account' : 'Local account';
  const activeLanguageName = LANGUAGE_META[activeLanguage]?.name || activeLanguage.toUpperCase();
  const voiceFeel = account.voiceSettings?.voiceFeel || 'calm';
  const phraseSpacing = account.voiceSettings?.phraseSpacing || 'balanced';

  return (
    <>
      <div className="account-page navo-shell">
        <NavoNav compact />

        <main className="account-main navo-container navo-container--normal">
          <section className="account-profile-row">
            <div className="account-avatar">{(LANGUAGE_META[activeLanguage]?.name || 'N').slice(0, 1)}</div>
            <div>
              <p className="account-name">{accountLabel}</p>
              <p className="account-sub">
                {accountSystem.isAuthenticated
                  ? `${accountSystem.email} - local working copy + Supabase continuity`
                  : `${account.id} - this device only`}
              </p>
            </div>
          </section>

          <section className="account-state-strip">
            <article className="account-state-card navo-card navo-hairline-top">
              <p className="summary-label">Active environment</p>
              <p className="account-state-line">{activeLanguageName}</p>
              <p className="summary-note">
                {accountSystem.isAuthenticated
                  ? 'This device keeps the working copy and can attach its core environment to your Navo Account.'
                  : 'This device currently holds the full working copy.'}
              </p>
            </article>
            <article className="account-state-card navo-card navo-hairline-top">
              <p className="summary-label">Voice and pace</p>
              <p className="account-state-line">{voiceFeel}</p>
              <p className="summary-note">Phrase spacing: {phraseSpacing}. {continuityNote}</p>
            </article>
          </section>

          <section className="account-auth-panel navo-card navo-hairline-top">
            <div className="account-auth-copy">
              <p className="summary-label">Navo Account</p>
              <h2>{accountSystem.isAuthenticated ? 'Core environment attached' : 'Keep this environment across devices'}</h2>
              <p>
                {accountSystem.isAuthenticated
                  ? 'Core environment continuity can be saved to this Navo Account through settings, safe immersion profile fields, exposure traces, and movement traces.'
                  : 'Signed out is still fully local-first. This device keeps the working copy until you connect a Navo Account.'}
              </p>
              <p className="account-privacy-line">Room conversations stay on this device.</p>
              <p className="account-privacy-line">Conversation data can be exported locally whenever you want it.</p>
              <p className="account-cloud-status">{cloudStatusCopy}</p>
            </div>

            {accountSystem.isAuthenticated ? (
              <div className="account-auth-actions">
                <button className="data-btn" onClick={handleSaveNow} disabled={accountSystem.saveStatus === 'saving' || accountSystem.saveStatus === 'syncing'}>
                  Save environment now
                </button>
                <button className="data-btn" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="account-auth-form-wrap">
                <div className="auth-mode-toggle" role="tablist" aria-label="Account mode">
                  <button
                    className={`auth-mode-btn ${authMode === 'signin' ? 'active' : ''}`}
                    onClick={() => setAuthMode('signin')}
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    className={`auth-mode-btn ${authMode === 'create' ? 'active' : ''}`}
                    onClick={() => setAuthMode('create')}
                    type="button"
                  >
                    Create account
                  </button>
                </div>

                <form className="account-auth-form" onSubmit={handleAuthSubmit}>
                  <label className="account-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={!accountSystem.cloudConfigured || accountSystem.pendingAuth}
                    />
                  </label>
                  <label className="account-field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      disabled={!accountSystem.cloudConfigured || accountSystem.pendingAuth}
                    />
                  </label>
                  <button
                    className="account-auth-submit"
                    type="submit"
                    disabled={!accountSystem.cloudConfigured || accountSystem.pendingAuth || !email.trim() || !password.trim()}
                  >
                    {accountSystem.pendingAuth
                      ? 'Working...'
                      : authMode === 'create'
                        ? 'Create Navo Account'
                        : 'Sign in'}
                  </button>
                </form>
              </div>
            )}
          </section>

          {(localMessage || authMessage) && (
            <div className="settings-error">{localMessage || authMessage}</div>
          )}

          <section className="account-links-grid">
            <Link to="/sessions" className="account-link-card navo-card navo-hairline-top">
              <p className="account-link-kicker">Local rooms</p>
              <p className="account-link-title">Recent conversations</p>
              <p className="account-link-body">Re-enter a local room nearby and keep conversation export on this device.</p>
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
              <p className="continuity-panel-note">Practice Loop and Playground phrases stay visible here. Room influence stays abstract.</p>
            </div>
            {stats.recentExposure.length > 0 ? (
              <div className="nearby-chip-wrap">
                {stats.recentExposure.map((trace) => (
                  <span key={trace.id} className="nearby-chip">"{trace.text}"</span>
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
                      <span className="movement-arrow">-&gt;</span>
                      <span>{trace.toText}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="account-empty-copy">No meaningful movement yet. Carried and reshaped phrases will settle here.</p>
            )}
          </section>

          <section className="account-data-panel navo-card navo-hairline-top">
            <h2>Local continuity</h2>
            <p>
              Export and deletion here remain local to this device. Full Room transcripts and session exchange bodies
              are not saved to Supabase in Account System v1.
            </p>
            <div className="account-boundary-notes">
              <p>Sign out disconnects this Navo Account session. It does not delete your local rooms or this device copy.</p>
              <p>Delete local account data removes settings, continuity, and local rooms from this device.</p>
            </div>
            <div className="data-controls">
              <button
                className="data-btn"
                onClick={() =>
                  queueConfirm(
                    'export',
                    'Export conversation data?',
                    'Your local account, continuity traces, and local Room conversations will be downloaded as a JSON file.',
                    'Export',
                    false
                  )
                }
              >
                Export conversation data
              </button>
              <button
                className="data-btn"
                onClick={() =>
                  queueConfirm(
                    'deleteSessions',
                    'Delete all conversations?',
                    'This permanently removes all local conversations from this device. This cannot be undone.',
                    'Delete',
                    true
                  )
                }
              >
                Delete all conversations
              </button>
              <button
                className="data-btn data-btn-danger"
                onClick={() =>
                  queueConfirm(
                    'deleteData',
                    'Delete local account data?',
                    'This removes your local account, continuity traces, conversations, and settings from this device. This cannot be undone.',
                    'Delete',
                    true
                  )
                }
              >
                Delete this device copy
              </button>
            </div>
          </section>

          <p className="account-preview-note">
            {accountSystem.isAuthenticated
              ? 'Core environment continuity is saved to your Navo Account. Room conversations and verbatim Room traces remain local-only.'
              : 'Signed out remains local-first. Connect a Navo Account only if you want this environment to follow you.'}
          </p>
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
