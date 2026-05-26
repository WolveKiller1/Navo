import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaPlay } from 'react-icons/fa';
import { resetConversation } from '../services/conversation';
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
  const transcriptRef = useRef('');
  const speechFinalizeTimeout = useRef(null);

  const speechOptions = { language: activeLanguage === 'en' ? 'en-US' : 'pt-BR' };
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition(speechOptions);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => () => {
    if (speechFinalizeTimeout.current) clearTimeout(speechFinalizeTimeout.current);
  }, []);

  const currentUnit = activeUnits.find((u) => u.id === currentUnitId) || activeUnits[0] || {};
  const hasSupportContent = currentUnit && currentUnit.words && currentUnit.meaning;

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

    speechFinalizeTimeout.current = setTimeout(() => {
      speechFinalizeTimeout.current = null;
      const finalTranscript = transcriptRef.current.trim();
      if (finalTranscript) {
        setUserTranscript(finalTranscript);
        setShowSentenceText(true);
        if (!hasEngaged) setHasEngaged(true);
      } else {
        setSystemNotice({ message: 'No speech detected.' });
      }
      setIsProcessing(false);
    }, 300);
  };

  const handleNext = () => {
    setUserTranscript('');
    resetTranscript();
    setShowSentenceMeaning(false);
    setPronunciationBubble(null);
    setShowSentenceText(false);
    setHasEngaged(false);

    const nextUnit = selectRandomUnit(activeUnits, recentUnitIds);
    setCurrentUnitId(nextUnit.id);
    setRecentUnitIds((prev) => [...prev, nextUnit.id].slice(-4));
  };

  const toggleSentenceMeaning = () => {
    if (!hasSupportContent) return;
    setShowSentenceMeaning((prev) => !prev);
    if (!hasEngaged) setHasEngaged(true);
  };

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

  const handlePlayTarget = () => {
    speak(currentUnit.text, activeLanguage === 'pt' ? 'pt-BR' : 'en-US');
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
              {hasSupportContent && currentUnit.words
                ? currentUnit.words.map((wordData, index) => (
                    <span key={index} className="word-clickable" onClick={(e) => handleWordClick(wordData.text, e)}>
                      {wordData.text}{index < currentUnit.words.length - 1 ? ' ' : ''}
                    </span>
                  ))
                : currentUnit.text}
            </p>
          ) : (
            <p className="loop-phrase hidden-hint">Phrase stays hidden until you speak.</p>
          )}
          {showSentenceMeaning && hasSupportContent && <p className="loop-meaning navo-reveal">{currentUnit.meaning}</p>}
        </div>

        <button className="loop-play-btn" onClick={handlePlayTarget} title="Play target sentence">
          <FaPlay />
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
            <button className="action-chip" onClick={toggleSentenceMeaning} disabled={!hasSupportContent}>{showSentenceMeaning ? 'Hide meaning' : 'Show meaning'}</button>
            <button className="action-chip" onClick={handleNext}>Next phrase</button>
            <button className="action-chip action-chip-warm" onClick={handleTryAnotherShape} disabled={!hasSupportContent}>Explore this pattern</button>
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
