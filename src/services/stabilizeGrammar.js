/**
 * Grammar Stabilization Service
 * Cleans and normalizes user input AFTER they attempt the structural pressure
 * 
 * Phase 9 Revision: Post-attempt stabilization
 * - Preserves tense, actors, events
 * - Only fixes grammar
 * - No invented entities
 */

import { 
  validateNoQuestions, 
  validateSingleSentence, 
  hasInventedEntities 
} from './structureUtils';

/**
 * Stabilize user's attempted sentence
 * Preserve tense, actors, events - only fix grammar
 * 
 * @param {string} userSentence - User's input to stabilize
 * @param {string} previousSentence - Previous sentence for entity validation
 * @param {object} currentPressure - Current pressure (PHASE 13: for meaning expansion awareness)
 * @returns {string} Stabilized sentence (falls back to original input if unable to stabilize)
 */
export async function stabilizeGrammar(userSentence, previousSentence = null, currentPressure = null) {
  let prompt = `Fix only grammar errors in this sentence. Keep the wording as close to the original as possible.

CRITICAL: DO NOT change the meaning. Only fix grammar.`;

  // PHASE 13: Add meaning expansion rules if applicable
  if (currentPressure?.type === "meaning") {
    prompt += `

MEANING EXPANSION RULES (you are helping expand meaning):
1. Add ONLY ONE new clause or phrase to extend the thought.
2. Connect with: "so", "which", "and", commas - keep it ONE SENTENCE.
3. Stay in the SAME SITUATION - do not introduce new unrelated events.
4. Do NOT add new actors, locations, or storylines.
5. Deepen what's already there, don't branch into something new.

GOOD EXPANSION:
- "I forgot my phone" → "I forgot my phone, so I couldn't call anyone"
- "I was tired" → "I was tired, which made me go to bed early"

BAD EXPANSION:
- "I forgot my phone" → "I forgot my phone. Then I went to the store" (new event)
- "I was tired" → "I was tired and my friend was tired too" (new actor)`;
  }

  prompt += `

STRICT RULES:
1. Preserve the core meaning, tense, actors, and events.
2. Keep the same details and situation.
3. Do NOT remove or omit any existing parts of the sentence.
4. Do NOT replace the situation with a new one.
5. Keep wording as close as possible, but natural rephrasing is allowed if it improves clarity or flow.
6. If the sentence is understandable, fix it rather than rejecting it; small remaining grammar imperfections are okay.
7. Do not add synonyms just for variety; changing a word is okay if it improves structure and meaning.
8. ONLY fix grammatical issues that make it hard to understand (agreement, word order, articles, conjugation).
9. PRESERVE contractions (don't change "I'm" to "I am" or vice versa) unless doing so improves clarity.
10. If already grammatical and clear, return it EXACTLY as written.
11. Do NOT add specificity (e.g., "store" → "grocery store" is FORBIDDEN).
12. Output exactly 1 sentence, no commentary.

CHAOS RESISTANCE (quietly resist meaning drift):
- If the user input introduces nonsense or random words: ignore or remove them when possible; do not preserve meaningless additions.
- If a suggested edit breaks the original sentence meaning too much: bias back to the original meaning, keeping the sentence coherent and natural.
- If the edit is valid but unusual: allow it.
- Never explain corrections. Never mention rules in output. Keep response natural and conversational.
- Maintain coherence and preserve the pressure direction while resisting chaotic rewrites.

EXAMPLES OF GOOD FIXES (only grammar):
- "I go yesterday" → "I went yesterday" (fixed tense)
- "She don't like it" → "She doesn't like it" (fixed agreement)

EXAMPLES OF BAD FIXES (changing meaning):
- "yesterday" → "the day before yesterday" (FORBIDDEN)
- "store" → "grocery store" (FORBIDDEN)
- "I'm tired" → "I am exhausted" (FORBIDDEN)

INPUT: ${userSentence}

OUTPUT:`;

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
          temperature: 0, // Deterministic
          seed: 42,
          top_p: 1,
          top_k: 1,
          num_predict: 50 // Limit to prevent over-elaboration
        }
      })
    });

    if (!response.ok) {
      console.warn('Grammar stabilization API returned non-OK response; returning input as fallback.');
      return userSentence;
    }

    const data = await response.json();
    const output = data.response.trim();
    
    // Validate output (but do not reject for small or natural differences)
    if (!validateNoQuestions(output)) {
      console.warn('Stabilized output contains a question mark; accepting it anyway for flexibility.');
    }
    if (!validateSingleSentence(output)) {
      console.warn('Stabilized output contains multiple sentences; accepting it anyway for flexibility.');
    }
    
    // Check for invented entities if we have a previous sentence
    if (previousSentence && hasInventedEntities(output, previousSentence)) {
      return null;
    }
    
    return output;
  } catch (error) {
    console.error('Error stabilizing grammar:', error);
    return userSentence;
  }
}
