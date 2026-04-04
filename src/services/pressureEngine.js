/**
 * Pressure Engine: Structural Pressure Selection
 * Selects ONE structural pressure dynamically for user-driven evolution
 * 
 * Phase 9 Revision: User-driven pressure system
 * - 4-tier selection: compatibility → non-dominance → coherence → profile rarity
 * - NO AI-generated solutions
 * - Profile read-only (no mutations)
 */

import { detectMoves, ACTIVE_MOVES } from './structureUtils';

/**
 * Select next structural pressure
 * 
 * @param {string} currentSentence - Current sentence (raw or stabilized)
 * @param {Array} pressureHistory - In-memory pressure history for this session
 * @param {Object} immersionProfile - Immersion profile (read-only)
 * @returns {Object} { move, description } or null if no compatible pressure
 */
export function selectNextPressure(currentSentence, pressureHistory, immersionProfile) {
  // Dev mode: verify profile not mutated
  const profileSnapshot = process.env.NODE_ENV === 'development' 
    ? JSON.stringify(immersionProfile) 
    : null;
  
  // Detect moves in current sentence
  const currentMoves = detectMoves(currentSentence);
  
  // Count moves in pressure history
  const moveCounts = {};
  pressureHistory.forEach(m => moveCounts[m] = (moveCounts[m] || 0) + 1);
  
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
    // Dev mode assertion
    assertProfileUnchanged(immersionProfile, profileSnapshot);
    return null; // No compatible pressure
  }
  
  // TIER 2: NON-DOMINANCE (soft filter)
  const nonDominantMoves = compatibleMoves.filter(move => 
    (moveCounts[move] || 0) < 2
  );
  
  const candidateMoves = nonDominantMoves.length > 0 
    ? nonDominantMoves 
    : compatibleMoves;
  
  if (candidateMoves.length === 1) {
    assertProfileUnchanged(immersionProfile, profileSnapshot);
    return formatPressure(candidateMoves[0]);
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
    assertProfileUnchanged(immersionProfile, profileSnapshot);
    return formatPressure(coherentMoves[0]);
  }
  
  // TIER 4: PROFILE RARITY (final tie-break)
  if (coherentMoves.length > 1 && immersionProfile?.structuralMoves) {
    const profileMoves = immersionProfile.structuralMoves;
    
    // Sort by rarity (low count = rare = preferred)
    const sorted = coherentMoves.sort((a, b) => 
      (profileMoves[a] || 0) - (profileMoves[b] || 0)
    );
    
    assertProfileUnchanged(immersionProfile, profileSnapshot);
    return formatPressure(sorted[0]);
  }
  
  // Default: first coherent move
  assertProfileUnchanged(immersionProfile, profileSnapshot);
  return formatPressure(coherentMoves[0]);
}

/**
 * Format pressure as display object
 */
function formatPressure(move) {
  const descriptions = {
    past: 'say it in the past',
    future: 'say it in the future',
    cause: 'give a reason',
    conditional: 'say what would happen if',
    contrast: 'say the opposite'
};
  
  return {
    move,
    description: descriptions[move]
  };
}

/**
 * Assert profile unchanged (dev mode only)
 */
function assertProfileUnchanged(profile, snapshot) {
  if (snapshot && JSON.stringify(profile) !== snapshot) {
    console.error('VIOLATION: Profile mutated in pressureEngine!');
  }
}
