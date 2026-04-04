/**
 * Variation Engine: Lateral Variation Generation
 * Generates 3-5 structural variations that DON'T satisfy current pressure
 * 
 * Phase 9 Revision: User-driven exploration
 * - Variations help discover structural possibilities
 * - MUST NOT satisfy current pressure
 * - MUST NOT substitute nouns or invent entities
 */

import { 
  detectMoves, 
  hasInventedEntities, 
  hasSubstitutedNouns,
  validateNoQuestions,
  validateSingleSentence 
} from './structureUtils';

/**
 * Check if variation satisfies the current pressure
 */
function satisfiesPressure(variation, pressureMove) {
  const movesInVariation = detectMoves(variation);
  return movesInVariation.includes(pressureMove);
}

/**
 * Generate ONE variation with specific direction
 */
async function generateVariation(baseSentence, direction, avoidPressure, fastMode = false) {
  const pressureInstructions = {
    contrast: 'Do NOT use: but, although, even though',
    cause: 'Do NOT use: because, so',
    conditional: 'Do NOT use: if, would',
    past: 'Do NOT use past tense markers (went, did, was, were, had, made, got, -ed endings)',
    future: 'Do NOT use: will, going to, gonna'
  };
  
  const prompt = `Generate ONE natural variation of this sentence.

DIRECTION: ${direction}

CRITICAL: Keep the SAME core situation. Only shift structure or perspective.

STRICT RULES:
1. Preserve EXACT same actors, events, and core meaning.
2. Do NOT add new people, locations, times, or events.
3. Do NOT substitute nouns (e.g., "store" → "grocery store" is INVALID).
4. Do NOT solve or answer the current pressure.
5. ${pressureInstructions[avoidPressure] || 'Keep natural phrasing'}
6. Use natural native-like patterns.
7. Prefer simple present, simple past, or clear conditional structures.
8. AVOID awkward tense stacking (e.g., "I have spilled when I was").
9. AVOID unnatural phrases like "due to nature."
10. Only vary HOW it's said, not WHAT happens.
11. Output exactly 1 sentence, no commentary.

GOOD EXAMPLES (only structure changes):
- "I spilled my coffee" → "I spill my coffee sometimes"
- "I am tired" → "I feel tired"
- "He left" → "He has left"

BAD EXAMPLES (adding new content):
- "I spilled coffee" → "I spilled coffee at the café this morning" (added location/time)
- "I am tired" → "I am very exhausted" (changed meaning)

ORIGINAL: ${baseSentence}

VARIATION:`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: prompt,
        stream: false,
        options: {
          temperature: fastMode ? 0.3 : 0.4,
          seed: Math.floor(Math.random() * 10000),
          top_p: 0.9,
          num_predict: 40 // Speed up: limit tokens
        }
      })
    });

    if (!response.ok) {
      throw new Error('Variation generation API error');
    }

    const data = await response.json();
    const output = data.response.trim();
    
    // Validate
    if (!validateNoQuestions(output)) return null;
    if (!validateSingleSentence(output)) return null;
    if (hasInventedEntities(output, baseSentence)) return null;
    if (hasSubstitutedNouns(output, baseSentence)) return null;
    if (satisfiesPressure(output, avoidPressure)) return null;
    
    return output;
  } catch (error) {
    console.error('Error generating variation:', error);
    return null;
  }
}

/**
 * Generate simple fallback variations manually
 * Used when LLM generation fails
 */
function generateFallbackVariations(baseSentence, currentPressure) {
  const fallbacks = [];
  const words = baseSentence.split(/\s+/);
  
  // Fallback 1: Add "maybe" or "perhaps" if not solving pressure
  if (currentPressure !== 'conditional' && !baseSentence.toLowerCase().includes('maybe')) {
    fallbacks.push(`Maybe ${baseSentence.toLowerCase()}`);
  }
  
  // Fallback 2: Add "I think" prefix if not already there
  if (!baseSentence.toLowerCase().startsWith('i think')) {
    fallbacks.push(`I think ${baseSentence.toLowerCase()}`);
  }
  
  // Fallback 3: Rephrase with "It's true that"
  if (!baseSentence.toLowerCase().includes('true')) {
    fallbacks.push(`It's true that ${baseSentence.toLowerCase()}`);
  }
  
  return fallbacks.slice(0, 2);
}

/**
 * Generate 2-3 lateral variations (PHASE 12: Guaranteed reliability)
 * 
 * @param {string} baseSentence - Stabilized sentence
 * @param {string} currentPressure - Current pressure move to avoid
 * @param {number} count - Target number of variations (default 3)
 * @returns {Array} Array of 2-3 variation strings (NEVER 0 or 1)
 */
export async function generateVariations(baseSentence, currentPressure, count = 3) {
  console.log('[Variation Engine] Starting FAST generation for:', baseSentence);
  const variations = [];
  
  // PHASE 12 REFINED: Reduced directions for speed (target 1-2 seconds)
  const directions = [
    'Simplify to most basic form',
    'Change tense slightly',
    'Rephrase with different word order'
  ];
  
  // PHASE 12 REFINED: Generate in parallel for speed
  const promises = directions.map(direction => 
    generateVariation(baseSentence, direction, currentPressure, true) // fastMode=true
  );
  
  const results = await Promise.all(promises);
  
  // Collect valid unique variations
  for (const result of results) {
    if (result && !variations.includes(result)) {
      variations.push(result);
      console.log(`[Variation Engine] Generated variation ${variations.length}:`, result);
    }
    if (variations.length >= 3) break;
  }
  
  // PHASE 12 REFINED: Only retry if we have less than 2 (fast single attempt)
  if (variations.length < 2) {
    console.log('[Variation Engine] Need more, trying fallback generation');
    const fallback = await generateVariation(
      baseSentence, 
      'Create a simple structural variation', 
      currentPressure,
      true // fastMode
    );
    
    if (fallback && !variations.includes(fallback)) {
      variations.push(fallback);
    }
  }
  
  // PHASE 12: CRITICAL FALLBACK - If still less than 2, use manual fallbacks
  if (variations.length < 2) {
    console.warn('[Variation Engine] LLM generation insufficient, using fallbacks');
    const fallbacks = generateFallbackVariations(baseSentence, currentPressure);
    
    for (const fallback of fallbacks) {
      if (variations.length >= 2) break;
      if (!variations.includes(fallback)) {
        variations.push(fallback);
        console.log(`[Variation Engine] Added fallback variation ${variations.length}:`, fallback);
      }
    }
  }
  
  // PHASE 12: ABSOLUTE GUARANTEE - Never return less than 2
  if (variations.length < 2) {
    console.error('[Variation Engine] CRITICAL: Could not generate 2 variations, adding emergency fallback');
    // Emergency: Just return the original with slight modification
    if (variations.length === 0) {
      variations.push(`I think ${baseSentence.toLowerCase()}`);
      variations.push(`Maybe ${baseSentence.toLowerCase()}`);
    } else if (variations.length === 1) {
      variations.push(`Perhaps ${baseSentence.toLowerCase()}`);
    }
  }
  
  // Return exactly 2 or 3 variations (guaranteed)
  const final = variations.slice(0, 3);
  console.log(`[Variation Engine] Returning ${final.length} variations`);
  return final;
}
