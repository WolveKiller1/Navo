import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { initStorage, getImmersionProfile } from '../services/storage';
import { getDefaultProfile } from '../services/immersionProfile';
import { speak } from '../services/tts';
import { buildPlaygroundSequence } from '../services/playgroundSequenceBuilder';
import { generatePlaygroundSeed } from '../services/playgroundSeed';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/PlaygroundScreen.css';

function normalizeWord(word) {
  return word
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .toLowerCase();
}

function getChangedWordIndexes(referenceText, candidateText) {
  if (!referenceText || !candidateText) {
    return [];
  }

  const referenceWords = referenceText.trim().split(/\s+/).filter(Boolean);
  const candidateWords = candidateText.trim().split(/\s+/).filter(Boolean);
  const referenceNorm = referenceWords.map(normalizeWord);
  const candidateNorm = candidateWords.map(normalizeWord);

  const n = referenceNorm.length;
  const m = candidateNorm.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      if (referenceNorm[i] && candidateNorm[j] && referenceNorm[i] === candidateNorm[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j]);
      }
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
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return candidateWords
    .map((_, index) => (matchedCandidate.has(index) ? null : index))
    .filter(index => index !== null);
}

function compressMeaning(raw) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  let text = raw.trim().replace(/[.!?]+$/, '').toLowerCase();
  text = text.replace(/\bout of nowhere\b/g, 'suddenly');
  text = text.replace(/\b(i|you|he|she|it|we|they|the|a|an|my|your|his|her|their|at|in|of)\b/gi, '');
  text = text.replace(/\s+/g, ' ').trim();

  if (!text || text.length < 2) {
    return null;
  }

  return text;
}

function getCompressedMeaning(phrase) {
  if (!phrase) {
    return null;
  }

  if (phrase.meaning) {
    const compressed = compressMeaning(phrase.meaning);
    if (compressed) {
      return compressed;
    }
  }

  return phrase.scene || null;
}

function toTtsLanguage(lang) {
  if (lang === 'pt') {
    return 'pt-BR';
  }

  return 'en-US';
}

function PlaygroundScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const [guidedSequence, setGuidedSequence] = useState([]);
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [isEntryMode, setIsEntryMode] = useState(false);
  const [entryPhrase, setEntryPhrase] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      await initStorage();
      const loadedProfile = await getImmersionProfile();
      if (!loadedProfile) {
        getDefaultProfile();
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (location.state?.guidedMode && location.state?.seedSentence) {
      const sequence = buildPlaygroundSequence(location.state);
      setGuidedSequence(sequence);
      setGuidedIndex(0);
      window.history.replaceState({}, document.title);
      return;
    }

    if (location.state?.entryMode) {
      const lang = location.state?.language || 'en';
      const seed = generatePlaygroundSeed(null, lang);
      setEntryPhrase(seed);
      setIsEntryMode(true);
      window.history.replaceState({}, document.title);
      return;
    }

    if (location.state?.returnSentence) {
      const sequence = buildPlaygroundSequence({
        guidedMode: true,
        seedSentence: location.state.returnSentence,
        language: location.state.language || 'en'
      });
      setGuidedSequence(sequence);
      setGuidedIndex(0);
      window.history.replaceState({}, document.title);
      return;
    }

    navigate('/');
  }, []);

  const handleBeginFromEntry = () => {
    if (!entryPhrase) {
      return;
    }

    const sequence = buildPlaygroundSequence({
      guidedMode: true,
      seedSentence: entryPhrase.text,
      seedMeaning: entryPhrase.meaning,
      icon: entryPhrase.icon,
      scene: entryPhrase.scene,
      patternId: entryPhrase.patternId,
      contextVariations: entryPhrase.contextVariations,
      language: entryPhrase.language || 'en'
    });

    setGuidedSequence(sequence);
    setGuidedIndex(0);
    setIsEntryMode(false);
  };

  const handleAnotherSeed = () => {
    const lang = entryPhrase?.language || 'en';
    const next = generatePlaygroundSeed(entryPhrase?.patternId || null, lang);
    setEntryPhrase(next);
  };

  const handleAnotherShape = () => {
    if (!guidedSequence.length) {
      return;
    }

    const currentPhrase = guidedSequence[guidedIndex];
    const lang = currentPhrase?.language || 'en';
    const seed = generatePlaygroundSeed(currentPhrase?.patternId || null, lang);
    const sequence = buildPlaygroundSequence({
      guidedMode: true,
      seedSentence: seed.text,
      seedMeaning: seed.meaning,
      icon: seed.icon,
      scene: seed.scene,
      patternId: seed.patternId,
      contextVariations: seed.contextVariations,
      language: lang
    });

    setGuidedSequence(sequence);
    setGuidedIndex(0);
  };

  const handleCarryToRoom = (phraseText) => {
    sessionStorage.setItem('rylingo_access', 'granted');
    navigate('/room', {
      state: { openingSentence: phraseText }
    });
  };

  const getNearbyPathIndexes = () => {
    if (!guidedSequence.length) {
      return [];
    }

    const candidateIndexes = [guidedIndex - 1, guidedIndex + 1, guidedIndex - 2, guidedIndex + 2];
    const uniqueValid = [];

    candidateIndexes.forEach((index) => {
      if (
        index >= 0 &&
        index < guidedSequence.length &&
        index !== guidedIndex &&
        !uniqueValid.includes(index)
      ) {
        uniqueValid.push(index);
      }
    });

    return uniqueValid.slice(0, 3);
  };

  const currentPhrase = guidedSequence[guidedIndex];
  const previousPhrase = guidedIndex > 0 ? guidedSequence[guidedIndex - 1] : null;

  return (
    <div className="playground-screen navo-shell">
      <NavoNav compact />

      <div className="playground-container navo-container">
        <header className="playground-header">
          <span className="navo-pill"><span className="navo-dot" /> Pattern Playground</span>
          <h1 className="playground-title">One phrase, many nearby shapes.</h1>
          <p className="playground-subtitle">Keep one phrase central, then branch through nearby paths.</p>
        </header>

        {isEntryMode && entryPhrase && (
          <div className="entry-state">
            <p className="entry-subtitle">A phrase to move</p>

            <div className="entry-seed-card">
              <p className="entry-seed-kicker">Seed phrase</p>
              {entryPhrase.icon && <div className="entry-seed-icon">{entryPhrase.icon}</div>}
              <div className="entry-seed-text">{entryPhrase.text}</div>
              {entryPhrase.scene && <div className="entry-seed-scene">{entryPhrase.scene}</div>}
            </div>

            <button className="entry-begin-button" onClick={handleBeginFromEntry}>
              Begin
            </button>

            <button className="entry-another-seed" onClick={handleAnotherSeed}>
              Another seed
            </button>
          </div>
        )}

        {!isEntryMode && currentPhrase && (
          <div className="guided-flow">
            <div className="guided-phrase-card">
              {currentPhrase.icon && <div className="guided-visual-marker">{currentPhrase.icon}</div>}

              <div className="guided-phrase-row">
                <button
                  className="guided-audio-button"
                  onClick={() => speak(currentPhrase.text, toTtsLanguage(currentPhrase.language))}
                  title="Play phrase"
                >
                  Play
                </button>

                <div className="guided-phrase-text">
                  {(() => {
                    const changedIndexes = previousPhrase
                      ? getChangedWordIndexes(previousPhrase.text, currentPhrase.text)
                      : [];
                    const words = currentPhrase.text.split(/\s+/);

                    return words.map((word, index) => (
                      <span key={index} className={changedIndexes.includes(index) ? 'guided-changed-word' : ''}>
                        {word}{index < words.length - 1 ? ' ' : ''}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {getCompressedMeaning(currentPhrase) && (
                <div className="guided-compressed-meaning">{getCompressedMeaning(currentPhrase)}</div>
              )}

              <div className="guided-primary-actions">
                <button
                  className="guided-action-button secondary"
                  onClick={() => handleCarryToRoom(currentPhrase.text)}
                >
                  Carry
                </button>
                <button className="guided-action-button subtle" onClick={handleAnotherShape}>
                  Another shape
                </button>
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
                        <button
                          className="nearby-audio-button"
                          onClick={() => speak(pathPhrase.text, toTtsLanguage(pathPhrase.language || currentPhrase.language))}
                          title="Play path"
                        >
                          Play
                        </button>

                        <div className="nearby-copy">
                          <button className="nearby-jump" onClick={() => setGuidedIndex(pathIndex)} title="Move to this path">
                            {words.map((word, index) => (
                              <span key={index} className={changedIndexes.includes(index) ? 'guided-changed-word' : ''}>
                                {word}{index < words.length - 1 ? ' ' : ''}
                              </span>
                            ))}
                          </button>
                          {pathPhrase.scene && <p className="nearby-scene">{pathPhrase.scene}</p>}
                        </div>

                        <button className="nearby-carry" onClick={() => handleCarryToRoom(pathPhrase.text)}>
                          Carry
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="guided-flow-actions">
              <button className="guided-action-button secondary" onClick={() => navigate('/loop')}>
                Back to loop
              </button>
              <button
                className="guided-action-button subtle"
                onClick={() => {
                  sessionStorage.setItem('rylingo_access', 'granted');
                  navigate('/room');
                }}
              >
                Enter room
              </button>
            </div>
          </div>
        )}
      </div>

      <NavoFooter />
    </div>
  );
}

export default PlaygroundScreen;
