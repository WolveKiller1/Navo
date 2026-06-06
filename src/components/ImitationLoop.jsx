import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaPlay, FaPause, FaRegEye, FaRegCompass } from 'react-icons/fa';
import { resetConversation } from '../services/conversation';
import { initializeTTS, speak } from '../services/tts';
import { IMITATION_UNITS_EN, IMITATION_UNITS_PT } from '../data/units';
import { PHRASE_PATTERNS_PT, PHRASE_PATTERNS_EN } from '../data/phrasePatterns';
import { generateAllPhrases } from '../services/phraseGenerator';
import {
  getRecurringPracticeLoopPhraseTexts,
  getUserPreferences,
  initStorage,
  recordExposureTrace
} from '../services/storage';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import SystemNotice from './SystemNotice';
import '../styles/ImitationLoop.css';

function ImitationLoop() {
  const navigate = useNavigate();

  const selectRandomUnit = (units, recentIds) => {
    const available = units.filter((u) => !recentIds.includes(u.id));
    if (available.length === 0) return units[Math.floor(Math.random() * units.length)];
    return available[Math.floor(Math.random() * available.length)];
  };

  const [currentUnitId, setCurrentUnitId] = useState(null);
  const [recentUnitIds, setRecentUnitIds] = useState([]);
  const [userTranscript, setUserTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [systemNotice, setSystemNotice] = useState(null);
  const [activeUnits, setActiveUnits] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [showSentenceMeaning, setShowSentenceMeaning] = useState(false);
  const [pronunciationBubble, setPronunciationBubble] = useState(null);
  const [hasEngaged, setHasEngaged] = useState(false);
  const [showSentenceText, setShowSentenceText] = useState(false);
  const [isPlayingTarget, setIsPlayingTarget] = useState(false);
  const transcriptRef = useRef('');
  const bestTranscriptRef = useRef('');
  const speechFinalizeTimeout = useRef(null);
  const playbackTimeout = useRef(null);

  const speechOptions = { language: activeLanguage === 'en' ? 'en-US' : 'pt-BR' };
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition(speechOptions);

  useEffect(() => {
    transcriptRef.current = transcript;
    // Track the best/fullest transcript available
    // Update if new transcript is longer, or if it's a refinement (has words we saw before plus new words)
    if (transcript.length > bestTranscriptRef.current.length) {
      bestTranscriptRef.current = transcript;
    } else if (
      transcript.length > 0 &&
      transcript !== bestTranscriptRef.current &&
      transcript.toLowerCase().includes(bestTranscriptRef.current.toLowerCase())
    ) {
      // If new transcript contains the best one and adds punctuation/refinement, update it
      bestTranscriptRef.current = transcript;
    }
  }, [transcript]);

  useEffect(() => () => {
    if (speechFinalizeTimeout.current) clearTimeout(speechFinalizeTimeout.current);
    if (playbackTimeout.current) clearTimeout(playbackTimeout.current);
  }, []);

  const currentUnit = activeUnits.find((u) => u.id === currentUnitId) || activeUnits[0] || {};
  const hasSupportContent = currentUnit && currentUnit.words && currentUnit.meaning;

  const findRecurringUnit = async () => {
    const recurringTexts = await getRecurringPracticeLoopPhraseTexts(activeLanguage, { max: 8 });
    if (!recurringTexts.length || Math.random() > 0.28) return null;

    const recurringSet = new Set(recurringTexts.map((text) => text.trim().toLowerCase()));
    const availableUnits = activeUnits.filter((unit) => !recentUnitIds.includes(unit.id));

    return availableUnits.find((unit) => recurringSet.has(String(unit.text || '').trim().toLowerCase())) || null;
  };

  useEffect(() => {
    const loadLanguagePreference = async () => {
      await initStorage();
      const prefs = await getUserPreferences();
      const lang = prefs.activeLanguage || 'en';
      setActiveLanguage(lang);

      if (lang === 'pt') {
        const validPatternIds = PHRASE_PATTERNS_PT.map((p) => p.id);
        const backedFixedUnits = IMITATION_UNITS_PT.filter((unit) => unit.contextVariations || (unit.patternId && validPatternIds.includes(unit.patternId)));
        const generatedPhrases = generateAllPhrases(PHRASE_PATTERNS_PT, 8);
        setActiveUnits([...backedFixedUnits, ...generatedPhrases]);
      } else if (lang === 'en') {
        const generatedPhrases = generateAllPhrases(PHRASE_PATTERNS_EN, 8);
        setActiveUnits(generatedPhrases);
      } else {
        setActiveUnits(IMITATION_UNITS_EN);
      }
    };
    loadLanguagePreference();
  }, []);

  useEffect(() => {
    if (activeUnits.length > 0 && currentUnitId === null) {
      const firstUnit = selectRandomUnit(activeUnits, []);
      setCurrentUnitId(firstUnit.id);
      setRecentUnitIds([firstUnit.id]);
    }
  }, [activeUnits, currentUnitId]);

  useEffect(() => {
    if (!currentUnit?.text) return;
    recordExposureTrace({
      sourceEnvironment: 'practice-loop',
      text: currentUnit.text,
      interactionType: 'encountered',
      language: currentUnit.language || activeLanguage
    });
  }, [currentUnit?.id, currentUnit?.text]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI || !browserSupportsSpeechRecognition) {
      setBrowserSupported(false);
      setSystemNotice({ message: 'This browser does not support required features. Chrome or Edge recommended.', persistent: true });
    }

    initializeTTS();
    resetConversation();
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (browserSupportsSpeechRecognition && typeof SpeechRecognition !== 'undefined') {
      SpeechRecognition.onerror = (event) => {
        if (event.error === 'no-speech') setSystemNotice({ message: 'No speech detected.' });
        else if (event.error === 'audio-capture') setSystemNotice({ message: 'Microphone unavailable.' });
        else if (event.error === 'not-allowed') setSystemNotice({ message: 'Microphone permission denied.', persistent: true });
      };
    }
  }, [browserSupportsSpeechRecognition]);

  const handleMicPress = async () => {
    if (!browserSupported || isProcessing) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      setUserTranscript('');
      transcriptRef.current = '';
      bestTranscriptRef.current = '';
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, interimResults: true, language: activeLanguage === 'pt' ? 'pt-BR' : 'en-US' });
    } catch {
      setSystemNotice({ message: 'Microphone unavailable.' });
    }
  };

  const handleMicRelease = () => {
    if (!isListening) return;
    setIsListening(false);
    SpeechRecognition.stopListening();
    setIsProcessing(true);

    if (speechFinalizeTimeout.current) clearTimeout(speechFinalizeTimeout.current);

    // Wait longer for longer sentences and to ensure final transcript is captured
    // The browser may continue updating the transcript after stopListening() is called
    speechFinalizeTimeout.current = setTimeout(() => {
      speechFinalizeTimeout.current = null;
      // Use the best/longest transcript available
      const finalTranscript = (bestTranscriptRef.current || transcriptRef.current).trim();
      if (finalTranscript) {
        setUserTranscript(finalTranscript);
        setShowSentenceText(true);
        if (!hasEngaged) setHasEngaged(true);
        recordExposureTrace({
          sourceEnvironment: 'practice-loop',
          text: currentUnit.text,
          interactionType: 'repeated',
          language: currentUnit.language || activeLanguage
        });
        recordExposureTrace({
          sourceEnvironment: 'practice-loop',
          text: currentUnit.text,
          interactionType: 'revealed',
          language: currentUnit.language || activeLanguage
        });
      } else {
        setSystemNotice({ message: 'No speech detected.' });
      }
      setIsProcessing(false);
    }, 1200);
  };

  const handleNext = async () => {
    setUserTranscript('');
    resetTranscript();
    setShowSentenceMeaning(false);
    setPronunciationBubble(null);
    setShowSentenceText(false);
    setHasEngaged(false);

    const recurringUnit = await findRecurringUnit();
    const nextUnit = recurringUnit || selectRandomUnit(activeUnits, recentUnitIds);
    setCurrentUnitId(nextUnit.id);
    setRecentUnitIds((prev) => [...prev, nextUnit.id].slice(-4));
  };

  const toggleSentenceMeaning = () => {
    if (!hasSupportContent) return;
    setShowSentenceMeaning((prev) => {
      const next = !prev;
      if (next) {
        recordExposureTrace({
          sourceEnvironment: 'practice-loop',
          text: currentUnit.text,
          interactionType: 'seen',
          language: currentUnit.language || activeLanguage
        });
      }
      return next;
    });
    if (!hasEngaged) setHasEngaged(true);
  };

  const handleTryAnotherShape = () => {
    recordExposureTrace({
      sourceEnvironment: 'practice-loop',
      text: currentUnit.text,
      interactionType: 'carried',
      language: currentUnit.language || activeLanguage
    });
    navigate('/playground', {
      state: {
        guidedMode: true,
        seedSentence: currentUnit.text,
        seedMeaning: currentUnit.meaning,
        icon: currentUnit.icon,
        scene: currentUnit.scene,
        patternId: currentUnit.patternId,
        contextVariations: currentUnit.contextVariations,
        language: currentUnit.language || activeLanguage
      }
    });
  };

  const FUNCTION_WORDS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'sem', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'ao', 'aos', 'à', 'às', 'num', 'numa', 'nuns', 'numas', 'e', 'ou', 'mas', 'que', 'se', 'quando', 'onde']);
  const isFunctionWord = (word) => FUNCTION_WORDS.has(word.toLowerCase().replace(/[.,!?;:'"]/g, ''));

  const handleWordClick = (word, event) => {
    if (!hasSupportContent || !currentUnit.words) return;
    event.stopPropagation();

    const wordData = currentUnit.words.find((w) => w.text === word);
    if (!wordData) return;

    const rect = event.target.getBoundingClientRect();
    setPronunciationBubble({
      word: wordData.text,
      pronunciation: wordData.pronunciation,
      meaning: isFunctionWord(wordData.text) ? wordData.meaning : null,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + 8 }
    });
  };

  // Render the full target sentence with clickable word support where metadata exists
  const renderTargetSentence = () => {
    if (!currentUnit.text) return '';

    const textTokens = currentUnit.text.split(/(\s+)/);
    
    return textTokens.map((token, index) => {
      // Preserve whitespace tokens as-is
      if (/^\s+$/.test(token)) {
        return token;
      }

      // Check if this token has metadata in currentUnit.words
      let hasWordData = false;
      if (hasSupportContent && currentUnit.words) {
        hasWordData = currentUnit.words.some((w) => w.text === token);
      }

      if (hasWordData) {
        return (
          <span
            key={index}
            className="word-clickable"
            onClick={(e) => handleWordClick(token, e)}
            style={{ cursor: 'pointer' }}
          >
            {token}
          </span>
        );
      }

      return <span key={index}>{token}</span>;
    });
  };

  const handlePlayTarget = () => {
    if (isPlayingTarget) return;
    setIsPlayingTarget(true);
    recordExposureTrace({
      sourceEnvironment: 'practice-loop',
      text: currentUnit.text,
      interactionType: 'heard',
      language: currentUnit.language || activeLanguage
    });
    
    // Estimate playback duration based on text length
    const estimatedDuration = Math.max(currentUnit.text.length * 50, 1000);
    
    // Try to use speechSynthesis events if available
    const utterance = new SpeechSynthesisUtterance(currentUnit.text);
    const lang = activeLanguage === 'pt' ? 'pt-BR' : 'en-US';
    utterance.lang = lang;
    
    utterance.onend = () => {
      setIsPlayingTarget(false);
      if (playbackTimeout.current) clearTimeout(playbackTimeout.current);
    };
    
    // Fallback timeout in case onend doesn't fire
    if (playbackTimeout.current) clearTimeout(playbackTimeout.current);
    playbackTimeout.current = setTimeout(() => {
      setIsPlayingTarget(false);
      playbackTimeout.current = null;
    }, estimatedDuration);
    
    speak(currentUnit.text, lang);
    if (!hasEngaged) setHasEngaged(true);
  };

  return (
    <div className="imitation-loop navo-shell">
      <NavoNav compact />
      {systemNotice && <SystemNotice message={systemNotice.message} onDismiss={systemNotice.onDismiss || (() => setSystemNotice(null))} persistent={systemNotice.persistent} />}

      <main className="loop-container navo-container navo-container--immersive">
        <span className="navo-pill"><span className="navo-dot" /> Practice Loop</span>

        <div className="loop-phrase-wrap navo-reveal">
          {showSentenceText ? (
            <p className="loop-phrase">
              {renderTargetSentence()}
            </p>
          ) : (
            <p className="loop-phrase hidden-hint">Phrase stays hidden until you speak.</p>
          )}
          {showSentenceMeaning && hasSupportContent && <p className="loop-meaning navo-reveal">{currentUnit.meaning}</p>}
        </div>

        <button className={`loop-play-btn ${isPlayingTarget ? 'playing' : ''}`} onClick={handlePlayTarget} title="Play target sentence">
          {isPlayingTarget ? <FaPause /> : <FaPlay />}
        </button>

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
          <p className="mic-state">{isListening ? 'Listening...' : 'Hold to speak'}</p>
        </div>

        {userTranscript && <p className="heard-line">{userTranscript}</p>}

        {hasEngaged && (
          <div className="loop-actions">
            <button className="action-chip" onClick={toggleSentenceMeaning} disabled={!hasSupportContent}>
              <FaRegEye /> {showSentenceMeaning ? 'Hide meaning' : 'Show meaning'}
            </button>
            <button className="action-chip" onClick={handleNext}>Next phrase</button>
            <div style={{ width: '100%' }} />
            <button className="action-link-warm" onClick={handleTryAnotherShape} disabled={!hasSupportContent}>
              <FaRegCompass /> Explore this pattern
            </button>
          </div>
        )}
      </main>

      <NavoFooter />

      {pronunciationBubble && (
        <>
          <div className="pronunciation-bubble" style={{ position: 'fixed', left: `${pronunciationBubble.position.x}px`, top: `${pronunciationBubble.position.y}px`, transform: 'translateX(-50%)' }} onClick={() => setPronunciationBubble(null)}>
            <div className="bubble-word">{pronunciationBubble.word}</div>
            <div className="bubble-pronunciation">{pronunciationBubble.pronunciation}</div>
            {pronunciationBubble.meaning && <div className="bubble-meaning">({pronunciationBubble.meaning})</div>}
          </div>
          <div className="bubble-backdrop" onClick={() => setPronunciationBubble(null)} />
        </>
      )}
    </div>
  );
}

export default ImitationLoop;
