import React, { useEffect, useState } from 'react';
import { getUserPreferences, saveUserPreferences } from '../services/storage';
import SubPageLayout from './SubPageLayout';
import '../styles/SettingsPage.css';

function SettingsPage() {
  const [preferences, setPreferences] = useState(null);
  const [voice, setVoice] = useState('calm');
  const [spacing, setSpacing] = useState('balanced');
  const [softHaptics, setSoftHaptics] = useState(false);

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
    <SubPageLayout
      title="Settings"
      headline="Tune the room"
      subtitle="Adjust language and atmosphere. Keep only what helps you stay in conversation."
    >
      <section className="settings-stack">
        <article className="settings-row navo-card navo-hairline-top">
          <div>
            <p className="settings-row-title">Active language</p>
            <p className="settings-row-sub">Used by Practice Loop and Room.</p>
          </div>
          <div className="settings-choice-group">
            <button
              className={`settings-choice ${preferences.activeLanguage === 'en' ? 'active' : ''}`}
              onClick={() => updatePreference('activeLanguage', 'en')}
            >
              English
            </button>
            <button
              className={`settings-choice ${preferences.activeLanguage === 'pt' ? 'active' : ''}`}
              onClick={() => updatePreference('activeLanguage', 'pt')}
            >
              Portuguese
            </button>
          </div>
        </article>

        <article className="settings-row navo-card navo-hairline-top">
          <div>
            <p className="settings-row-title">Theme</p>
            <p className="settings-row-sub">Light or dark atmosphere.</p>
          </div>
          <div className="settings-choice-group">
            <button
              className={`settings-choice ${preferences.theme === 'dark' ? 'active' : ''}`}
              onClick={() => updatePreference('theme', 'dark')}
            >
              Dark
            </button>
            <button
              className={`settings-choice ${preferences.theme === 'light' ? 'active' : ''}`}
              onClick={() => updatePreference('theme', 'light')}
            >
              Light
            </button>
          </div>
        </article>

        <article className="settings-row navo-card navo-hairline-top">
          <div>
            <p className="settings-row-title">Show heard speech</p>
            <p className="settings-row-sub">Keep your recognized line visible after speaking.</p>
          </div>
          <button
            className={`settings-toggle ${preferences.showHeardSpeech ? 'on' : ''}`}
            onClick={() => updatePreference('showHeardSpeech', !preferences.showHeardSpeech)}
            aria-pressed={preferences.showHeardSpeech}
          >
            <span className="settings-toggle-knob" />
          </button>
        </article>

        <article className="settings-row navo-card navo-hairline-top">
          <div>
            <p className="settings-row-title">Voice feel</p>
            <p className="settings-row-sub">Frontend placeholder. No backend voice switching yet.</p>
          </div>
          <div className="settings-choice-group">
            <button className={`settings-choice ${voice === 'calm' ? 'active' : ''}`} onClick={() => setVoice('calm')}>
              Calm
            </button>
            <button className={`settings-choice ${voice === 'warm' ? 'active' : ''}`} onClick={() => setVoice('warm')}>
              Warm
            </button>
            <button className={`settings-choice ${voice === 'bright' ? 'active' : ''}`} onClick={() => setVoice('bright')}>
              Bright
            </button>
          </div>
        </article>

        <article className="settings-row navo-card navo-hairline-top">
          <div>
            <p className="settings-row-title">Phrase spacing</p>
            <p className="settings-row-sub">Frontend placeholder for pacing presets.</p>
          </div>
          <div className="settings-choice-group">
            <button className={`settings-choice ${spacing === 'close' ? 'active' : ''}`} onClick={() => setSpacing('close')}>
              Closer
            </button>
            <button className={`settings-choice ${spacing === 'balanced' ? 'active' : ''}`} onClick={() => setSpacing('balanced')}>
              Balanced
            </button>
            <button className={`settings-choice ${spacing === 'slow' ? 'active' : ''}`} onClick={() => setSpacing('slow')}>
              Slower
            </button>
          </div>
        </article>

        <article className="settings-row navo-card navo-hairline-top">
          <div>
            <p className="settings-row-title">Soft haptics</p>
            <p className="settings-row-sub">Frontend placeholder for tactile feedback.</p>
          </div>
          <button
            className={`settings-toggle ${softHaptics ? 'on' : ''}`}
            onClick={() => setSoftHaptics(value => !value)}
            aria-pressed={softHaptics}
          >
            <span className="settings-toggle-knob" />
          </button>
        </article>
      </section>

      <p className="settings-footnote">Preview build: atmosphere controls are local-only.</p>
    </SubPageLayout>
  );
}

export default SettingsPage;
