import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHistory, FaUser } from 'react-icons/fa';
import { initStorage, getImmersionProfile } from '../services/storage';
import { getDefaultProfile } from '../services/immersionProfile';
import { speak } from '../services/tts';
import '../styles/PlaygroundScreen.css';

/**
 * PlaygroundScreen
 * 
 * NEW USER-FACING PLAYGROUND
 * 
 * This is the guided pattern flow mode only.
 * It displays a flowing sequence of phrase variations with Previous/Next navigation.
 * 
 * Entry point: Landing page "Playground" button (with default seed)
 * OR: Practice Loop "Try another shape" button (with Practice Loop seed)
 * 
 * This component no longer shows the legacy reactor mode.
 * The old pressure-based editing playground is now at /playground-lab (dev only).
 */

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

// Helper to compress meaning into short, readable form
function compressMeaning(meaning) {
  if (!meaning || typeof meaning !== 'string') {
    return null;
  }

  let compressed = meaning.trim();
  
  // Remove trailing punctuation
  compressed = compressed.replace(/[.!?]+$/, '');
  
  // Convert to lowercase
  compressed = compressed.toLowerCase();
  
  // Remove trailing 'out of nowhere' type phrases and replace with tag
  if (compressed.includes('out of nowhere')) {
    compressed = compressed.replace(/out of nowhere/, 'suddenly').trim();
  }
  
  // Remove common English filler/function words (articles, possessives, prepositions)
  // Match these words with word boundaries to avoid removing parts of actual content
  compressed = compressed.replace(/\b(i|you|he|she|it|we|they|the|a|an|my|your|his|her|their|at|in|of)\b/gi, '');
  
  // Clean up double spaces and trim
  compressed = compressed.replace(/\s+/g, ' ').trim();
  
  // If result is empty or too short, return null
  if (!compressed || compressed.length < 2) {
    return null;
  }
  
  return compressed;
}

// Helper to get compressed meaning for a phrase
function getCompressedMeaning(phrase) {
  if (!phrase) {
    return null;
  }
  
  // Priority 1: Use meaning if available
  if (phrase.meaning) {
    const compressed = compressMeaning(phrase.meaning);
    if (compressed) {
      return compressed;
    }
  }
  
  // Priority 2: Fall back to scene
  if (phrase.scene) {
    return phrase.scene;
  }
  
  return null;
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

function PlaygroundScreen() {
  console.log('PlaygroundScreen rendering (Guided Mode Only)');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Profile (read-only)
  const [profile, setProfileLoaded] = useState(null);
  
  // Guided mode - Flowing pattern sequence
  const [guidedSequence, setGuidedSequence] = useState([]);
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load immersion profile (read-only) on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        await initStorage();
        let loadedProfile = await getImmersionProfile();
        if (!loadedProfile) {
          loadedProfile = getDefaultProfile();
        }
        
        setProfileLoaded(loadedProfile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, []);

  // Initialize guided mode on mount
  useEffect(() => {
    // Guided mode is required - either from Practice Loop or Landing Page
    if (location.state?.guidedMode && location.state?.seedSentence) {
      // Build starting phrase object
      const startingPhrase = {
        text: location.state.seedSentence,
        icon: location.state.icon || getFallbackIcon(location.state.seedSentence),
        scene: location.state.scene || null,
        meaning: location.state.seedMeaning || location.state.meaning || null
      };
      
      // Use route-provided context variations first, otherwise fall back to local generator
      const variations = Array.isArray(location.state.contextVariations) && location.state.contextVariations.length > 0
        ? location.state.contextVariations
        : getContextVariations(location.state.seedSentence) || [];
      
      // Build full sequence: [starting phrase, ...variations]
      const sequence = [startingPhrase, ...variations];
      
      setGuidedSequence(sequence);
      setGuidedIndex(0);
      
      console.log('[Guided Mode] Built sequence:', sequence.length, 'phrases');
      
      // Clear location state
      window.history.replaceState({}, document.title);
    } else if (!guidedSequence.length) {
      // No guided mode data provided - redirect to home
      console.warn('[Playground] No guided mode data. Redirecting to home.');
      navigate('/');
    }
  }, [location, navigate]);

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
      <div className="playground-container">
        {/* Header */}
        <header className="playground-header">
          <h1 className="playground-title">Playground</h1>
          <p className="playground-subtitle">Guided pattern flow</p>
          <div className="icon-group">
            <button className="history-icon" onClick={() => navigate('/sessions')} aria-label="Sessions">
              <FaHistory />
            </button>
            <button className="account-icon" onClick={() => navigate('/account')} aria-label="Account">
              <FaUser />
            </button>
          </div>
        </header>

        {/* Guided Flow */}
        {guidedSequence.length > 0 && (
          <div className="guided-flow">
            <div className="guided-phrase-card">
              {guidedSequence[guidedIndex].icon && (
                <div className="guided-visual-marker">
                  {guidedSequence[guidedIndex].icon}
                </div>
              )}
              
              <div className="guided-phrase-row">
                <button 
                  className="guided-audio-button"
                  onClick={() => speak(guidedSequence[guidedIndex].text, 'pt-BR')}
                  title="Play phrase"
                >
                  ▶
                </button>
                <div className="guided-phrase-text">
                  {(() => {
                    const currentText = guidedSequence[guidedIndex].text;
                    const previousText = guidedIndex > 0 ? guidedSequence[guidedIndex - 1].text : null;
                    const changedIndexes = previousText ? getChangedWordIndexes(previousText, currentText) : [];
                    const words = currentText.split(/\s+/);
                    return words.map((word, i) => (
                      <span key={i} className={changedIndexes.includes(i) ? 'guided-changed-word' : ''}>
                        {word}{i < words.length - 1 ? ' ' : ''}
                      </span>
                    ));
                  })()}
                </div>
              </div>
              
              {(() => {
                const compressedMeaning = getCompressedMeaning(guidedSequence[guidedIndex]);
                return compressedMeaning && (
                  <div className="guided-compressed-meaning">
                    {compressedMeaning}
                  </div>
                );
              })()}
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

        {/* Footer Link */}
        <div className="playground-footer">
          <Link to="/" className="back-link">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default PlaygroundScreen;
