/**
 * Playground Seed Generator
 * Generates pattern-backed seed phrases for Playground entry
 */

import { PHRASE_PATTERNS_PT, PHRASE_PATTERNS_EN } from '../data/phrasePatterns';
import { generateAllPhrases } from './phraseGenerator';

/**
 * Generate a pattern-backed seed phrase for Playground entry
 * @param {string} avoidPatternId - Optional pattern ID to avoid repeating
 * @param {string} language - Language code ('en' or 'pt', default: 'pt')
 * @returns {Object} Seed phrase with text, meaning, icon, scene, patternId, contextVariations, language
 */
export function generatePlaygroundSeed(avoidPatternId = null, language = 'pt') {
  // Select pattern set based on language
  const patterns = language === 'en' ? PHRASE_PATTERNS_EN : PHRASE_PATTERNS_PT;
  
  // Select a random pattern (avoid previous if provided)
  let availablePatterns = patterns;
  
  if (avoidPatternId && patterns.length > 1) {
    const filtered = patterns.filter(p => p.id !== avoidPatternId);
    if (filtered.length > 0) {
      availablePatterns = filtered;
    }
  }
  
  const randomPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
  
  // Generate one phrase from selected pattern
  const phrases = generateAllPhrases([randomPattern], 1);
  return phrases[0];
}
