import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone } from 'react-icons/fa';
import { sendMessage, resetConversation } from '../services/conversation';
import { applyMoveEngine } from '../services/moveEngine';
import { initializeTTS, speak } from '../services/tts';
import { IMITATION_UNITS_EN, IMITATION_UNITS_PT } from '../data/units';
import { PHRASE_PATTERNS_PT, PHRASE_PATTERNS_EN } from '../data/phrasePatterns';
import { generateAllPhrases } from '../services/phraseGenerator';
import { getUserPreferences, initStorage } from '../services/storage';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import SystemNotice from './SystemNotice';
import '../styles/ImitationLoop.css';

function ImitationLoop() {
  const navigate = useNavigate();
  
  // Random selection helper
  const selectRandomUnit = (units, recentIds, maxRecent = 4) => {
    // Filter out recently seen units
    const available = units.filter(u => !recentIds.includes(u.id));
    
    // If all have been seen recently, reset
    if (available.length === 0) {
      return units[Math.floor(Math.random() * units.length)];
    }
    
    // Pick random from available
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  };
  
  const [currentUnitId, setCurrentUnitId] = useState(null);
  const [recentUnitIds, setRecentUnitIds] = useState([]);
  const [userTranscript, setUserTranscript] = useState('');
  const [systemResponse, setSystemResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [systemNotice, setSystemNotice] = useState(null);
  const [activeUnits, setActiveUnits] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState('en');
  
  // Beginner support state
  const [showSentenceMeaning, setShowSentenceMeaning] = useState(false);
  const [pronunciationBubble, setPronunciationBubble] = useState(null);
  
  // Alignment animation state
  const [justAligned, setJustAligned] = useState(false);
  
  // Engagement tracking for bridge to Playground
  const [hasEngaged, setHasEngaged] = useState(false);
  
  // Audio-first: control text visibility
  const [showSentenceText, setShowSentenceText] = useState(false);
  const transcriptRef = useRef('');
  const speechFinalizeTimeout = useRef(null);

  const speechOptions = { language: activeLanguage === 'en' ? 'en-US' : 'pt-BR' };

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition(speechOptions);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (speechFinalizeTimeout.current) {
        clearTimeout(speechFinalizeTimeout.current);
      }
    };
  }, []);

  const currentUnit = activeUnits.find(u => u.id === currentUnitId) || activeUnits[0] || {};
  const hasSupportContent = currentUnit && currentUnit.words && currentUnit.meaning;

  // Load preferences and set active units (combine fixed + generated)
  useEffect(() => {
    const loadLanguagePreference = async () => {
      await initStorage();
      const prefs = await getUserPreferences();
      const lang = prefs.activeLanguage || 'en';
      setActiveLanguage(lang);
      
      if (lang === 'pt') {
        // Portuguese: Combine fixed units with generated phrases
        // Only include fixed units that are pattern-backed (have valid patternId or contextVariations)
        const validPatternIds = PHRASE_PATTERNS_PT.map(p => p.id);
        const backedFixedUnits = IMITATION_UNITS_PT.filter(unit => 
          unit.contextVariations || (unit.patternId && validPatternIds.includes(unit.patternId))
        );
        const generatedPhrases = generateAllPhrases(PHRASE_PATTERNS_PT, 8); // 8 per pattern
        const combinedUnits = [...backedFixedUnits, ...generatedPhrases];
        
        console.log(`[Practice Loop PT] Pool: ${backedFixedUnits.length} backed fixed + ${generatedPhrases.length} generated = ${combinedUnits.length} total`);
        
        setActiveUnits(combinedUnits);
      } else if (lang === 'en') {
        // English: Generate pattern-backed phrases (same architecture as Portuguese)
        const generatedPhrases = generateAllPhrases(PHRASE_PATTERNS_EN, 8); // 8 per pattern
        
        console.log(`[Practice Loop EN] Pool: ${generatedPhrases.length} generated phrases`);
        
        setActiveUnits(generatedPhrases);
      } else {
        // Fallback to fixed English units
        setActiveUnits(IMITATION_UNITS_EN);
      }
    };
    loadLanguagePreference();
  }, []);

  // Initialize with random unit on mount
  useEffect(() => {
    if (activeUnits.length > 0 && currentUnitId === null) {
      const firstUnit = selectRandomUnit(activeUnits, []);
      setCurrentUnitId(firstUnit.id);
      setRecentUnitIds([firstUnit.id]);
      console.log('[Practice Loop] Random start:', firstUnit.id, firstUnit.text);
    }
  }, [activeUnits, currentUnitId]);

  // Check browser compatibility on mount
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI || !browserSupportsSpeechRecognition) {
      setBrowserSupported(false);
      setSystemNotice({
        message: 'This browser does not support required features. Chrome or Edge recommended.',
        persistent: true
      });
    }
    
    initializeTTS();
    resetConversation();
  }, [browserSupportsSpeechRecognition]);

  // Speech recognition error handling
  useEffect(() => {
    if (browserSupportsSpeechRecognition && typeof SpeechRecognition !== 'undefined') {
      const handleSpeechError = (event) => {
        if (event.error === 'no-speech') {
          setSystemNotice({
            message: 'No speech detected.'
          });
        } else if (event.error === 'audio-capture') {
          setSystemNotice({
            message: 'Microphone unavailable.'
          });
        } else if (event.error === 'not-allowed') {
          setSystemNotice({
            message: 'Microphone permission denied.',
            persistent: true
          });
        }
      };
      
      SpeechRecognition.onerror = handleSpeechError;
    }
  }, [browserSupportsSpeechRecognition]);

  // Handle microphone button press
  const handleMicPress = async () => {
    if (!browserSupported || isProcessing) return;
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsListening(true);
      setUserTranscript('');
      setSystemResponse('');
      resetTranscript();
      
      // Set speech recognition language based on active language
      const language = activeLanguage === 'pt' ? 'pt-BR' : 'en-US';
      SpeechRecognition.startListening({ 
        continuous: true, 
        interimResults: true,
        language: language
      });
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setSystemNotice({
          message: 'Microphone permission denied.'
        });
      } else if (error.name === 'NotFoundError') {
        setSystemNotice({
          message: 'Microphone unavailable.'
        });
      } else {
        setSystemNotice({
          message: 'Microphone unavailable.'
        });
      }
    }
  };

  // Band-based alignment detection
  const checkAlignment = (target, attempt) => {
    // Normalize both strings
    const normalize = (str) => str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    
    const normalizedTarget = normalize(target);
    const normalizedAttempt = normalize(attempt);
    
    // Split into words
    const targetWords = normalizedTarget.split(/\s+/).filter(w => w.length > 0);
    const attemptWords = normalizedAttempt.split(/\s+/).filter(w => w.length > 0);
    
    // Count overlap (how many target words appear in attempt)
    let overlap = 0;
    targetWords.forEach(word => {
      if (attemptWords.includes(word)) {
        overlap++;
      }
    });
    
    // Calculate similarity
    const similarity = targetWords.length > 0 ? overlap / targetWords.length : 0;
    
    // Return band based on similarity
    if (similarity >= 0.85) return 'aligned';
    if (similarity >= 0.55) return 'near';
    return 'off';
  };

  // Handle microphone button release
  const handleMicRelease = () => {
    if (!isListening) return;
    
    setIsListening(false);
    SpeechRecognition.stopListening();
    setIsProcessing(true);

    if (speechFinalizeTimeout.current) {
      clearTimeout(speechFinalizeTimeout.current);
    }

    speechFinalizeTimeout.current = setTimeout(() => {
      speechFinalizeTimeout.current = null;
      const finalTranscript = transcriptRef.current.trim();

      if (finalTranscript) {
        setUserTranscript(finalTranscript);
        setShowSentenceText(true);

        // Mark as engaged (mic used)
        if (!hasEngaged) setHasEngaged(true);

        // Check alignment band with target sentence
        const band = checkAlignment(currentUnit.text, finalTranscript);

        if (band === 'aligned') {
          // Aligned - trigger settle animation
          setJustAligned(true);
          setTimeout(() => setJustAligned(false), 180);
        }
      } else {
        setSystemNotice({
          message: 'No speech detected.'
        });
      }

      setIsProcessing(false);
    }, 300);
  };

  // Handle next button - randomized selection
  const handleNext = () => {
    // Clear state
    setUserTranscript('');
    setSystemResponse('');
    resetTranscript();
    setShowSentenceMeaning(false);
    setPronunciationBubble(null);
    setShowSentenceText(false);
    setHasEngaged(false);
    
    // Select random next unit (avoiding recent)
    const nextUnit = selectRandomUnit(activeUnits, recentUnitIds);
    setCurrentUnitId(nextUnit.id);
    
    // Track recent (keep last 4)
    setRecentUnitIds(prev => {
      const updated = [...prev, nextUnit.id];
      return updated.slice(-4);
    });
    
    console.log('[Practice Loop] Next:', nextUnit.id, nextUnit.text);
  };

  // Toggle sentence meaning
  const toggleSentenceMeaning = () => {
    if (!hasSupportContent) return;
    setShowSentenceMeaning(prev => !prev);
    
    // Mark as engaged (meaning revealed)
    if (!hasEngaged) setHasEngaged(true);
  };

  // Handle bridge to Playground
  const handleTryAnotherShape = () => {
    navigate('/playground', {
      state: {
        guidedMode: true,
        seedSentence: currentUnit.text,
        seedMeaning: currentUnit.meaning,
        icon: currentUnit.icon,
        scene: currentUnit.scene,
        patternId: currentUnit.patternId,
        contextVariations: currentUnit.contextVariations,
        language: currentUnit.language || activeLanguage // Explicit language metadata
      }
    });
  };

  // Portuguese function words (articles, prepositions, common connectors)
  const FUNCTION_WORDS = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'para', 'com', 'sem', 'por', 'pelo', 'pela', 'pelos', 'pelas',
    'ao', 'aos', 'à', 'às', 'num', 'numa', 'nuns', 'numas',
    'e', 'ou', 'mas', 'que', 'se', 'quando', 'onde'
  ]);

  // Check if word is a function word
  const isFunctionWord = (word) => {
    return FUNCTION_WORDS.has(word.toLowerCase().replace(/[.,!?;:'"]/g, ''));
  };

  // Handle word click for pronunciation
  const handleWordClick = (word, event) => {
    if (!hasSupportContent || !currentUnit.words) return;
    
    event.stopPropagation(); // Prevent sentence meaning toggle
    
    // Find word data
    const wordData = currentUnit.words.find(w => w.text === word);
    if (!wordData) return;
    
    // Get click position
    const rect = event.target.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    };
    
    // For function words: show word + pronunciation + meaning
    // For content words: show word + pronunciation only (no English meaning)
    setPronunciationBubble({
      word: wordData.text,
      pronunciation: wordData.pronunciation,
      meaning: isFunctionWord(wordData.text) ? wordData.meaning : null,
      position
    });
  };

  // Handle target sentence audio playback
  const handlePlayTarget = () => {
    const ttsLang = activeLanguage === 'pt' ? 'pt-BR' : 'en-US';
    speak(currentUnit.text, ttsLang);
    
    // Mark as engaged (audio played)
    if (!hasEngaged) setHasEngaged(true);
  };

  // Get language display
  const getLanguageDisplay = () => {
    if (activeLanguage === 'pt') {
      return 'Portuguese';
    }
    return 'English';
  };

  return (
    <div className="imitation-loop navo-shell">
      <NavoNav compact />
      
      {systemNotice && (
        <SystemNotice
          message={systemNotice.message}
          onRetry={systemNotice.onRetry}
          onDismiss={systemNotice.onDismiss || (() => setSystemNotice(null))}
          persistent={systemNotice.persistent}
        />
      )}
      
      <div className="loop-container navo-container">
        <header className="loop-header">
          <div className="loop-top-row">
            <span className="navo-pill"><span className="navo-dot" /> Practice Loop</span>
            <span className="loop-language-tag">{getLanguageDisplay()}</span>
          </div>
          <h1>Listen first. Speak after.</h1>
          <p className="loop-header-copy">Hear a phrase, repeat it, then move to nearby patterns.</p>
        </header>

        <div className="loop-card">
          <div className="audio-first-section">
            <p className="listen-instruction">Listen. Then imitate.</p>
            <button className="play-target-button-prominent" onClick={handlePlayTarget} title="Play target sentence">
              <span className="play-icon">▶</span>
            </button>
          </div>

          {!showSentenceText && (
            <div className="loop-unrevealed-hint">
              Phrase stays hidden until you speak.
            </div>
          )}

          {showSentenceText && (
            <div className="text-reveal-section">
              <div className={`sentence-display ${hasSupportContent ? 'has-support' : ''}`}>
                {hasSupportContent && currentUnit.words ? (
                  currentUnit.words.map((wordData, index) => (
                    <span 
                      key={index}
                      className="word-clickable"
                      onClick={(e) => handleWordClick(wordData.text, e)}
                    >
                      {wordData.text}{index < currentUnit.words.length - 1 ? ' ' : ''}
                    </span>
                  ))
                ) : (
                  currentUnit.text
                )}
              </div>
            </div>
          )}

          {showSentenceMeaning && hasSupportContent && (
            <div className="sentence-meaning">
              {currentUnit.meaning}
            </div>
          )}

          <div className="mic-container">
            <button
              className={`mic-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
              onMouseDown={handleMicPress}
              onMouseUp={handleMicRelease}
              onMouseLeave={handleMicRelease}
              onTouchStart={handleMicPress}
              onTouchEnd={handleMicRelease}
              disabled={!browserSupported || isProcessing}
            >
              <FaMicrophone className="mic-icon" />
            </button>
          </div>

          <div className={`heard-section ${userTranscript ? '' : 'hidden'}`}>
            <span className="heard-label">heard</span>
            <div className={`heard-text ${justAligned ? 'settled' : ''}`}>
              {userTranscript}
            </div>
          </div>

          {systemResponse && systemResponse.trim() && (
            <div className="response-display">
              {systemResponse}
            </div>
          )}

          {userTranscript && (
            <div className="navigation-buttons loop-actions">
              <button
                className="action-chip"
                onClick={toggleSentenceMeaning}
                disabled={!hasSupportContent}
              >
                {showSentenceMeaning ? 'Hide meaning' : 'Show meaning'}
              </button>
              <button className="action-chip" onClick={handleNext}>
                Next phrase
              </button>
              <button
                className="action-chip action-chip-warm"
                onClick={handleTryAnotherShape}
                disabled={!hasSupportContent}
              >
                Explore this pattern
              </button>
            </div>
          )}
        </div>
      </div>

      <NavoFooter />

      {/* Pronunciation Bubble */}
      {pronunciationBubble && (
        <div 
          className="pronunciation-bubble"
          style={{
            position: 'fixed',
            left: `${pronunciationBubble.position.x}px`,
            top: `${pronunciationBubble.position.y}px`,
            transform: 'translateX(-50%)'
          }}
          onClick={() => setPronunciationBubble(null)}
        >
          <div className="bubble-word">{pronunciationBubble.word}</div>
          <div className="bubble-pronunciation">{pronunciationBubble.pronunciation}</div>
          <div className="bubble-meaning">({pronunciationBubble.meaning})</div>
        </div>
      )}

      {/* Bubble backdrop (dismisses bubble) */}
      {pronunciationBubble && (
        <div 
          className="bubble-backdrop"
          onClick={() => setPronunciationBubble(null)}
        />
      )}
    </div>
  );
}

export default ImitationLoop;

