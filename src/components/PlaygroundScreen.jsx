import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHistory, FaUser } from 'react-icons/fa';
import { initStorage, getImmersionProfile } from '../services/storage';
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

function PlaygroundScreen() {
  console.log('PlaygroundScreen rendering');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Profile (read-only)
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Guided mode from Practice Loop - Flowing pattern sequence
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedSequence, setGuidedSequence] = useState([]); // Array of phrase objects
  const [guidedIndex, setGuidedIndex] = useState(0);        // Current position in sequence
  
  // Core state
  const [currentSentence, setCurrentSentence] = useState(null); // null = show seed selector
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
  const [currentWordIndex, setCurrentWordIndex] = useState(null); // Track index for meaning bubble
  
  // Chapter 4 Phase 2: Chunk selection (contiguous word selection)
  const [chunkSelection, setChunkSelection] = useState(null); // { startIndex, endIndex }
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
        setProfileLoaded(true); // Allow rendering even on error
        setErrorMessage('Failed to load profile. Please refresh.');
      }
    };
    
    loadProfile();
  }, []);

  // Check for guided mode from Practice Loop - Build flowing sequence
  useEffect(() => {
    if (location.state?.guidedMode && location.state?.seedSentence) {
      setGuidedMode(true);
      
      // Build starting phrase object
      const startingPhrase = {
        text: location.state.seedSentence,
        icon: location.state.icon || getFallbackIcon(location.state.seedSentence),
        scene: location.state.scene || null
      };
      
      // Get all context variations
      const variations = getContextVariations(location.state.seedSentence);
      
      // Build full sequence: [starting phrase, ...variations]
      const sequence = [startingPhrase, ...variations];
      
      setGuidedSequence(sequence);
      setGuidedIndex(0); // Start at beginning
      
      console.log('[Guided Mode] Built sequence:', sequence.length, 'phrases');
      
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);


  // Initialize with random suggestion on mount
  useEffect(() => {
    if (!currentSentence && !guidedMode && CATALYTIC_SEEDS.length > 0) {
      const randomIndex = Math.floor(Math.random() * CATALYTIC_SEEDS.length);
      setCurrentSuggestion(CATALYTIC_SEEDS[randomIndex]);
    }
  }, [currentSentence, guidedMode]);

  // Handle suggestion cycling (randomize)
  const handleCycleSuggestion = () => {
    if (CATALYTIC_SEEDS.length === 0) return;
    
    // Get random index different from current
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * CATALYTIC_SEEDS.length);
    } while (CATALYTIC_SEEDS.length > 1 && CATALYTIC_SEEDS[randomIndex] === currentSuggestion);
    
    setCurrentSuggestion(CATALYTIC_SEEDS[randomIndex]);
  };

  // Handle seed click
  const handleSeedClick = (seed) => {
    // Directly set sentence from seed (no LLM generation)
    setCurrentSentence(seed.sentence);
    
    // PHASE 13: Track seed sentence as original
    setSeedSentence(seed.sentence);
    
    // PHASE 13 REFINED: Reset mutation counters
    setMutationCount(0);
    setConsecutiveMeaningCount(0);
    
    // PHASE 13: Select pressure (structural or meaning)
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
    
    // FIRST INPUT (manual entry from seed selector): Select pressure from raw sentence
    if (!currentSentence) {
      // Display raw sentence + random pressure (avoid satisfied)
      setCurrentSentence(trimmedInput);
      
      // PHASE 13: Track as seed sentence
      setSeedSentence(trimmedInput);
      
      // PHASE 13 REFINED: Reset mutation counters
      setMutationCount(0);
      setConsecutiveMeaningCount(0);
      
      const randomPressure = selectRandomPressure(null, trimmedInput, 0);
      setCurrentPressure(randomPressure);
      setLastPressure(randomPressure);
      setUserInput('');
      
      return; // Wait for user's next attempt
    }
    
    // USER ATTEMPTED MODIFICATION
    setIsStabilizing(true);
    
    // PHASE 13: Stabilize with pressure context
    const stabilized = await stabilizeGrammar(trimmedInput, currentSentence, currentPressure);
    
    if (!stabilized) {
      setErrorMessage('Could not stabilize sentence. Try again.');
      setIsStabilizing(false);
      return;
    }
    
    // PHASE 13: Check max length (simple control)
    if (stabilized.length > 250) {
      setErrorMessage('Sentence is too long. Keep it focused.');
      setIsStabilizing(false);
      return;
    }
    
    // PHASE 12: Clear logging for reactor loop
    console.log('[Reactor Loop] 1. Stabilization complete:', stabilized);
    
    // Store previous sentence for transformation indicator
    if (stabilized !== currentSentence) {
      setPreviousSentence(currentSentence);
    }
    
    // Trigger sentence change animation
    setSentenceChanging(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Create highlighted version (only if there are changes)
    const highlighted = createHighlightedSentence(trimmedInput, stabilized);
    setHighlightedWords(highlighted);
    
    setCurrentSentence(stabilized);
    
    setUserInput('');
    setIsStabilizing(false);
    setHasMutation(true); // First mutation completed
    setMeaningBubble(null); // Dismiss bubble on sentence change
    
    // PHASE 13 REFINED: Increment mutation count
    const newMutationCount = mutationCount + 1;
    setMutationCount(newMutationCount);
    
    // Complete sentence transition
    await new Promise(resolve => setTimeout(resolve, 300));
    setSentenceChanging(false);
    
    // Clear highlight after 1000ms
    // setTimeout(() => {
    //   setHighlightedWords(null);
    // }, 1000);
    
    // Check if the edit satisfies the current pressure
    const pressureSatisfied = isSatisfied(stabilized, currentPressure);
    console.log('[Reactor Loop] Pressure satisfied:', pressureSatisfied);
    
    // PHASE 12: Generate variations with animation (GUARANTEED 2-3)
    console.log('[Reactor Loop] 2. Generating variations (avoiding:', currentPressure.move + ')');
    await generateVariationsWithAnimation(stabilized, currentPressure.move);
    
    // Only advance pressure and mutation count if pressure was satisfied
    if (!pressureSatisfied) {
      console.log('[Reactor Loop] Pressure not satisfied - keeping current pressure');
      // Sentence updated but pressure stays the same
      // Don't increment mutation count
      setMutationCount(newMutationCount - 1); // Revert the increment
      return; // Stop here - no new pressure
    }
    
    // PHASE 13 REFINED: Check if mutation cap reached (4 max)
    if (newMutationCount >= 4) {
      console.log('[Reactor Loop] Mutation cap reached (4). No new pressure assigned.');
      setCurrentPressure(null); // Clear pressure
      return; // Stop - show only call room bridge and clear
    }
    
    // PHASE 13 REFINED: Update consecutive meaning counter
    let newConsecutiveMeaningCount = consecutiveMeaningCount;
    if (currentPressure?.type === "meaning") {
      newConsecutiveMeaningCount = consecutiveMeaningCount + 1;
    } else {
      newConsecutiveMeaningCount = 0; // Reset on structural
    }
    setConsecutiveMeaningCount(newConsecutiveMeaningCount);
    
    // PHASE 13 REFINED: Select next pressure with limits
    const nextPressure = selectRandomPressure(lastPressure, stabilized, newConsecutiveMeaningCount);
    console.log('[Reactor Loop] 3. Next pressure selected:', nextPressure.label, '(type:', nextPressure.type + ')');
    setCurrentPressure(nextPressure);
    setLastPressure(nextPressure);
  };

  // PHASE 12: Generate variations with soft fade animation (GUARANTEED 2-3)
  const generateVariationsWithAnimation = async (sentence, pressureMove) => {
    // Fade out old variations
    setVariationsFading(true);
    setVariations([]);
    
    // Wait for CSS transition
    await new Promise(resolve => setTimeout(resolve, 180));
    
    // Generate variations (GUARANTEED 2-3)
    setIsGeneratingVariations(true);
    const newVariations = await generateVariations(sentence, pressureMove, 3);
    
    // PHASE 12: Ensure we always have variations
    if (!newVariations || newVariations.length < 2) {
      console.error('[Reactor Loop] ERROR: Variations failed, using emergency fallback');
      setVariations([
        `I think ${sentence.toLowerCase()}`,
        `Maybe ${sentence.toLowerCase()}`
      ]);
    } else {
      console.log('[Reactor Loop] Variations received:', newVariations.length);
      setVariations(newVariations);
    }
    
    setIsGeneratingVariations(false);
    
    // Fade in new variations
    setVariationsFading(false);
  };

  // Chapter 4 Phase 1 Correction: Restore meaning click as primary
  const handleWordClick = async (word, index, event) => {
    // Clean punctuation from word for display
    const cleanWord = word.replace(/[.,!?;:'"]/g, '');
    if (!cleanWord) return;
    
    // Dismiss previous bubble
    setMeaningBubble(null);
    
    const rect = event.target.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    };
    
    // Show loading bubble immediately
    setMeaningBubble({ word: cleanWord, meaning: "loading...", position, wordIndex: index });
    setCurrentWordIndex(index);
    
    const meaning = await getWordMeaning(cleanWord, currentSentence);
    
    setMeaningBubble({ 
      word: cleanWord, 
      meaning: meaning || "meaning unavailable", 
      position,
      wordIndex: index
    });
  };

  // Chapter 4 Phase 1 Correction: Handle "Change" button from meaning bubble
  const handleChangeFromMeaning = (word, index) => {
    // Clean word
    const cleanWord = word.replace(/[.,!?;:'"]/g, '');
    
    // Get quick options synchronously (instant, no delay)
    const options = getWordOptions(cleanWord, index, currentSentence);
    
    // Show word picker with stable content
    setSelectedWord(cleanWord);
    setSelectedWordIndex(index);
    setWordOptions(options);
    
    // Chapter 4 Phase 2: Initialize chunk selection with single word
    setChunkSelection({ startIndex: index, endIndex: index });
    setChunkWords([cleanWord]);
    setIsChunkSelectionMode(true);
    
    setShowWordPicker(true);
  };

  // Chapter 4 Phase 2: Handle chunk expansion
  const handleChunkExpand = (direction) => {
    const wordCount = currentSentence.split(/\s+/).length;
    
    setChunkSelection(prev => {
      if (!prev) return prev;
      
      let newStart = prev.startIndex;
      let newEnd = prev.endIndex;
      
      if (direction === 'left' && newStart > 0) {
        newStart -= 1;
      } else if (direction === 'right' && newEnd < wordCount - 1) {
        newEnd += 1;
      }
      
      // Limit chunk to max 4 words
      if (newEnd - newStart + 1 > 4) {
        if (direction === 'left') {
          newStart += 1;
        } else {
          newEnd -= 1;
        }
      }
      
      // Update chunkWords with the new slice
      const words = currentSentence.split(/\s+/);
      setChunkWords(words.slice(newStart, newEnd + 1));
      
      return { startIndex: newStart, endIndex: newEnd };
    });
  };

  // Chapter 4 Phase 1: Handle word replacement/add
  const handleWordReplace = async (newWord, mode = 'replace') => {
    if (!newWord || selectedWordIndex === null) return;

    // Close picker immediately
    setShowWordPicker(false);

    // Reconstruct sentence (newWord can be single word OR multi-word phrase)
    const words = currentSentence.split(/\s+/);
    let modifiedWords;

    // Chapter 4 Phase 2: Handle chunk selection
    if (isChunkSelectionMode && chunkSelection) {
      const startIdx = chunkSelection.startIndex;
      const endIdx = chunkSelection.endIndex;
      
      modifiedWords = [...words];
      
      if (mode === 'replace') {
        // Replace entire chunk with new word(s)
        modifiedWords.splice(startIdx, endIdx - startIdx + 1, newWord);
      } else if (mode === 'before') {
        // Insert before chunk
        modifiedWords.splice(startIdx, 0, newWord);
      } else if (mode === 'after') {
        // Insert after chunk
        modifiedWords.splice(endIdx + 1, 0, newWord);
      }
    } else {
      // Original single-word logic
      if (mode === 'replace') {
        modifiedWords = [...words];
        modifiedWords[selectedWordIndex] = newWord;
      } else if (mode === 'before') {
        modifiedWords = [...words];
        modifiedWords.splice(selectedWordIndex, 0, newWord);
      } else if (mode === 'after') {
        modifiedWords = [...words];
        modifiedWords.splice(selectedWordIndex + 1, 0, newWord);
      } else {
        modifiedWords = [...words];
        modifiedWords[selectedWordIndex] = newWord;
      }
    }

    const reconstructed = modifiedWords.join(' ');
    
    // Set processing state
    setIsStabilizing(true);
    setMeaningBubble(null);
    
    // ALWAYS run stabilization (silent repair layer)
    let stabilized = await stabilizeGrammar(reconstructed, currentSentence, currentPressure);
    
    // Fallback: if stabilization returns null, use reconstructed
    if (!stabilized) {
      stabilized = reconstructed;
    }
    
    // Check max length
    if (stabilized.length > 250) {
      stabilized = reconstructed; // Use original attempt if too long
    }
    
    // Chapter 4 Phase 2B: Integrity check (simple deterministic only)
    const integrityResult = checkEditIntegrity(currentSentence, stabilized);
    
    // If integrity check fails, show message and keep previous sentence
    const finalSentence = integrityResult.allowed ? stabilized : currentSentence;
    
    // Show rejection message if not allowed
    if (!integrityResult.allowed && integrityResult.message) {
      setRejectionMessage(integrityResult.message);
      setTimeout(() => setRejectionMessage(''), 3000);
    }
    
    // Store previous sentence for transformation indicator
    if (finalSentence !== currentSentence) {
      setPreviousSentence(currentSentence);
    }
    
    // Trigger sentence change animation
    setSentenceChanging(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Update sentence (with fallback if needed)
    setCurrentSentence(finalSentence);
    
    setIsStabilizing(false);
    setHasMutation(true);
    
    // Chapter 4 Phase 2: Set modified word index or chunk for highlighting
    if (isChunkSelectionMode && chunkSelection) {
      setModifiedWordIndex(chunkSelection.startIndex); // Use for chunk highlighting
    } else {
      setModifiedWordIndex(selectedWordIndex);
    }
    
    // Clear chunk selection and mode
    setChunkSelection(null);
    setIsChunkSelectionMode(false);
    
    // Increment mutation count
    const newMutationCount = mutationCount + 1;
    setMutationCount(newMutationCount);
    
    // Complete sentence transition
    await new Promise(resolve => setTimeout(resolve, 300));
    setSentenceChanging(false);
    
    // Clear highlight after 1500ms
    setTimeout(() => {
      setModifiedWordIndex(null);
    }, 1500);
    
    // Check if the edit satisfies the current pressure
    const pressureSatisfied = isSatisfied(finalSentence, currentPressure);
    console.log('[Reactor Loop] Word edit - Pressure satisfied:', pressureSatisfied);
    
    // Generate variations
    console.log('[Reactor Loop] Generating variations after word edit');
    await generateVariationsWithAnimation(finalSentence, currentPressure.move);
    
    // Only advance pressure and mutation count if pressure was satisfied
    if (!pressureSatisfied) {
      console.log('[Reactor Loop] Pressure not satisfied - keeping current pressure');
      // Sentence updated but pressure stays the same
      // Don't increment mutation count
      setMutationCount(newMutationCount - 1); // Revert the increment
      return; // Stop here - no new pressure
    }
    
    // Check if mutation cap reached
    if (newMutationCount >= 4) {
      console.log('[Reactor Loop] Mutation cap reached (4)');
      setCurrentPressure(null);
      return;
    }
    
    // Update consecutive meaning counter
    let newConsecutiveMeaningCount = consecutiveMeaningCount;
    if (currentPressure?.type === "meaning") {
      newConsecutiveMeaningCount = consecutiveMeaningCount + 1;
    } else {
      newConsecutiveMeaningCount = 0;
    }
    setConsecutiveMeaningCount(newConsecutiveMeaningCount);
    
    // Select next pressure
    const nextPressure = selectRandomPressure(lastPressure, finalSentence, newConsecutiveMeaningCount);
    console.log('[Reactor Loop] Next pressure selected:', nextPressure.label);
    setCurrentPressure(nextPressure);
    setLastPressure(nextPressure);
  };

  // Handle clear (reset to seed selector)
  const handleClear = () => {
    setCurrentSentence(null); // Reset to seed selector
    setCurrentPressure(null);
    setVariations([]);
    setUserInput('');
    setErrorMessage('');
    setLastPressure(null);
    setHasMutation(false);
    setSeedSentence(null); // PHASE 13: Clear seed
    setMutationCount(0); // PHASE 13 REFINED: Reset counters
    setConsecutiveMeaningCount(0);
    setMeaningBubble(null); // Clear bubble
    setPreviousSentence(null); // Clear transformation indicator
    setGuidedMode(false);
  };

  // Handle take to call room
  const handleTakeToCallRoom = () => {
    navigate('/room', { 
      state: { 
        openingSentence: currentSentence 
      } 
    });
  };

  return (
    <div className="playground-screen">
      {/* Phase 15: Home Arrow */}
      <HomeArrow />
      
      <div className="playground-container">
        <div className="playground-header">
          <div className="icon-group">
            <button className="history-icon" onClick={() => navigate('/sessions')}>
              <FaHistory />
            </button>
            <button className="account-icon" onClick={() => navigate('/account')}>
              <FaUser />
            </button>
          </div>
          <h1 className="playground-title">Sentence Playground</h1>
          <p className="playground-subtitle">User-driven structural evolution</p>
        </div>

        {/* Guided Flow - Single Active Phrase Movement */}
        {guidedMode && guidedSequence.length > 0 && (
          <div className="guided-flow">
            {/* Current Active Phrase */}
            <div className="guided-phrase-card">
              {guidedSequence[guidedIndex].icon && (
                <div className="guided-visual-marker">
                  {guidedSequence[guidedIndex].icon}
                </div>
              )}
              
              <div className="guided-phrase-row">
                <button 
                  className="guided-audio-button"
                  onClick={() => speak(guidedSequence[guidedIndex].text)}
                  title="Play phrase"
                >
                  ▶
                </button>
                <div className="guided-phrase-text">
                  {guidedSequence[guidedIndex].text}
                </div>
              </div>
              
              {guidedSequence[guidedIndex].scene && (
                <div className="guided-scene">
                  {guidedSequence[guidedIndex].scene}
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {guidedSequence.length > 1 && (
              <div className="guided-progress">
                {guidedIndex + 1} / {guidedSequence.length}
              </div>
            )}

            {/* Flow Navigation */}
            <div className="guided-flow-actions">
              <button
                className="guided-action-button secondary"
                onClick={() => navigate('/loop')}
              >
                Back to loop
              </button>
              
              <button
                className="guided-action-button secondary"
                onClick={() => {
                  const currentPhrase = guidedSequence[guidedIndex];
                  navigate('/room', { 
                    state: { openingSentence: currentPhrase.text } 
                  });
                }}
              >
                Enter the Room
              </button>
              
              <button
                className="guided-action-button secondary"
                onClick={() => {
                  if (guidedIndex > 0) {
                    setGuidedIndex(prev => prev - 1);
                  }
                }}
                disabled={guidedIndex <= 0}
              >
                Previous ←
              </button>
              
              <button
                className="guided-action-button primary"
                onClick={() => {
                  if (guidedIndex < guidedSequence.length - 1) {
                    setGuidedIndex(prev => prev + 1);
                  }
                }}
                disabled={guidedIndex >= guidedSequence.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Entry Phase (shown when currentSentence === null) */}
        {!currentSentence && !guidedMode && profileLoaded && currentSuggestion && (
          <div className="entry-phase">
            {/* Single Suggestion Card */}
            <div 
              className="suggestion-card"
              onClick={() => handleSeedClick(currentSuggestion)}
            >
              <div className="suggestion-text">
                {currentSuggestion.sentence}
              </div>
            </div>
            
            {/* Cycle Link */}
            <button 
              className="cycle-link"
              onClick={handleCycleSuggestion}
            >
              another example
            </button>
            
            {/* Separator */}
            <div className="entry-separator">— or —</div>
            
            {/* Input Card */}
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

        {/* Reactor (shown when currentSentence !== null) */}
        {currentSentence && (
          <>
            {/* Sentence Core */}
            <div className={`sentence-core ${sentenceChanging ? 'changing' : ''}`}>
              <button 
                className="sentence-audio-button"
                onClick={() => speak(currentSentence)}
                aria-label="Play sentence"
                title="Play sentence audio"
              >
                🔊
              </button>
              
              {/* Transformation Indicator */}
              {previousSentence && previousSentence !== currentSentence && (
                <div className="transformation-indicator">
                  <span className="previous-sentence">{previousSentence}</span>
                  <span className="transformation-arrow">→</span>
                  <span className="current-sentence-preview">{currentSentence}</span>
                </div>
              )}
              
              <div className="sentence-text">
                {currentSentence.split(/\s+/).map((word, i) => {
                  // Chapter 4 Phase 2: Check if word is in chunk selection
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
              
              {/* Rejection Message */}
              {rejectionMessage && (
                <div className="rejection-message">
                  {rejectionMessage}
                </div>
              )}
            </div>

            {/* Chapter 4 Phase 1: Hide full-sentence rewrite field - kept for backwards compatibility */}

            {/* Other Directions */}
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

            {/* Call Room Bridge (shown after first mutation) */}
            {hasMutation && (
              <div className="call-room-bridge">
                <button className="bridge-button" onClick={handleTakeToCallRoom}>
                  Take this sentence into the Call Room →
                </button>
              </div>
            )}

            {/* Clear Button */}
            <div className="actions-section">
              <button className="clear-button" onClick={handleClear}>
                Clear
              </button>
            </div>
          </>
        )}

        {/* Footer Link */}
        <div className="playground-footer">
          <Link to="/room" className="back-link">Back to Free Conversation</Link>
        </div>
      </div>

      {/* Phase 11: Meaning Bubble with "Change" button */}
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

      {/* Chapter 4 Phase 1: Word Picker Popup */}
      {showWordPicker && (
        <WordPickerPopup
          selectedWord={selectedWord}
          quickOptions={wordOptions}
          onSelect={handleWordReplace}
          onClose={() => {
            setShowWordPicker(false);
            // Chapter 4 Phase 2: Clear chunk selection when closing
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

export default PlaygroundScreen;
