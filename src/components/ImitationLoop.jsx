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

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const currentUnit = activeUnits[currentIndex];

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
      SpeechRecognition.startListening({ continuous: true, interimResults: true });
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

  // Handle microphone button release
  const handleMicRelease = async () => {
    if (!isListening) return;
    
    setIsListening(false);
    SpeechRecognition.stopListening();
    
    if (transcript.trim()) {
      setUserTranscript(transcript);
      setIsProcessing(true);
      
      try {
        // Call conversation service with imitation mode and language
        const modelDraft = await sendMessage(transcript, { 
          mode: 'imitation',
          language: activeLanguage
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
      } catch (error) {
        console.error('Error processing:', error);
        setSystemNotice({
          message: 'Response unavailable.',
          onRetry: () => {
            setSystemNotice(null);
            handleMicRelease();
          }
        });
      } finally {
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
    
    // Move to next unit (wrap at end)
    setCurrentIndex((prev) => (prev + 1) % activeUnits.length);
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
        {/* Current Sentence */}
        <div className="sentence-display">
          {currentUnit.text}
        </div>

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

        {/* Heard Utterance (shown after user speaks, before response) */}
        {userTranscript && (
          <div className="heard-utterance">
            {userTranscript}
          </div>
        )}

        {/* System Response */}
        {systemResponse && (
          <div className="response-display">
            {systemResponse}
          </div>
        )}

        {/* Next Button */}
        {systemResponse && (
          <button className="next-button" onClick={handleNext}>
            next →
          </button>
        )}
      </div>
    </div>
  );
}

export default ImitationLoop;
