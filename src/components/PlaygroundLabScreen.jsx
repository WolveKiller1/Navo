/**
 * PlaygroundLabScreen
 * 
 * DEV-ONLY LEGACY PLAYGROUND
 * 
 * This is the original pressure-based text editing playground (reactor mode only).
 * It's only available in development for testing and iteration.
 * 
 * In production, /playground-lab will redirect to home.
 * Users should use the new guided pattern flow from the landing page instead.
 * 
 * This component is a fork of PlaygroundScreen that:
 * - Removes the guided mode flow (no Previous/Next navigation)
 * - Shows only the reactor: seed selector → pressure-based editing
 * - Keeps all the variation generation and grammar stabilization
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHistory, FaUser } from 'react-icons/fa';
import { initStorage } from '../services/storage';
import { getImmersionProfile } from '../services/accountService';
import { getDefaultProfile } from '../services/immersionProfile';
import { generateVariations } from '../services/variationEngine';
import { stabilizeGrammar } from '../services/stabilizeGrammar';
import { speak } from '../services/tts';
import { getWordMeaning } from '../services/wordMeaning';
import { CATALYTIC_SEEDS } from '../data/catalyticSeeds';
import MeaningBubble from './MeaningBubble';
import HomeArrow from './HomeArrow';
import WordPickerPopup from './WordPickerPopup';
import { getWordOptions } from '../services/wordTransformations';
import { checkEditIntegrity } from '../services/playgroundIntegrity';
import '../styles/PlaygroundScreen.css';

// PHASE 13: Structural pressures (60% selection weight)
const STRUCTURAL_PRESSURE_POOL = [
  { label: "Give a reason", type: "structural", move: "cause", keywords: ["because", "so", "since"] },
  { label: "Say what might happen", type: "structural", move: "conditional", keywords: ["might", "could", "may"] },
  { label: "Say the opposite", type: "structural", move: "contrast", keywords: ["but", "although", "however", "though"] },
  { label: "Say it in the past", type: "structural", move: "past", keywords: ["was", "were", "did", "had", "went", "ed"] },
  { label: "Say it in the future", type: "structural", move: "future", keywords: ["will", "going to", "gonna"] },
  { label: "Say what would happen if", type: "structural", move: "conditional", keywords: ["if", "would"] },
  { label: "Add one detail", type: "structural", move: "none", keywords: [] }
];

// PHASE 13: Meaning pressures (40% selection weight)
const MEANING_PRESSURE_POOL = [
  { label: "Say how you felt", type: "meaning", move: "expansion" },
];

// PHASE 12 REFINED: Check if sentence already satisfies a pressure
function isSatisfied(sentence, pressure) {
  if (!pressure.keywords || pressure.keywords.length === 0) return false;
  
  const lowerSentence = sentence.toLowerCase();
  return pressure.keywords.some(keyword => lowerSentence.includes(keyword));
}

// PHASE 13 REFINED: Select random pressure with limits
function selectRandomPressure(
  lastPressure,
  currentSentence = null,
  consecutiveMeaningCount = 0,
  recentMoves = []
) {
  // Prefer structural after a meaning pressure, but do not force it
  let useStructural = consecutiveMeaningCount >= 1 ? true : Math.random() < 0.6;
  let pool = useStructural ? STRUCTURAL_PRESSURE_POOL : MEANING_PRESSURE_POOL;

  // Filter: avoid immediate repeat
  let available = pool.filter(p => p.label !== lastPressure?.label);

  // Avoid recently repeated moves
  available = available.filter(p => !recentMoves.includes(p.move));

  // For structural only: also avoid satisfied pressures
  if (useStructural && currentSentence) {
    available = available.filter(p => !isSatisfied(currentSentence, p));
  }

  // If preferred structural pool becomes empty or weak, allow meaning instead
  if (available.length === 0 && useStructural) {
    pool = MEANING_PRESSURE_POOL;
    available = pool.filter(
      p =>
        p.label !== lastPressure?.label &&
        !recentMoves.includes(p.move)
    );
  }

  // Final fallback
  if (available.length === 0) {
    available = pool.filter(p => p.label !== lastPressure?.label);
  }

  if (available.length === 0) {
    available = pool;
  }

  return available[Math.floor(Math.random() * available.length)];
}

// Context variation helper with visual/scene data
function getContextVariations(phraseData) {
  // phraseData can be string or object {text, icon, scene, contextVariations}
  
  // Handle string input (fallback)
  if (typeof phraseData === 'string') {
    // Try to find in hardcoded map
    const contextMap = {
      "Eu perdi o ônibus esta manhã.": [
        { text: "Eu perdi o trem esta manhã.", icon: "🚆", scene: "missed train, morning" },
        { text: "Eu quase perdi o ônibus esta manhã.", icon: "🏃🚌", scene: "almost missed bus" },
        { text: "Eu perdi o ônibus ontem.", icon: "🚌🌙", scene: "missed bus, yesterday" }
      ],
      "Eu perdi o trem esta manhã.": [
        { text: "Eu perdi o metrô esta manhã.", icon: "🚇", scene: "missed metro, morning" },
        { text: "Eu quase perdi o trem esta manhã.", icon: "🏃🚆", scene: "almost missed train" }
      ],
      "Eu quase perdi o ônibus esta manhã.": [
        { text: "Eu quase perdi o trem esta manhã.", icon: "🏃🚆", scene: "almost missed train" },
        { text: "Eu perdi o ônibus esta manhã.", icon: "🚌", scene: "missed bus, morning" }
      ],
      "Eu perdi o ônibus ontem.": [
        { text: "Eu perdi o ônibus esta manhã.", icon: "🚌", scene: "missed bus, morning" },
        { text: "Eu perdi o trem ontem.", icon: "🚆🌙", scene: "missed train, yesterday" }
      ],
      "Eu perdi o metrô esta manhã.": [
        { text: "Eu quase perdi o metrô esta manhã.", icon: "🏃🚇", scene: "almost missed metro" },
        { text: "Eu perdi o metrô ontem.", icon: "🚇🌙", scene: "missed metro, yesterday" },
        { text: "Eu perdi o ônibus esta manhã.", icon: "🚌", scene: "missed bus, morning" }
      ],
      "Eu quase perdi o trem esta manhã.": [
        { text: "Eu quase perdi o metrô esta manhã.", icon: "🏃🚇", scene: "almost missed metro" },
        { text: "Eu perdi o trem esta manhã.", icon: "🚆", scene: "missed train, morning" },
        { text: "Eu quase perdi o trem ontem.", icon: "🏃🚆🌙", scene: "almost missed train, yesterday" }
      ],
      "Eu perdi o trem ontem.": [
        { text: "Eu perdi o trem esta manhã.", icon: "🚆", scene: "missed train, morning" },
        { text: "Eu quase perdi o trem ontem.", icon: "🏃🚆🌙", scene: "almost missed train, yesterday" },
        { text: "Eu perdi o metrô ontem.", icon: "🚇🌙", scene: "missed metro, yesterday" }
      ]
    };
    
    return contextMap[phraseData] || [];
  }
  
  // Handle object input (with contextVariations field)
  return phraseData.contextVariations || [];
}

// Helper functions for variation data
function getVariationText(variation) {
  return typeof variation === 'string' ? variation : variation.text;
}

function getVariationIcon(variation) {
  return typeof variation === 'string' ? getFallbackIcon(variation) : (variation.icon || getFallbackIcon(variation.text));
}

function getVariationScene(variation) {
  return typeof variation === 'string' ? null : variation.scene;
}

// Fallback icon generator
function getFallbackIcon(text) {
  if (text.includes('ônibus')) return '🚌';
  if (text.includes('trem')) return '🚆';
  if (text.includes('metrô')) return '🚇';
  if (text.includes('telefone')) return '📱';
  if (text.includes('casa')) return '🏠';
  if (text.includes('chover') || text.includes('chuva')) return '🌧️';
  if (text.includes('cachorro')) return '🐕';
  if (text.includes('porta')) return '🚪';
  if (text.includes('café')) return '☕';
  return '💭';
}

// Fixed diff highlighting - only highlights actual changes
function createHighlightedSentence(original, stabilized) {
  // If sentences are the same, no highlighting
  if (original.trim() === stabilized.trim()) {
    return null;
  }
  
  const origWords = original.trim().split(/\s+/);
  const stabWords = stabilized.trim().split(/\s+/);
  
  return stabWords.map((word, i) => {
    const origWord = origWords[i];
    // Compare actual words (not lowercased) to detect real changes
    const isChanged = !origWord || origWord !== word;
    return { text: word, changed: isChanged };
  });
}

// Helper to normalize text for word comparison
function normalizeWord(word) {
  return word
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .toLowerCase();
}

// Helper to get changed word indexes between two texts using sequence diff
function getChangedWordIndexes(previousText, currentText) {
  if (!previousText || !currentText) {
    return [];
  }

  const prevWords = previousText.trim().split(/\s+/).filter(Boolean);
  const currWords = currentText.trim().split(/\s+/).filter(Boolean);
  const prevNorm = prevWords.map(normalizeWord);
  const currNorm = currWords.map(normalizeWord);

  const n = prevNorm.length;
  const m = currNorm.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (prevNorm[i] && currNorm[j] && prevNorm[i] === currNorm[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j]);
      }
    }
  }

  const matchedCurrent = new Set();
  let i = n;
  let j = m;

  while (i > 0 && j > 0) {
    if (prevNorm[i - 1] === currNorm[j - 1]) {
      matchedCurrent.add(j - 1);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return currWords
    .map((_, index) => (matchedCurrent.has(index) ? null : index))
    .filter(index => index !== null);
}

function PlaygroundLabScreen() {
  console.log('PlaygroundLabScreen rendering (DEV ONLY)');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Profile (read-only)
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Core state
  const [currentSentence, setCurrentSentence] = useState(null);
  const [currentPressure, setCurrentPressure] = useState(null);
  const [variations, setVariations] = useState([]);
  const [userInput, setUserInput] = useState('');
  
  // Entry phase: Single suggestion cycling
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  
  // Processing state
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [variationsFading, setVariationsFading] = useState(false);
  const [sentenceChanging, setSentenceChanging] = useState(false);
  const [highlightedWords, setHighlightedWords] = useState(null);
  
  // Session state (in-memory, resets on mount/clear)
  const [lastPressure, setLastPressure] = useState(null);
  const [hasMutation, setHasMutation] = useState(false);
  
  // Phase 13: Track original seed sentence for context
  const [seedSentence, setSeedSentence] = useState(null);
  
  // Phase 13 REFINED: Track mutation limits
  const [mutationCount, setMutationCount] = useState(0);
  const [consecutiveMeaningCount, setConsecutiveMeaningCount] = useState(0);
  
  // Phase 11: Comprehension Layer
  const [meaningBubble, setMeaningBubble] = useState(null);
  
  // Chapter 4 Phase 1: Word edit mode
  const [showWordPicker, setShowWordPicker] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [selectedWord, setSelectedWord] = useState('');
  const [wordOptions, setWordOptions] = useState([]);
  const [modifiedWordIndex, setModifiedWordIndex] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(null);
  
  // Chapter 4 Phase 2: Chunk selection
  const [chunkSelection, setChunkSelection] = useState(null);
  const [isChunkSelectionMode, setIsChunkSelectionMode] = useState(false);
  const [chunkWords, setChunkWords] = useState([]);
  
  // UI state
  const [errorMessage, setErrorMessage] = useState('');
  const [rejectionMessage, setRejectionMessage] = useState('');
  
  // Transformation indicator
  const [previousSentence, setPreviousSentence] = useState(null);

  // Load immersion profile (read-only) on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        await initStorage();
        let loadedProfile = await getImmersionProfile();
        if (!loadedProfile) {
          loadedProfile = getDefaultProfile();
        }
        
        setProfile(loadedProfile);
        setProfileLoaded(true);
      } catch (error) {
        console.error('Failed to load profile:', error);
        setProfileLoaded(true);
        setErrorMessage('Failed to load profile. Please refresh.');
      }
    };
    
    loadProfile();
  }, []);

  // Initialize with random suggestion on mount
  useEffect(() => {
    if (!currentSentence && CATALYTIC_SEEDS.length > 0) {
      const randomIndex = Math.floor(Math.random() * CATALYTIC_SEEDS.length);
      setCurrentSuggestion(CATALYTIC_SEEDS[randomIndex]);
    }
  }, [currentSentence]);

  // Handle suggestion cycling (randomize)
  const handleCycleSuggestion = () => {
    if (CATALYTIC_SEEDS.length === 0) return;
    
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * CATALYTIC_SEEDS.length);
    } while (CATALYTIC_SEEDS.length > 1 && CATALYTIC_SEEDS[randomIndex] === currentSuggestion);
    
    setCurrentSuggestion(CATALYTIC_SEEDS[randomIndex]);
  };

  // Handle seed click
  const handleSeedClick = (seed) => {
    setCurrentSentence(seed.sentence);
    
    setSeedSentence(seed.sentence);
    
    setMutationCount(0);
    setConsecutiveMeaningCount(0);
    
    const randomPressure = selectRandomPressure(null, seed.sentence, 0);
    setCurrentPressure(randomPressure);
    setLastPressure(randomPressure);
  };

  // Handle user submit
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedInput = userInput.trim();
    if (!trimmedInput) {
      setErrorMessage('Please enter a sentence.');
      return;
    }
    
    setErrorMessage('');
    
    if (!currentSentence) {
      setCurrentSentence(trimmedInput);
      setSeedSentence(trimmedInput);
      setMutationCount(0);
      setConsecutiveMeaningCount(0);
      
      const randomPressure = selectRandomPressure(null, trimmedInput, 0);
      setCurrentPressure(randomPressure);
      setLastPressure(randomPressure);
      
      setUserInput('');
      return;
    }
  };

  // Generate variations with animation
  const generateVariationsWithAnimation = async (sentence, pressureMove) => {
    setIsGeneratingVariations(true);
    setVariationsFading(false);
    
    try {
      const generatedVariations = await generateVariations(
        sentence,
        pressureMove,
        profile
      );
      
      const variationTexts = generatedVariations.map(v => 
        typeof v === 'string' ? v : v.text
      );
      
      setVariations(variationTexts);
    } catch (error) {
      console.error('Failed to generate variations:', error);
      setVariations([]);
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  // Handle word click for comprehension
  const handleWordClick = async (word, index, e) => {
    if (showWordPicker) return;
    
    try {
      const meaning = await getWordMeaning(word);
      
      if (meaning) {
        const rect = e.target.getBoundingClientRect();
        setMeaningBubble({
          word,
          meaning,
          position: { top: rect.top, left: rect.left, height: rect.height },
          wordIndex: index
        });
        setCurrentWordIndex(index);
      }
    } catch (error) {
      console.error('Failed to get word meaning:', error);
    }
  };

  // Handle change from meaning bubble
  const handleChangeFromMeaning = async (wordIndex) => {
    setMeaningBubble(null);
    setSelectedWordIndex(wordIndex);
    
    const words = currentSentence.split(/\s+/);
    const word = words[wordIndex];
    setSelectedWord(word);
    
    try {
      const options = await getWordOptions(word);
      setWordOptions(options);
      setShowWordPicker(true);
      setIsChunkSelectionMode(false);
      setChunkSelection(null);
      setChunkWords([]);
    } catch (error) {
      console.error('Failed to get word options:', error);
    }
  };

  // Handle word replace
  const handleWordReplace = async (newWord) => {
    if (selectedWordIndex === null) return;
    
    const words = currentSentence.split(/\s+/);
    words[selectedWordIndex] = newWord;
    const newSentence = words.join(' ');
    
    setShowWordPicker(false);
    
    setIsStabilizing(true);
    
    try {
      const stabilized = await stabilizeGrammar(newSentence, profile);
      const finalSentence = stabilized || newSentence;
      
      // Check edit integrity
      const integrityResult = checkEditIntegrity(currentSentence, finalSentence);
      if (!integrityResult.isValid) {
        setRejectionMessage(integrityResult.message);
        setTimeout(() => setRejectionMessage(''), 3000);
      }
      
      if (finalSentence !== currentSentence) {
        setPreviousSentence(currentSentence);
      }
      
      setSentenceChanging(true);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setCurrentSentence(finalSentence);
      
      setIsStabilizing(false);
      setHasMutation(true);
      
      if (isChunkSelectionMode && chunkSelection) {
        setModifiedWordIndex(chunkSelection.startIndex);
      } else {
        setModifiedWordIndex(selectedWordIndex);
      }
      
      setChunkSelection(null);
      setIsChunkSelectionMode(false);
      
      const newMutationCount = mutationCount + 1;
      setMutationCount(newMutationCount);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setSentenceChanging(false);
      
      setTimeout(() => {
        setModifiedWordIndex(null);
      }, 1500);
      
      const pressureSatisfied = isSatisfied(finalSentence, currentPressure);
      
      await generateVariationsWithAnimation(finalSentence, currentPressure.move);
      
      if (!pressureSatisfied) {
        setMutationCount(newMutationCount - 1);
        return;
      }
      
      if (newMutationCount >= 4) {
        setCurrentPressure(null);
        return;
      }
      
      let newConsecutiveMeaningCount = consecutiveMeaningCount;
      if (currentPressure?.type === "meaning") {
        newConsecutiveMeaningCount = consecutiveMeaningCount + 1;
      } else {
        newConsecutiveMeaningCount = 0;
      }
      setConsecutiveMeaningCount(newConsecutiveMeaningCount);
      
      const nextPressure = selectRandomPressure(lastPressure, finalSentence, newConsecutiveMeaningCount);
      setCurrentPressure(nextPressure);
      setLastPressure(nextPressure);
    } catch (error) {
      console.error('Error during word replacement:', error);
      setErrorMessage('Failed to process word change.');
    } finally {
      setIsStabilizing(false);
    }
  };

  // Handle chunk expand
  const handleChunkExpand = (startIndex, endIndex) => {
    setChunkSelection({ startIndex, endIndex });
    const words = currentSentence.split(/\s+/);
    const selectedChunk = words.slice(startIndex, endIndex + 1);
    setChunkWords(selectedChunk);
  };

  // Handle clear
  const handleClear = () => {
    setCurrentSentence(null);
    setCurrentPressure(null);
    setVariations([]);
    setUserInput('');
    setErrorMessage('');
    setLastPressure(null);
    setHasMutation(false);
    setSeedSentence(null);
    setMutationCount(0);
    setConsecutiveMeaningCount(0);
    setMeaningBubble(null);
    setPreviousSentence(null);
  };

  // Handle take to call room
  const handleTakeToCallRoom = () => {
    navigate('/room', { 
      state: { openingSentence: currentSentence } 
    });
  };

  // Render
  return (
    <div className="playground-screen">
      <div className="playground-container">
        {/* Header */}
        <header className="playground-header">
          <h1 className="playground-title">Playground Lab</h1>
          <p className="playground-subtitle">Legacy reactor mode (dev only)</p>
          <div className="icon-group">
            <button className="history-icon" onClick={() => navigate('/sessions')} aria-label="Sessions">
              <FaHistory />
            </button>
            <button className="account-icon" onClick={() => navigate('/account')} aria-label="Account">
              <FaUser />
            </button>
          </div>
        </header>

        {/* Entry Phase */}
        {!currentSentence && profileLoaded && currentSuggestion && (
          <div className="entry-phase">
            <div 
              className="suggestion-card"
              onClick={() => handleSeedClick(currentSuggestion)}
            >
              <div className="suggestion-text">
                {currentSuggestion.sentence}
              </div>
            </div>
            
            <button 
              className="cycle-link"
              onClick={handleCycleSuggestion}
            >
              another example
            </button>
            
            <div className="entry-separator">— or —</div>
            
            <div className="input-card">
              <textarea
                className="entry-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your own sentence..."
                rows={3}
              />
              <button
                className="submit-button"
                onClick={handleUserSubmit}
                disabled={!userInput.trim()}
              >
                Submit →
              </button>
            </div>
          </div>
        )}

        {/* Reactor */}
        {currentSentence && (
          <>
            <div className={`sentence-core ${sentenceChanging ? 'changing' : ''}`}>
              <button 
                className="sentence-audio-button"
                onClick={() => speak(currentSentence)}
                aria-label="Play sentence"
                title="Play sentence audio"
              >
                🔊
              </button>
              
              {previousSentence && previousSentence !== currentSentence && (
                <div className="transformation-indicator">
                  <span className="previous-sentence">{previousSentence}</span>
                  <span className="transformation-arrow">→</span>
                  <span className="current-sentence-preview">{currentSentence}</span>
                </div>
              )}
              
              <div className="sentence-text">
                {currentSentence.split(/\s+/).map((word, i) => {
                  const isInChunk = chunkSelection && 
                    i >= chunkSelection.startIndex && 
                    i <= chunkSelection.endIndex;
                  
                  return (
                    <span 
                      key={i}
                      className={`tappable-word ${modifiedWordIndex === i ? 'word-modified' : ''} ${isInChunk ? 'word-in-chunk' : ''}`}
                      onClick={(e) => handleWordClick(word, i, e)}
                    >
                      {word}{i < currentSentence.split(/\s+/).length - 1 ? ' ' : ''}
                    </span>
                  );
                })}
              </div>
              {currentPressure && (
                <div className="pressure-indicator">
                  {currentPressure.label}
                </div>
              )}
              
              {rejectionMessage && (
                <div className="rejection-message">
                  {rejectionMessage}
                </div>
              )}
            </div>

            {variations.length > 0 && (
              <div className={`other-directions ${variationsFading ? 'fading' : ''}`}>
                <label className="section-label">Other directions</label>
                <div className="variations-list">
                  {variations.map((variation, index) => (
                    <div key={index} className="variation-item">
                      {variation}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasMutation && (
              <div className="call-room-bridge">
                <button className="bridge-button" onClick={handleTakeToCallRoom}>
                  Take this sentence into the Call Room →
                </button>
              </div>
            )}

            <div className="actions-section">
              <button className="clear-button" onClick={handleClear}>
                Clear
              </button>
            </div>
          </>
        )}

        <div className="playground-footer">
          <Link to="/" className="back-link">Back to Home</Link>
        </div>
      </div>

      {meaningBubble && (
        <MeaningBubble 
          word={meaningBubble.word}
          meaning={meaningBubble.meaning}
          position={meaningBubble.position}
          wordIndex={meaningBubble.wordIndex}
          onDismiss={() => setMeaningBubble(null)}
          onChangeClick={handleChangeFromMeaning}
        />
      )}

      {showWordPicker && (
        <WordPickerPopup
          selectedWord={selectedWord}
          quickOptions={wordOptions}
          onSelect={handleWordReplace}
          onClose={() => {
            setShowWordPicker(false);
            setChunkSelection(null);
            setIsChunkSelectionMode(false);
            setChunkWords([]);
          }}
          chunkSelection={chunkSelection}
          onChunkExpand={handleChunkExpand}
          totalWords={currentSentence ? currentSentence.split(/\s+/).length : 0}
          chunkWords={chunkWords}
        />
      )}
    </div>
  );
}

export default PlaygroundLabScreen;
