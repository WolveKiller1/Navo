/**
 * Playground Seed Generator
 * Generates pattern-backed seed phrases for Playground entry
 */

import { PHRASE_PATTERNS_PT } from '../data/phrasePatterns';
import { generateAllPhrases } from './phraseGenerator';

/**
 * Generate a pattern-backed seed phrase for Playground entry
 * @param {string} avoidPatternId - Optional pattern ID to avoid repeating
 * @returns {Object} Seed phrase with text, meaning, icon, scene, patternId, contextVariations
 */
export function generatePlaygroundSeed(avoidPatternId = null) {
  // Select a random pattern (avoid previous if provided)
  let availablePatterns = PHRASE_PATTERNS_PT;
  
  if (avoidPatternId && PHRASE_PATTERNS_PT.length > 1) {
    const filtered = PHRASE_PATTERNS_PT.filter(p => p.id !== avoidPatternId);
    if (filtered.length > 0) {
      availablePatterns = filtered;
    }
  }
  
  const randomPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
  
  // Generate one phrase from selected pattern
  const phrases = generateAllPhrases([randomPattern], 1);
  return phrases[0];
}
