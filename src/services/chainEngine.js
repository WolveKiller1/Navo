/**
 * Chain Engine: Structural Chain Generator for Playground
 * Generates progressive structural chains from user input
 * 
 * Phase 9 v1 implementation
 * - 5 active moves: past, future, cause, conditional, contrast
 * - Max 3 generated steps after base
 * - Coherence-first selection with profile tie-break
 * - No SessionHistory writes, no profile updates
 */

// Active generation moves for v1 (question excluded)
const ACTIVE_MOVES = ['past', 'future', 'cause', 'conditional', 'contrast'];

// Group nouns for entity detection (reuse Phase 7 logic)
const GROUP_NOUNS = ['family', 'families', 'friend', 'friends', 'kid', 'kids', 'parent', 'parents', 'wife', 'husband', 'brother', 'sister', 'brothers', 'sisters', 'children', 'child'];

/**
 * Detect structural moves present in a sentence
 * Reuses Phase 8 detection logic
 */
function detectMovesInSentence(sentence) {
  const moves = {
    past: /\b(went|did|was|were|had|made|got|saw|came|took)\b|(\w{5,}ed\b)/i.test(sentence),
    future: /\b(will|going to|gonna)\b/i.test(sentence),
    cause: /\b(because|so)\b/i.test(sentence),
    conditional: /\b(if|would)\b/i.test(sentence),
    contrast: /\b(but|although|even though)\b/i.test(sentence),
    question: sentence.includes('?')  // Tracked but not used in v1 generation
  };
  
  return Object.keys(moves).filter(move => moves[move]);
}

/**
 * Extract entities from text (Phase 7 guard)
 */
function extractEntities(text) {
  const entities = new Set();
  
  // Capitalized words (excluding "I")
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
  capitalizedWords.forEach(word => {
    if (word !== 'I') {
      entities.add(word.toLowerCase());
    }
  });
  
  // Group nouns
  GROUP_NOUNS.forEach(noun => {
    if (text.toLowerCase().includes(noun)) {
      entities.add(noun);
    }
  });
  
  return entities;
}

/**
 * Check if new text has invented entities not in source
 */
function hasInventedEntities(newText, sourceText) {
  const newEntities = extractEntities(newText);
  const sourceEntities = extractEntities(sourceText);
  
  // Find entities in new text not in source
  const invented = Array.from(newEntities).filter(e => !sourceEntities.has(e));
  
  return invented.length > 0;
}

/**
 * Generate clean base rewrite (preserves tense)
 */
async function generateBaseRewrite(userSentence) {
  const prompt = `Transform this into a clean, grammatically correct sentence.

RULES:
1. Preserve the core meaning exactly.
2. Preserve the tense of the input (do NOT change past to present, future to present, etc).
3. Keep the same actors and events.
4. Only normalize for grammatical clarity if needed.
5. No invented entities or details.
6. Output exactly 1 sentence.
7. No questions, no teaching language, no commentary.

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
          temperature: 0,
          seed: 42,
          top_p: 1,
          top_k: 1
        }
      })
    });

    if (!response.ok) {
      throw new Error('Base rewrite API error');
    }

    const data = await response.json();
    const output = data.response.trim();
    
    // Validate: no questions, max 1 sentence
    if (output.includes('?')) return null;
    const sentences = output.match(/[.!?]+/g);
    if (sentences && sentences.length > 1) return null;
    
    return output;
  } catch (error) {
    console.error('Error generating base rewrite:', error);
    return null;
  }
}

/**
 * Select next move dynamically
 * 4-tier priority: compatibility → non-dominance → coherence → profile rarity
 */
function selectNextMove(currentSentence, chainHistory, immersionProfile) {
  // Detect moves in current sentence
  const currentMoves = detectMovesInSentence(currentSentence);
  
  // Count moves in chain history
  const chainMoves = chainHistory.flatMap(step => step.moves);
  const moveCounts = {};
  chainMoves.forEach(m => moveCounts[m] = (moveCounts[m] || 0) + 1);
  
  // TIER 1: COMPATIBILITY (hard filter)
  const compatibleMoves = ACTIVE_MOVES.filter(move => {
    // Avoid moves already in current sentence
    if (currentMoves.includes(move)) return false;
    
    // Tense conflict rules
    if (move === 'past' && currentMoves.includes('future')) return false;
    if (move === 'future' && currentMoves.includes('past')) return false;
    
    return true;
  });
  
  if (compatibleMoves.length === 0) {
    return null; // No compatible move, stop chain
  }
  
  // TIER 2: NON-DOMINANCE (soft filter)
  const nonDominantMoves = compatibleMoves.filter(move => 
    (moveCounts[move] || 0) < 2
  );
  
  const candidateMoves = nonDominantMoves.length > 0 
    ? nonDominantMoves 
    : compatibleMoves;
  
  if (candidateMoves.length === 1) {
    return candidateMoves[0]; // Only one option
  }
  
  // TIER 3: COHERENCE SCORING
  const coherenceScores = {};
  
  candidateMoves.forEach(move => {
    let score = 0;
    
    // Cause is natural after temporal moves
    if (move === 'cause' && (currentMoves.includes('past') || currentMoves.includes('future'))) {
      score += 2;
    }
    
    // Conditional pairs well with most structures
    if (move === 'conditional') {
      score += 1;
    }
    
    // Contrast is natural when sentence has structure
    if (move === 'contrast' && currentMoves.length > 0) {
      score += 1;
    }
    
    coherenceScores[move] = score;
  });
  
  const maxCoherence = Math.max(...Object.values(coherenceScores));
  const coherentMoves = candidateMoves.filter(m => coherenceScores[m] === maxCoherence);
  
  if (coherentMoves.length === 1) {
    return coherentMoves[0]; // Clear coherence winner
  }
  
  // TIER 4: PROFILE RARITY (final tie-break)
  if (coherentMoves.length > 1 && immersionProfile?.structuralMoves) {
    const profileMoves = immersionProfile.structuralMoves;
    
    // Sort by rarity (low count = rare = preferred)
    const sorted = coherentMoves.sort((a, b) => 
      (profileMoves[a] || 0) - (profileMoves[b] || 0)
    );
    
    return sorted[0];
  }
  
  // Default: first coherent move
  return coherentMoves[0];
}

/**
 * Generate next step with specific structural move
 */
async function generateStepWithMove(currentSentence, targetMove) {
  const moveInstructions = {
    past: 'Say this as something that already happened.',
    future: 'Say this as something that will happen later.',
    cause: 'Add a reason using "because" or "so".',
    conditional: 'Say what would happen if something changes.',
    contrast: 'Add an opposite idea using "but" or "although".'
};
  
  const prompt = `Transform this sentence to include exactly ONE structural element.

STRUCTURAL MOVE TO ADD: ${moveInstructions[targetMove]}

RULES:
1. Preserve the core meaning of the sentence.
2. Preserve existing structural elements already in the sentence.
3. Add ONLY the specified structural element.
4. Do NOT add new actors, entities, or named identities.
5. Do NOT invent new events or facts.
6. Keep the output coherent and natural.
7. Output maximum 1 sentence.
8. No questions, no teaching language, no commentary.

CURRENT SENTENCE: ${currentSentence}

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
          temperature: 0.3, // Slight variability for naturalness
          seed: 42,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error('Step generation API error');
    }

    const data = await response.json();
    const output = data.response.trim();
    
    // Validate: no invented entities
    if (hasInventedEntities(output, currentSentence)) {
      return null;
    }
    
    // Validate: target move was added
    const newMoves = detectMovesInSentence(output);
    if (!newMoves.includes(targetMove)) {
      return null;
    }
    
    // Validate: no questions
    if (output.includes('?')) {
      return null;
    }
    
    return output;
  } catch (error) {
    console.error('Error generating step:', error);
    return null;
  }
}

/**
 * Generate complete structural chain
 * @param {string} userSentence - User's input sentence
 * @param {Object} profileReadOnly - Immersion profile (read-only)
 * @returns {Array} Chain of sentences with metadata
 */
export async function generateChain(userSentence, profileReadOnly) {
  const MAX_STEPS = 3;
  
  // Dev mode: verify profile not mutated
  const profileSnapshot = process.env.NODE_ENV === 'development' 
    ? JSON.stringify(profileReadOnly) 
    : null;
  
  const chain = [];
  
  // Step 0: Generate base rewrite
  const baseSentence = await generateBaseRewrite(userSentence);
  
  if (!baseSentence) {
    return null; // Failed to generate base
  }
  
  chain.push({
    text: baseSentence,
    moves: detectMovesInSentence(baseSentence),
    isBase: true
  });
  
  // Steps 1-3: Generate chain
  let currentSentence = baseSentence;
  
  for (let i = 0; i < MAX_STEPS; i++) {
    // Select next move
    const nextMove = selectNextMove(currentSentence, chain, profileReadOnly);
    
    if (!nextMove) {
      break; // No compatible move, stop chain
    }
    
    // Generate step with selected move
    const nextSentence = await generateStepWithMove(currentSentence, nextMove);
    
    if (!nextSentence) {
      break; // Generation failed, stop chain
    }
    
    // Add to chain
    chain.push({
      text: nextSentence,
      moves: detectMovesInSentence(nextSentence),
      addedMove: nextMove,
      isBase: false
    });
    
    currentSentence = nextSentence;
  }
  
  // Dev mode: verify profile unchanged
  if (profileSnapshot && JSON.stringify(profileReadOnly) !== profileSnapshot) {
    console.error('VIOLATION: Profile was mutated in playground!');
  }
  
  return chain;
}
