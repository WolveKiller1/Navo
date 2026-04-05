/**
 * Chapter 4, Phase 2B: Playground Integrity Layer
 * Simple deterministic checks to prevent obvious nonsense
 * NO LLM calls, NO semantic analysis
 */

/**
 * Check if text appears to be nonsense/random input
 * @param {string} text - Text to check
 * @returns {boolean} true if appears to be nonsense
 */
export function isNonsense(text) {
  if (!text || text.trim().length === 0) return true;
  
  const trimmed = text.trim().toLowerCase();
  const words = trimmed.split(/\s+/);
  
  // Check each word for nonsense patterns
  for (const word of words) {
    // Skip short words (2 chars or less are often valid: "I", "go", "at")
    if (word.length <= 2) continue;
    
    // Clean punctuation for checking
    const clean = word.replace(/[.,!?;:'"]/g, '');
    if (clean.length === 0) continue;
    
    // Repeated characters: "aaaa", "xxxx"
    if (/(.)\1{3,}/.test(clean)) return true;
    
    // No vowels in words longer than 4 chars: "bcdfgh"
    if (clean.length > 4 && !/[aeiou]/i.test(clean)) return true;
    
    // Random-looking patterns: keyboard mashing like "asdf", "jklj"
    // Simple check: 4+ consecutive characters that look like keyboard mashing
    if (clean.length >= 4 && /^[qwertasdfgzxcvb]{4,}$|^[yuiophjklnm]{4,}$/i.test(clean)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if edited sentence changed too extremely from original
 * @param {string} original - Original sentence
 * @param {string} edited - Edited sentence
 * @returns {boolean} true if change is too extreme
 */
export function hasExtremeChange(original, edited) {
  if (!original || !edited) return false;
  
  const origLength = original.length;
  const editedLength = edited.length;
  
  // Length changed by more than 3x
  if (editedLength > origLength * 3) return true;
  if (editedLength < origLength / 3 && origLength > 20) return true;
  
  // Edited sentence too short (< 3 words)
  const editedWords = edited.trim().split(/\s+/);
  if (editedWords.length < 3) return true;
  
  return false;
}

/**
 * Check for awkward redundancy or doubled constructions
 * @param {string} text - Text to check
 * @returns {boolean} true if contains obvious redundancy
 */
export function hasRedundancy(text) {
  if (!text) return false;
  
  const lower = text.toLowerCase();
  
  // Detect doubled time expressions
  const timeDoubles = [
    /\b(yesterday|today|tomorrow)\b.*\b(yesterday|today|tomorrow)\b/,
    /\bthe (same|previous|next) day\b.*\b(yesterday|today|tomorrow|day)\b/,
    /\bone day\b.*\bthe (previous|next|same) day\b/,
    /\b(morning|afternoon|evening|night)\b.*\b(morning|afternoon|evening|night)\b/
  ];
  
  for (const pattern of timeDoubles) {
    if (pattern.test(lower)) {
      // Check if it's actually doubled (not just mentioning two different times)
      const matches = lower.match(pattern);
      if (matches && matches.length > 0) {
        return true;
      }
    }
  }
  
  // Detect obvious repeated phrases (3+ words)
  const words = text.trim().split(/\s+/);
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
    const rest = words.slice(i + 3).join(' ').toLowerCase();
    if (rest.includes(phrase)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for structural incoherence (misplaced words, unnatural ordering)
 * @param {string} text - Text to check
 * @returns {boolean} true if structurally incoherent
 */
export function hasStructuralIncoherence(text) {
  if (!text) return false;
  
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  
  // Prepositions at end of sentence (without proper context)
  const dangling = /\b(to|at|in|on|under|over|by|with|from)\s*[.!?]?\s*$/;
  if (dangling.test(lower)) {
    return true;
  }
  
  // Temporal words misplaced at end after other content
  // "went to the bananas quickly under yesterday" pattern
  const temporalWords = ['yesterday', 'today', 'tomorrow', 'tonight'];
  const lastWord = words[words.length - 1].replace(/[.,!?]/g, '');
  
  if (temporalWords.includes(lastWord) && words.length > 4) {
    // Check if there's other content after a preposition before the temporal word
    const secondToLast = words[words.length - 2];
    const prepositions = ['to', 'at', 'in', 'on', 'under', 'over', 'by', 'with', 'from'];
    if (prepositions.includes(secondToLast)) {
      return true;
    }
  }
  
  // Object-like words (common nouns) immediately following preposition at end
  // "to the bananas" at end is suspicious
  if (words.length >= 3) {
    const last = words[words.length - 1].replace(/[.,!?]/g, '');
    const penultimate = words[words.length - 2];
    const thirdLast = words[words.length - 3];
    
    const prepositions = ['to', 'at', 'in', 'on', 'under', 'over'];
    if (prepositions.includes(thirdLast) && 
        (penultimate === 'the' || penultimate === 'a' || penultimate === 'an')) {
      // "to the [noun]" at end might be incomplete
      // But allow common valid patterns
      const validEndings = ['store', 'park', 'school', 'work', 'home', 'bank', 'mall', 'gym', 'office', 'station', 'airport', 'hospital', 'library'];
      if (!validEndings.includes(last)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Main integrity check - combines all checks
 * @param {string} originalSentence - Original sentence before edit
 * @param {string} stabilizedSentence - Sentence after stabilization
 * @returns {object} { allowed: boolean, message?: string }
 */
export function checkEditIntegrity(originalSentence, stabilizedSentence) {
  // Run simple deterministic checks
  if (isNonsense(stabilizedSentence)) {
    console.log('[Integrity] Blocked: Nonsense detected');
    return { 
      allowed: false, 
      message: "Can't process this as a sentence" 
    };
  }
  
  if (hasExtremeChange(originalSentence, stabilizedSentence)) {
    console.log('[Integrity] Blocked: Extreme change detected');
    return { 
      allowed: false, 
      message: "Too different from the original" 
    };
  }
  
  if (hasRedundancy(stabilizedSentence)) {
    console.log('[Integrity] Blocked: Redundancy detected');
    return { 
      allowed: false, 
      message: "Let's try a simpler version" 
    };
  }
  
  if (hasStructuralIncoherence(stabilizedSentence)) {
    console.log('[Integrity] Blocked: Structural incoherence detected');
    return { 
      allowed: false, 
      message: "That doesn't quite work as a sentence" 
    };
  }
  
  // Passed all checks
  return { allowed: true };
}
