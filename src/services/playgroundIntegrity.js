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
 * Main integrity check - combines all checks
 * @param {string} originalSentence - Original sentence before edit
 * @param {string} stabilizedSentence - Sentence after stabilization
 * @returns {boolean} true if edit should be allowed
 */
export function checkEditIntegrity(originalSentence, stabilizedSentence) {
  // Run simple deterministic checks
  if (isNonsense(stabilizedSentence)) {
    console.log('[Integrity] Blocked: Nonsense detected');
    return false;
  }
  
  if (hasExtremeChange(originalSentence, stabilizedSentence)) {
    console.log('[Integrity] Blocked: Extreme change detected');
    return false;
  }
  
  // Passed all checks
  return true;
}
