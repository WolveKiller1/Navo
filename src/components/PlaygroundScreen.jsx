import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaPause, FaPlay } from 'react-icons/fa';
import { initStorage, getImmersionProfile } from '../services/storage';
import { getDefaultProfile } from '../services/immersionProfile';
import { speak } from '../services/tts';
import { buildPlaygroundSequence } from '../services/playgroundSequenceBuilder';
import { generatePlaygroundSeed } from '../services/playgroundSeed';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/PlaygroundScreen.css';

function normalizeWord(word) {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
}

function getChangedWordIndexes(referenceText, candidateText) {
  if (!referenceText || !candidateText) return [];
  const referenceWords = referenceText.trim().split(/\s+/).filter(Boolean);
  const candidateWords = candidateText.trim().split(/\s+/).filter(Boolean);
  const referenceNorm = referenceWords.map(normalizeWord);
  const candidateNorm = candidateWords.map(normalizeWord);
  const n = referenceNorm.length;
  const m = candidateNorm.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      if (referenceNorm[i] && candidateNorm[j] && referenceNorm[i] === candidateNorm[j]) dp[i + 1][j + 1] = dp[i][j] + 1;
      else dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j]);
    }
  }

  const matchedCandidate = new Set();
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (referenceNorm[i - 1] === candidateNorm[j - 1]) {
      matchedCandidate.add(j - 1);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
    else j -= 1;
  }

  return candidateWords.map((_, index) => (matchedCandidate.has(index) ? null : index)).filter((index) => index !== null);
}

function compressMeaning(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim().replace(/[.!?]+$/, '').toLowerCase();
  text = text.replace(/\bout of nowhere\b/g, 'suddenly');
  text = text.replace(/\b(i|you|he|she|it|we|they|the|a|an|my|your|his|her|their|at|in|of)\b/gi, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text && text.length >= 2 ? text : null;
}

function getCompressedMeaning(phrase) {
  if (!phrase) return null;
  if (phrase.meaning) {
    const compressed = compressMeaning(phrase.meaning);
    if (compressed) return compressed;
  }
  return phrase.scene || null;
}

function toTtsLanguage(lang) {
  return lang === 'pt' ? 'pt-BR' : 'en-US';
}

function PlaygroundScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const [guidedSequence, setGuidedSequence] = useState([]);
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [isEntryMode, setIsEntryMode] = useState(false);
  const [entryPhrase, setEntryPhrase] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      await initStorage();
      const loadedProfile = await getImmersionProfile();
      if (!loadedProfile) getDefaultProfile();
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (location.state?.guidedMode && location.state?.seedSentence) {
      setGuidedSequence(buildPlaygroundSequence(location.state));
      setGuidedIndex(0);
      window.history.replaceState({}, document.title);
      return;
    }

    if (location.state?.entryMode) {
      const lang = location.state?.language || 'en';
      setEntryPhrase(generatePlaygroundSeed(null, lang));
      setIsEntryMode(true);
      window.history.replaceState({}, document.title);
      return;
    }

    if (location.state?.returnSentence) {
      setGuidedSequence(buildPlaygroundSequence({ guidedMode: true, seedSentence: location.state.returnSentence, language: location.state.language || 'en' }));
      setGuidedIndex(0);
      window.history.replaceState({}, document.title);
      return;
    }

    navigate('/');
  }, []);

  const handleBeginFromEntry = () => {
    if (!entryPhrase) return;
    setGuidedSequence(buildPlaygroundSequence({
      guidedMode: true,
      seedSentence: entryPhrase.text,
      seedMeaning: entryPhrase.meaning,
      icon: entryPhrase.icon,
      scene: entryPhrase.scene,
      patternId: entryPhrase.patternId,
      contextVariations: entryPhrase.contextVariations,
      language: entryPhrase.language || 'en'
    }));
    setGuidedIndex(0);
    setIsEntryMode(false);
  };

  const handleAnotherSeed = () => {
    const lang = entryPhrase?.language || 'en';
    setEntryPhrase(generatePlaygroundSeed(entryPhrase?.patternId || null, lang));
  };

  const handleAnotherShape = () => {
    if (!guidedSequence.length) return;
    const currentPhrase = guidedSequence[guidedIndex];
    const lang = currentPhrase?.language || 'en';
    const seed = generatePlaygroundSeed(currentPhrase?.patternId || null, lang);
    setGuidedSequence(buildPlaygroundSequence({
      guidedMode: true,
      seedSentence: seed.text,
      seedMeaning: seed.meaning,
      icon: seed.icon,
      scene: seed.scene,
      patternId: seed.patternId,
      contextVariations: seed.contextVariations,
      language: lang
    }));
    setGuidedIndex(0);
  };

  const handleCarryToRoom = (phraseText) => {
    sessionStorage.setItem('rylingo_access', 'granted');
    navigate('/room', { state: { openingSentence: phraseText } });
  };

  const handlePlayPhrase = async (id, text, language) => {
    setPlayingAudioId(id);
    try {
      await speak(text, toTtsLanguage(language));
    } finally {
      setPlayingAudioId((current) => (current === id ? null : current));
    }
  };

  const getNearbyPathIndexes = () => {
    if (!guidedSequence.length) return [];
    const candidateIndexes = [guidedIndex - 1, guidedIndex + 1, guidedIndex - 2, guidedIndex + 2];
    const uniqueValid = [];
    candidateIndexes.forEach((index) => {
      if (index >= 0 && index < guidedSequence.length && index !== guidedIndex && !uniqueValid.includes(index)) uniqueValid.push(index);
    });
    return uniqueValid.slice(0, 3);
  };

  const currentPhrase = guidedSequence[guidedIndex];
  const previousPhrase = guidedIndex > 0 ? guidedSequence[guidedIndex - 1] : null;

  return (
    <div className="playground-screen navo-shell">
      <NavoNav compact />

      <main className="playground-container navo-container navo-container--normal">
        <span className="navo-pill"><span className="navo-dot" /> Pattern Playground</span>
        <h1 className="playground-title">One phrase, many nearby shapes.</h1>
        <p className="playground-subtitle">Keep one phrase central, then branch through nearby paths.</p>

        {isEntryMode && entryPhrase && (
          <div className="entry-state navo-card navo-hairline-top">
            <p className="entry-seed-kicker">Seed phrase</p>
            {entryPhrase.icon && <div className="entry-seed-icon">{entryPhrase.icon}</div>}
            <div className="entry-seed-text">{entryPhrase.text}</div>
            {entryPhrase.scene && <div className="entry-seed-scene">{entryPhrase.scene}</div>}
            <div className="entry-actions">
              <button className="guided-action-button secondary" onClick={handleBeginFromEntry}>Begin</button>
              <button className="guided-action-button" onClick={handleAnotherSeed}>Another seed</button>
            </div>
          </div>
        )}

        {!isEntryMode && currentPhrase && (
          <div className="guided-flow">
            <div className="guided-phrase-card navo-card navo-hairline-top">
              {currentPhrase.icon && <div className="guided-visual-marker">{currentPhrase.icon}</div>}
              <div className="guided-phrase-row">
                <p className="guided-phrase-text">
                  {(() => {
                    const changedIndexes = previousPhrase ? getChangedWordIndexes(previousPhrase.text, currentPhrase.text) : [];
                    const words = currentPhrase.text.split(/\s+/);
                    return words.map((word, index) => (
                      <span key={index} className={changedIndexes.includes(index) ? 'guided-changed-word' : ''}>{word}{index < words.length - 1 ? ' ' : ''}</span>
                    ));
                  })()}
                </p>
              </div>

              {getCompressedMeaning(currentPhrase) && <div className="guided-compressed-meaning">{getCompressedMeaning(currentPhrase)}</div>}

              <div className="guided-inline-actions">
                <button
                  className="guided-audio-button"
                  onClick={() => handlePlayPhrase('main', currentPhrase.text, currentPhrase.language)}
                  title="Hear it"
                  aria-label="Hear it"
                >
                  {playingAudioId === 'main' ? <FaPause /> : <FaPlay />}
                  <span>Hear it</span>
                </button>
                <button className="guided-action-button" onClick={handleAnotherShape}>Another shape</button>
              </div>

              <div className="guided-phrase-footer">
                <button className="guided-room-link" onClick={() => handleCarryToRoom(currentPhrase.text)}>Take to Room &rarr;</button>
              </div>
            </div>

            {getNearbyPathIndexes().length > 0 && (
              <div className="nearby-paths">
                <p className="nearby-label">Nearby paths</p>
                <div className="nearby-list">
                  {getNearbyPathIndexes().map((pathIndex) => {
                    const pathPhrase = guidedSequence[pathIndex];
                    const changedIndexes = getChangedWordIndexes(currentPhrase.text, pathPhrase.text);
                    const words = pathPhrase.text.split(/\s+/);

                    return (
                      <div key={`${pathPhrase.text}-${pathIndex}`} className="nearby-item navo-card">
                        <div className="nearby-copy">
                          <button
                            className="nearby-audio-button icon-only"
                            onClick={() => handlePlayPhrase(`path-${pathIndex}`, pathPhrase.text, pathPhrase.language || currentPhrase.language)}
                            title="Hear it"
                            aria-label="Hear it"
                          >
                            {playingAudioId === `path-${pathIndex}` ? <FaPause /> : <FaPlay />}
                          </button>
                          <button className="nearby-jump" onClick={() => setGuidedIndex(pathIndex)}>
                            {words.map((word, index) => <span key={index} className={changedIndexes.includes(index) ? 'guided-changed-word' : ''}>{word}{index < words.length - 1 ? ' ' : ''}</span>)}
                          </button>
                        </div>
                        <div className="nearby-actions">
                          <button className="nearby-carry" onClick={() => handleCarryToRoom(pathPhrase.text)}>Carry to Room &rarr;</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="guided-flow-actions">
              <button className="back-to-loop-link" onClick={() => navigate('/loop')}>&larr; Back to loop</button>
            </div>
          </div>
        )}
      </main>

      <NavoFooter />
    </div>
  );
}

export default PlaygroundScreen;
