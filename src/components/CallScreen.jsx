import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaPhone, FaHistory, FaUser } from 'react-icons/fa';
import { sendMessage, resetConversation, setOpeningContext } from '../services/conversation';
import { speak, stopSpeaking, initializeTTS } from '../services/tts';
import { applyMoveEngine } from '../services/moveEngine';
import { getWordMeaning } from '../services/wordMeaning';
import { isReusableSentence } from '../services/sentenceUtils';
import { generatePlaygroundSentence } from '../services/conversationSummary';
import {
  initStorage, 
  createSession, 
  addExchange, 
  closeSession,
  getLastLanguage, 
  saveLastLanguage,
  getImmersionProfile,
  saveImmersionProfile
} from '../services/storage';
import { analyzeSession, updateProfile, getDefaultProfile, detectStructuralMoves } from '../services/immersionProfile';
import SystemNotice from './SystemNotice';
import MeaningBubble from './MeaningBubble';
import HomeArrow from './HomeArrow';
import '../styles/CallScreen.css';

function CallScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isListening, setIsListening] = useState(false);
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [previousExchange, setPreviousExchange] = useState({ user: '', ai: '' });
  const [systemNotice, setSystemNotice] = useState(null);
  
  // Phase 7: Track learner_last for Move Engine
  const [learnerLast, setLearnerLast] = useState('');
  
  // Phase 11: Comprehension Layer
  const [meaningBubble, setMeaningBubble] = useState(null);
  
  // Phase 5: Timing and session tracking (in-memory only)
  const turnGapsRef = useRef([]); // Capped at 30, never persisted
  const lastUserEndRef = useRef(null); // Timestamp of last mic release
  const userUtterancesRef = useRef([]); // Text only for analysis
  const sessionStartTimeRef = useRef(null); // Session start timestamp
  const sessionFinalizedRef = useRef(false); // Ensure finalize runs once
  const inactivityTimerRef = useRef(null); // 4-minute inactivity timer
  const hiddenTimerRef = useRef(null); // Visibility change delayed timer
  const openingSentenceProcessedRef = useRef(false); // Prevent double opening send

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

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
    
    // Initialize TTS
    initializeTTS();
    
    // Initialize storage and get last language
    const init = async () => {
      await initStorage();
      const lastLang = await getLastLanguage();
      setCurrentLanguage(lastLang);
      
      // PHASE 14 FIX: Auto-start session if opening sentence exists
      if (location.state?.openingSentence) {
        // Skip welcome screen, start session directly
        setSessionStarted(true);
        setExchangeCount(0);
        resetConversation();
        
        // Reset session tracking
        sessionFinalizedRef.current = false;
        turnGapsRef.current = [];
        userUtterancesRef.current = [];
        lastUserEndRef.current = null;
        sessionStartTimeRef.current = Date.now();
        
        // Create session
        const newSessionId = await createSession(lastLang);
        setSessionId(newSessionId);
      }
    };
    init();
  }, [browserSupportsSpeechRecognition]);

  // Network connectivity detection
  useEffect(() => {
    const handleOffline = () => {
      setSystemNotice({
        message: 'Connection lost.',
        persistent: true,
        onDismiss: () => setSystemNotice(null)
      });
    };
    
    const handleOnline = () => {
      setSystemNotice(null);
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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

  // Phase 5: Finalize session (analyze and update profile)
  const finalizeSession = async () => {
    if (sessionFinalizedRef.current) return; // Already finalized
    sessionFinalizedRef.current = true;
    
    // Clear timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (hiddenTimerRef.current) {
      clearTimeout(hiddenTimerRef.current);
      hiddenTimerRef.current = null;
    }
    
    // Only analyze sessions with >=4 turns
    if (exchangeCount >= 4 && userUtterancesRef.current.length >= 4) {
      const sessionDuration = Date.now() - sessionStartTimeRef.current;
      
      // Phase 8: Detect structural moves (always, even if analysis fails)
      const moveCounts = detectStructuralMoves(userUtterancesRef.current);
      
      // Phase 8 Debug logging
      console.log("Phase8 moveCounts:", moveCounts);
      
      // Get current profile
      let currentProfile = await getImmersionProfile();
      if (!currentProfile) {
        currentProfile = getDefaultProfile();
      }
      
      // Ensure structuralMoves exists
      if (!currentProfile.structuralMoves) {
        currentProfile.structuralMoves = {
          past: 0,
          future: 0,
          cause: 0,
          conditional: 0,
          contrast: 0,
          question: 0
        };
      }
      
      console.log("Profile before:", currentProfile.structuralMoves);
      
      // Phase 8: Aggregate moveCounts directly (Option A)
      const updatedProfile = { ...currentProfile };
      updatedProfile.structuralMoves = {
        past: currentProfile.structuralMoves.past + moveCounts.past,
        future: currentProfile.structuralMoves.future + moveCounts.future,
        cause: currentProfile.structuralMoves.cause + moveCounts.cause,
        conditional: currentProfile.structuralMoves.conditional + moveCounts.conditional,
        contrast: currentProfile.structuralMoves.contrast + moveCounts.contrast,
        question: currentProfile.structuralMoves.question + moveCounts.question
      };
      
      console.log("Profile after moves:", updatedProfile.structuralMoves);
      
      // Try to analyze session for depth/dimension updates
      const analysis = analyzeSession(
        userUtterancesRef.current,
        sessionDuration,
        turnGapsRef.current
      );
      
      if (analysis) {
        // Apply depth/dimension updates WITHOUT adding moves again
        const profileWithDimensions = updateProfile(analysis, updatedProfile, null);
        updatedProfile.depth = profileWithDimensions.depth;
        updatedProfile.dimensions = profileWithDimensions.dimensions;
        updatedProfile.sessionCount = profileWithDimensions.sessionCount;
        
        console.log('Session analysis:', analysis);
      } else {
        // No analysis, just increment session count
        updatedProfile.sessionCount = currentProfile.sessionCount + 1;
      }
      
      // Always update lastUpdated
      updatedProfile.lastUpdated = Date.now();
      
      // Save profile (moves + depth/dimensions)
      await saveImmersionProfile(updatedProfile);
      
      console.log('Profile updated and saved:', updatedProfile);
    }
    
    // Clear in-memory data
    turnGapsRef.current = [];
    userUtterancesRef.current = [];
    lastUserEndRef.current = null;
  };

  // Phase 5: Component unmount cleanup (route navigation)
  useEffect(() => {
    return () => {
      if (sessionId && !sessionFinalizedRef.current && exchangeCount >= 4) {
        finalizeSession();
      }
    };
  }, [sessionId, exchangeCount]);

  // Phase 5: Visibility change handler with delayed timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Start 75-second delayed timer
        hiddenTimerRef.current = setTimeout(() => {
          if (document.hidden && sessionId && !sessionFinalizedRef.current && exchangeCount >= 4) {
            finalizeSession();
          }
        }, 75000); // 75 seconds
      } else {
        // User returned - cancel timer
        if (hiddenTimerRef.current) {
          clearTimeout(hiddenTimerRef.current);
          hiddenTimerRef.current = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
      }
    };
  }, [sessionId, exchangeCount]);

  // Handle microphone button press (start listening)
  const handleMicPress = async () => {
    if (!browserSupported || isProcessing || isSpeaking) return;
    
    // Phase 5: Record turn gap (time from last mic release to now)
    if (lastUserEndRef.current) {
      const gap = Date.now() - lastUserEndRef.current;
      turnGapsRef.current.push(gap);
      if (turnGapsRef.current.length > 30) {
        turnGapsRef.current.shift(); // Keep only last 30
      }
    }
    
    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Check microphone permission before starting
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsListening(true);
      setUserText('');
      setAiText('');
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

  // Handle microphone button release (stop listening & process)
  const handleMicRelease = async () => {
    if (!isListening) return;
    
    setIsListening(false);
    SpeechRecognition.stopListening();
    
    // Mark as interacted on first use
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    // Process the transcript
    if (transcript.trim()) {
      setUserText(transcript);
      setIsProcessing(true);
      
      try {
        // Send to AI (get model draft - never stored or spoken)
        const modelDraft = await sendMessage(transcript);
        
        // Phase 7: Apply Move Engine governance
        const { finalMessage, metadata } = applyMoveEngine(
          modelDraft,
          transcript,
          learnerLast,
          false  // Not an opening exchange, this is a follow-up
        );
        
        // Log if modified (for debugging)
        if (metadata.wasModified) {
          console.log('Move Engine applied:', metadata);
        }
        
        // Move current exchange to previous before setting new
        setPreviousExchange({ user: userText, ai: aiText });
        
        // Use governed final message (not draft)
        setAiText(finalMessage);
        
        // Increment exchange count
        setExchangeCount(prev => prev + 1);
        
        // Phase 5: Track user utterance for analysis
        userUtterancesRef.current.push(transcript);
        
        // Phase 7: Update learner_last for next turn
        setLearnerLast(transcript);
        
        // Write governed exchange to storage (not draft)
        await addExchange(sessionId, transcript, finalMessage);
        
        // Speak governed response (not draft)
        setIsSpeaking(true);
        await speak(finalMessage);
        setIsSpeaking(false);
      } catch (error) {
        console.error('Error processing conversation:', error);
        // Show error as peripheral notice, not in chat
        setSystemNotice({
          message: 'Response unavailable.',
          onRetry: () => {
            setSystemNotice(null);
            handleMicRelease(); // Retry the same transcript
          }
        });
        setIsSpeaking(false);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Handle empty transcript
      if (hasInteracted) {
        setSystemNotice({
          message: 'No speech detected.'
        });
      }
      setIsProcessing(false);
    }
    
    // Phase 5: Set lastUserEnd timestamp and start inactivity timer
    lastUserEndRef.current = Date.now();
    
    // Start 4-minute inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      if (sessionId && !sessionFinalizedRef.current && exchangeCount >= 4) {
        finalizeSession();
      }
    }, 240000); // 4 minutes
  };

  // Handle end call
  const handleEndCall = async () => {
    SpeechRecognition.stopListening();
    stopSpeaking();
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setSessionEnded(true);
    setUserText('');
    setAiText('');
    resetConversation();
    
    // Phase 5: Finalize session before closing
    await finalizeSession();
    
    // Close session and save language
    if (sessionId) {
      await closeSession(sessionId);
      await saveLastLanguage(currentLanguage);
    }
  };

  // Handle start conversation from welcome
  const handleStartConversation = async () => {
    setSessionStarted(true);
    setExchangeCount(0);
    resetConversation();
    
    // Phase 5: Reset session tracking
    sessionFinalizedRef.current = false;
    turnGapsRef.current = [];
    userUtterancesRef.current = [];
    lastUserEndRef.current = null;
    sessionStartTimeRef.current = Date.now();
    
    // Create new session
    const newSessionId = await createSession(currentLanguage);
    setSessionId(newSessionId);
  };
  
  // Phase 10: Auto-send opening sentence from playground
  const handleAutoSendOpening = async (openingSentence) => {
    if (openingSentenceProcessedRef.current && isProcessing) return;

    openingSentenceProcessedRef.current = true;
    setUserText(openingSentence);
    setAiText(''); // avoid stale text while we wait
    setIsProcessing(true);
    setHasInteracted(true);
    
    // PHASE 14: Set opening context for conversation grounding
    setOpeningContext(openingSentence);
    
    try {
      // Send to AI
      const modelDraft = await sendMessage(openingSentence);
      
      // Apply Move Engine governance - mark as opening exchange
      const { finalMessage, metadata } = applyMoveEngine(
        modelDraft,
        openingSentence,
        learnerLast,
        true  // This IS the opening exchange
      );
      
      if (metadata.wasModified) {
        console.log('Move Engine applied:', metadata);
      }
      
      setAiText(finalMessage);
      setExchangeCount(prev => prev + 1);
      
      // Track user utterance
      userUtterancesRef.current.push(openingSentence);
      setLearnerLast(openingSentence);
      
      // Store exchange
      await addExchange(sessionId, openingSentence, finalMessage);
      
      // Speak response
      setIsSpeaking(true);
      await speak(finalMessage);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error processing opening sentence:', error);
      setSystemNotice({
        message: 'Response unavailable.',
        onRetry: () => {
          setSystemNotice(null);
          handleAutoSendOpening(openingSentence);
        }
      });
      setIsSpeaking(false);
    } finally {
      setIsProcessing(false);
      lastUserEndRef.current = Date.now();
    }
  };
  
  // Phase 10: Check for opening sentence from playground
  useEffect(() => {
    if (location.state?.openingSentence && sessionStarted && sessionId && !openingSentenceProcessedRef.current) {
      openingSentenceProcessedRef.current = true;
      const openingSentence = location.state.openingSentence;
      
      // Auto-send opening sentence
      handleAutoSendOpening(openingSentence);
      
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sessionStarted, sessionId]);

  // Handle start new call
  const handleStartNewCall = async () => {
    openingSentenceProcessedRef.current = false;
    setSessionEnded(false);
    setSessionStarted(true);
    setUserText('');
    setAiText('');
    setExchangeCount(0);
    resetTranscript();
    resetConversation();
    
    // Phase 5: Reset session tracking
    sessionFinalizedRef.current = false;
    turnGapsRef.current = [];
    userUtterancesRef.current = [];
    lastUserEndRef.current = null;
    sessionStartTimeRef.current = Date.now();
    
    // Create new session
    const newSessionId = await createSession(currentLanguage);
    setSessionId(newSessionId);
  };

  // Phase 11: Handle word click for meaning
  const handleWordClick = async (word, messageText, event) => {
    // Dismiss previous bubble
    setMeaningBubble(null);
    
    const cleanWord = word.replace(/[.,!?;:'"]/g, '');
    if (!cleanWord) return;
    
    const rect = event.target.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    };
    
    // Show loading bubble immediately
    setMeaningBubble({ word: cleanWord, meaning: "loading...", position });
    
    const meaning = await getWordMeaning(cleanWord, messageText);
    
    setMeaningBubble({ 
      word: cleanWord, 
      meaning: meaning || "meaning unavailable", 
      position 
    });
  };

  // Phase 11: Handle replay AI message
  const handleReplayMessage = (text) => {
    // Only replay if not currently listening or processing
    if (!isListening && !isProcessing) {
      speak(text);
    }
  };

  // Handle back to home - navigate to landing page
  const handleBackToHome = () => {
    openingSentenceProcessedRef.current = false;
    SpeechRecognition.stopListening();
    stopSpeaking();
    setMeaningBubble(null);
    resetConversation();
    
    // Clear session tracking
    sessionFinalizedRef.current = false;
    turnGapsRef.current = [];
    userUtterancesRef.current = [];
    lastUserEndRef.current = null;
    
    // Navigate to landing page
    navigate('/');
  };

  // Phase 15: Handle continue in Playground
  const handleContinueInPlayground = async () => {
    // Get sentence for Playground
    let sentence;
    
    // Check if last user utterance is reusable
    const lastUtterance = userUtterancesRef.current[userUtterancesRef.current.length - 1];
    if (isReusableSentence(lastUtterance)) {
      sentence = lastUtterance;
    } else {
      // Generate fallback from conversation
      sentence = await generatePlaygroundSentence(userUtterancesRef.current);
    }
    
    // Navigate to Playground with sentence
    navigate('/playground', {
      state: { returnSentence: sentence }
    });
  };

  // Show welcome screen (pre-conversation)
  if (!sessionStarted && !sessionEnded) {
    return (
      <div className="call-screen">
        <div className="welcome-container">
          <div className="icon-group">
            <button className="history-icon" onClick={() => navigate('/sessions')}>
              <FaHistory />
            </button>
            <button className="account-icon" onClick={() => navigate('/account')}>
              <FaUser />
            </button>
          </div>
          
          <button className="start-conversation-btn" onClick={handleStartConversation}>
            Start Conversation
          </button>
        </div>
      </div>
    );
  }

  // Show session ended screen
  if (sessionEnded) {
    return (
      <div className="call-screen">
        <div className="session-ended">
          <div className="icon-group">
            <button className="history-icon" onClick={() => navigate('/sessions')}>
              <FaHistory />
            </button>
            <button className="account-icon" onClick={() => navigate('/account')}>
              <FaUser />
            </button>
          </div>
          <h1>Session complete</h1>
          {exchangeCount > 0 && (
            <p>You spoke for {exchangeCount} exchange{exchangeCount !== 1 ? 's' : ''}.</p>
          )}
          <div className="session-end-actions">
            <button className="new-call-btn" onClick={handleStartNewCall}>
              Start Another Conversation
            </button>
            <button className="continue-playground-btn" onClick={handleContinueInPlayground}>
              Continue in Playground →
            </button>
            <button className="back-home-btn" onClick={handleBackToHome}>
              Exit to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="call-screen" data-state={isListening ? 'listening' : isProcessing ? 'processing' : isSpeaking ? 'speaking' : 'idle'}>
      {/* Phase 15: Home Arrow */}
      <HomeArrow />
      
      {/* System Notice (appears above conversation) */}
      {systemNotice && (
        <SystemNotice
          message={systemNotice.message}
          onRetry={systemNotice.onRetry}
          onDismiss={systemNotice.onDismiss || (() => setSystemNotice(null))}
          persistent={systemNotice.persistent}
        />
      )}
      
      <div className="call-container">
        <div className="header">
          <div className="icon-group">
            <button className="history-icon" onClick={() => navigate('/sessions')}>
              <FaHistory />
            </button>
            <button className="account-icon" onClick={() => navigate('/account')}>
              <FaUser />
            </button>
          </div>
          <h1>The Room</h1>
        </div>

        {/* Conversation Area */}
        <div className="conversation-area">
          {/* Previous exchange as ghost layer */}
          {previousExchange.user && (
            <>
              <div className="conversation-text user-text ghost">{previousExchange.user}</div>
              <div className="conversation-text ai-text ghost">{previousExchange.ai}</div>
            </>
          )}
          
          {/* Current exchange */}
          {isListening && transcript && (
            <div className="conversation-text user-text">{transcript}</div>
          )}
          
          {userText && !isListening && (
            <div className="conversation-text user-text">{userText}</div>
          )}
          
          {aiText && (
            <div className="ai-message-container">
              <button 
                className="replay-button"
                onClick={() => handleReplayMessage(aiText)}
                disabled={isListening || isProcessing}
                aria-label="Replay message"
                title="Replay message"
              >
                🔊
              </button>
              <div className="conversation-text ai-text">
                {aiText.split(/\s+/).map((word, i) => (
                  <span 
                    key={i}
                    className="tappable-word"
                    onClick={(e) => handleWordClick(word, aiText, e)}
                  >
                    {word}{i < aiText.split(/\s+/).length - 1 ? ' ' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Microphone Button */}
        <div className="mic-container">
          <button
            className={`mic-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} ${isSpeaking ? 'speaking' : ''}`}
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onMouseLeave={handleMicRelease}
            onTouchStart={handleMicPress}
            onTouchEnd={handleMicRelease}
            disabled={!browserSupported || isProcessing || isSpeaking}
          >
            <FaMicrophone className="mic-icon" />
          </button>
          
          {/* Only show invitation on first idle */}
          {!hasInteracted && !isListening && !isProcessing && !isSpeaking && (
            <p className="mic-invitation">Hold to speak</p>
          )}
        </div>

        {/* End Call Button */}
        <button className="end-call-btn" onClick={handleEndCall}>
          <FaPhone className="phone-icon" />
          End Call
        </button>
      </div>

      {/* Phase 11: Meaning Bubble */}
      {meaningBubble && (
        <MeaningBubble 
          word={meaningBubble.word}
          meaning={meaningBubble.meaning}
          position={meaningBubble.position}
          onDismiss={() => setMeaningBubble(null)}
        />
      )}
    </div>
  );
}

export default CallScreen;
