import React, { useEffect, useState } from 'react';
import { getUserPreferences, saveUserPreferences } from '../services/accountService';
import { useAccountSystem } from '../hooks/useAccountSystem';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/SettingsPage.css';

function SettingsPage() {
  const accountSystem = useAccountSystem();
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getUserPreferences();
      setPreferences(prefs);
      applyTheme(prefs.theme || 'dark');
    };

    loadPreferences();
  }, []);

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
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await saveUserPreferences(next);

    if (key === 'theme') {
      applyTheme(value);
    }
  };

  if (!preferences) {
    return null;
  }

  return (
    <div className="navo-shell">
      <NavoNav compact />

      <main className="settings-main navo-container navo-container--normal">
        <span className="navo-pill"><span className="navo-dot" /> Atmosphere</span>
        <h1 className="settings-headline">Tune the room.</h1>
        <p className="settings-intro">A few quiet things to adjust. Change them whenever the room feels off.</p>

        <section className="settings-stack">
          <article className="settings-row navo-card">
            <div>
              <p className="settings-row-title">Active language</p>
              <p className="settings-row-sub">Used by Practice Loop and Room.</p>
            </div>
            <div className="settings-choice-group">
              <button className={`settings-choice ${preferences.activeLanguage === 'en' ? 'active' : ''}`} onClick={() => updatePreference('activeLanguage', 'en')}>English</button>
              <button className={`settings-choice ${preferences.activeLanguage === 'pt' ? 'active' : ''}`} onClick={() => updatePreference('activeLanguage', 'pt')}>Portuguese</button>
            </div>
          </article>

          <article className="settings-row navo-card">
            <div>
              <p className="settings-row-title">Theme</p>
              <p className="settings-row-sub">Light in the room.</p>
            </div>
            <div className="settings-choice-group">
              <button className={`settings-choice ${preferences.theme === 'dark' ? 'active' : ''}`} onClick={() => updatePreference('theme', 'dark')}>Dark</button>
              <button className={`settings-choice ${preferences.theme === 'light' ? 'active' : ''}`} onClick={() => updatePreference('theme', 'light')}>Light</button>
            </div>
          </article>

          <article className="settings-row navo-card">
            <div>
              <p className="settings-row-title">Show heard speech</p>
              <p className="settings-row-sub">Keep recognized speech visible after speaking.</p>
            </div>
            <button className={`settings-toggle ${preferences.showHeardSpeech ? 'on' : ''}`} onClick={() => updatePreference('showHeardSpeech', !preferences.showHeardSpeech)} aria-pressed={preferences.showHeardSpeech}>
              <span className="settings-toggle-knob" />
            </button>
          </article>

          <article className="settings-row navo-card">
            <div>
              <p className="settings-row-title">Voice feel</p>
              <p className="settings-row-sub">
                {accountSystem.isAuthenticated
                  ? 'Stored in your local working copy and Navo Account for the Room.'
                  : 'Stored in your local account for the Room.'}
              </p>
            </div>
            <div className="settings-choice-group">
              <button className={`settings-choice ${preferences.voiceFeel === 'calm' ? 'active' : ''}`} onClick={() => updatePreference('voiceFeel', 'calm')}>Calm</button>
              <button className={`settings-choice ${preferences.voiceFeel === 'warm' ? 'active' : ''}`} onClick={() => updatePreference('voiceFeel', 'warm')}>Warm</button>
              <button className={`settings-choice ${preferences.voiceFeel === 'bright' ? 'active' : ''}`} onClick={() => updatePreference('voiceFeel', 'bright')}>Bright</button>
            </div>
          </article>

          <article className="settings-row navo-card">
            <div>
              <p className="settings-row-title">Phrase spacing</p>
              <p className="settings-row-sub">How much air rests between phrases.</p>
            </div>
            <div className="settings-choice-group">
              <button className={`settings-choice ${preferences.phraseSpacing === 'close' ? 'active' : ''}`} onClick={() => updatePreference('phraseSpacing', 'close')}>Closer</button>
              <button className={`settings-choice ${preferences.phraseSpacing === 'balanced' ? 'active' : ''}`} onClick={() => updatePreference('phraseSpacing', 'balanced')}>Balanced</button>
              <button className={`settings-choice ${preferences.phraseSpacing === 'slow' ? 'active' : ''}`} onClick={() => updatePreference('phraseSpacing', 'slow')}>Slower</button>
            </div>
          </article>

          <article className="settings-row navo-card">
            <div>
              <p className="settings-row-title">Soft haptics</p>
              <p className="settings-row-sub">
                {accountSystem.isAuthenticated
                  ? 'Stored with your local immersion profile and cloud continuity.'
                  : 'Stored with your local immersion profile.'}
              </p>
            </div>
            <button className={`settings-toggle ${preferences.softHaptics ? 'on' : ''}`} onClick={() => updatePreference('softHaptics', !preferences.softHaptics)} aria-pressed={preferences.softHaptics}>
              <span className="settings-toggle-knob" />
            </button>
          </article>
        </section>

        <p className="settings-footnote">
          {accountSystem.isAuthenticated
            ? 'Saved into the local working copy on this device and mirrored to your Navo Account.'
            : 'Stored inside your local account on this device.'}
        </p>
      </main>

      <NavoFooter />
    </div>
  );
}

export default SettingsPage;
