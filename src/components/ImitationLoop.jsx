import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone } from 'react-icons/fa';
import { sendMessage, resetConversation } from '../services/conversation';
import { applyMoveEngine } from '../services/moveEngine';
import { initializeTTS } from '../services/tts';
import { IMITATION_UNITS_EN, IMITATION_UNITS_PT } from '../data/units';
import { getUserPreferences } from '../services/storage';
import HomeArrow from './HomeArrow';
import SystemNotice from './SystemNotice';
import '../styles/ImitationLoop.css';

function ImitationLoop() {
  const navigate = useNavigate();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTranscript, setUserTranscript] = useState('');
  const [systemResponse, setSystemResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [systemNotice, setSystemNotice] = useState(null);
  const [activeUnits, setActiveUnits] = useState(IMITATION_UNITS_EN);
  const [activeLanguage, setActiveLanguage] = useState('en');
  
  // Beginner support state
  const [showSentenceMeaning, setShowSentenceMeaning] = useState(false);
  const [pronunciationBubble, setPronunciationBubble] = useState(null);
  const [hasUsedMeaning, setHasUsedMeaning] = useState(false);
  
  // Alignment animation state
  const [justAligned, setJustAligned] = useState(false);

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const currentUnit = activeUnits[currentIndex];
  const hasSupportContent = currentUnit.words && currentUnit.meaning;

  // Load preferences and set active units
  useEffect(() => {
    const loadLanguagePreference = async () => {
      const prefs = await getUserPreferences();
      const lang = prefs.activeLanguage || 'en';
      setActiveLanguage(lang);
      setActiveUnits(lang === 'pt' ? IMITATION_UNITS_PT : IMITATION_UNITS_EN);
    };
    loadLanguagePreference();
  }, []);

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
  const handleMicRelease = async () => {
    if (!isListening) return;
    
    setIsListening(false);
    SpeechRecognition.stopListening();
    
    if (transcript.trim()) {
      setUserTranscript(transcript);
      setIsProcessing(true);
      
      try {
        // Check alignment band with target sentence
        const band = checkAlignment(currentUnit.text, transcript);
        
        if (band === 'aligned') {
          // Aligned - trigger settle animation, no response
          setSystemResponse('');
          setJustAligned(true);
          setTimeout(() => setJustAligned(false), 180);
          setIsProcessing(false);
        } else if (band === 'near') {
          // Near - no response, no animation, transcript only
          setSystemResponse('');
          setIsProcessing(false);
        } else {
          // Off - show stabilized redirection sentence
          // Call conversation service with imitation mode, language, and target sentence
          const modelDraft = await sendMessage(transcript, { 
            mode: 'imitation',
            language: activeLanguage,
            targetSentence: currentUnit.text
          });
          
          // Apply move engine with imitation mode
          const { finalMessage } = applyMoveEngine(
            modelDraft,
            transcript,
            '', // No learnerLast in imitation loop
            false, // Not opening exchange
            'imitation' // Mode parameter
          );
          
          setSystemResponse(finalMessage);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Error processing:', error);
        setSystemNotice({
          message: 'Response unavailable.',
          onRetry: () => {
            setSystemNotice(null);
            handleMicRelease();
          }
        });
        setIsProcessing(false);
      }
    } else {
      setSystemNotice({
        message: 'No speech detected.'
      });
    }
  };

  // Handle next button
  const handleNext = () => {
    // Clear state
    setUserTranscript('');
    setSystemResponse('');
    resetTranscript();
    setShowSentenceMeaning(false);
    setPronunciationBubble(null);
    
    // Move to next unit (wrap at end)
    setCurrentIndex((prev) => (prev + 1) % activeUnits.length);
  };

  // Toggle sentence meaning
  const toggleSentenceMeaning = () => {
    if (!hasSupportContent) return;
    setShowSentenceMeaning(prev => !prev);
    if (!hasUsedMeaning) setHasUsedMeaning(true);
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
    
    setPronunciationBubble({
      word: wordData.text,
      pronunciation: wordData.pronunciation,
      meaning: wordData.meaning,
      position
    });
  };

  // Get language display
  const getLanguageDisplay = () => {
    if (activeLanguage === 'pt') {
      return 'Portuguese';
    }
    return 'English';
  };

  return (
    <div className="imitation-loop">
      <HomeArrow />
      
      {systemNotice && (
        <SystemNotice
          message={systemNotice.message}
          onRetry={systemNotice.onRetry}
          onDismiss={systemNotice.onDismiss || (() => setSystemNotice(null))}
          persistent={systemNotice.persistent}
        />
      )}
      
      <div className="loop-container">
        {/* Language context */}
        <div className="language-context">
          {getLanguageDisplay()}
        </div>

        {/* Target Sentence (clickable for meaning, words clickable for pronunciation) */}
        <div 
          className={`sentence-display ${hasSupportContent ? 'has-support' : ''}`}
          onClick={toggleSentenceMeaning}
        >
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

        {/* Sentence Meaning (revealed on click) */}
        {showSentenceMeaning && hasSupportContent && (
          <div className="sentence-meaning">
            {currentUnit.meaning}
          </div>
        )}

        {/* Tap hint (subtle, fades after first use) */}
        {hasSupportContent && !hasUsedMeaning && !userTranscript && (
          <div className="meaning-hint">tap for meaning</div>
        )}

        {/* Microphone Button */}
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

        {/* Heard Utterance (with label and optional settle animation) */}
        {userTranscript && (
          <div className="heard-section">
            <span className="heard-label">heard</span>
            <div className={`heard-text ${justAligned ? 'settled' : ''}`}>{userTranscript}</div>
          </div>
        )}

        {/* System Response (only when not aligned) */}
        {systemResponse && systemResponse.trim() && (
          <div className="response-display">
            {systemResponse}
          </div>
        )}

        {/* Next Button (shows after attempt, regardless of alignment) */}
        {userTranscript && (
          <button className="next-button" onClick={handleNext}>
            next →
          </button>
        )}
      </div>

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
