/**
 * Immersion Profile Service
 * Analyzes session data and updates linguistic complexity profile
 * Profile influences conversation constraints but NOT tone/evaluation
 */

const DEFAULT_PROFILE = {
  key: 'current',
  depth: 1.5,           // Conservative start (0.0-4.0)
  dimensions: {
    S: 1.5,             // Syntactic complexity
    M: 1.5,             // Morphology
    P: 1.8,             // Prosody/rhythm
    T: 1.5,             // Topic maturity
    R: 2.0              // Recast sensitivity
  },
  lastUpdated: Date.now(),
  sessionCount: 0,
  // Phase 8: Structural move tracking (aggregate counters only)
  structuralMoves: {
    past: 0,
    future: 0,
    cause: 0,
    conditional: 0,
    contrast: 0,
    question: 0
  }
};

/**
 * Get default profile
 */
export function getDefaultProfile() {
  return {
    ...DEFAULT_PROFILE,
    lastUpdated: Date.now()
  };
}

/**
 * Phase 8: Detect structural moves in user utterances
 * @param {Array} userUtterances - Array of user text strings
 * @returns {Object} Detected move counts per category (max +1 per category per message)
 */
export function detectStructuralMoves(userUtterances) {
  const counts = {
    past: 0,
    future: 0,
    cause: 0,
    conditional: 0,
    contrast: 0,
    question: 0
  };
  
  if (!userUtterances || userUtterances.length === 0) {
    return counts;
  }
  
  for (const text of userUtterances) {
    const lowerText = text.toLowerCase();
    
    // PAST: past tense markers
    if (/\b(went|did|was|were|had|made|got|saw|came|took)\b/.test(lowerText)) {
      counts.past += 1;
    } else {
      // Check for -ed verbs (simple heuristic, avoid short words)
      const edWords = lowerText.match(/\b\w{5,}ed\b/g);
      if (edWords && edWords.length > 0) {
        counts.past += 1;
      }
    }
    
    // FUTURE: will, going to, gonna
    if (/\b(will|going to|gonna)\b/.test(lowerText)) {
      counts.future += 1;
    }
    
    // CAUSE: because (+ optionally "so" in causal contexts)
    if (/\bbecause\b/.test(lowerText)) {
      counts.cause += 1;
    } else if (/\bso\b/.test(lowerText)) {
      // Only count "so" if it appears mid-sentence
      const soIndex = lowerText.indexOf(' so ');
      if (soIndex > 2 && soIndex < lowerText.length - 10) {
        counts.cause += 1;
      }
    }
    
    // CONDITIONAL: if, would
    if (/\b(if|would)\b/.test(lowerText)) {
      counts.conditional += 1;
    }
    
    // CONTRAST: but, although, even though
    if (/\b(but|although|even though)\b/.test(lowerText)) {
      counts.contrast += 1;
    }
    
    // QUESTION: contains ? OR begins with wh-word
    if (text.includes('?')) {
      counts.question += 1;
    } else if (/^(who|what|when|where|why|how)\b/i.test(text.trim())) {
      counts.question += 1;
    }
  }
  
  return counts;
}

/**
 * Analyze session data and compute aggregates
 * @param {Array} userUtterances - Array of user text strings
 * @param {number} sessionDuration - Total session time in ms
 * @param {Array} turnGaps - Array of inter-turn gaps in ms (capped at 30)
 * @returns {Object} Session analysis with text + timing aggregates
 */
export function analyzeSession(userUtterances, sessionDuration, turnGaps) {
  if (!userUtterances || userUtterances.length === 0) {
    return null;
  }

  const totalTurns = userUtterances.length;
  let totalWords = 0;
  let fragmentCount = 0;
  let questionCount = 0;

  // Analyze each utterance
  userUtterances.forEach(text => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    totalWords += wordCount;

    if (wordCount < 5) {
      fragmentCount++;
    }

    if (text.includes('?')) {
      questionCount++;
    }
  });

  const avgUtteranceWords = totalWords / totalTurns;
  const fragmentRate = fragmentCount / totalTurns;
  const questionRatio = questionCount / totalTurns;

  // Timing aggregates
  let medianTurnGap = 0;
  let longestPause = 0;
  let turnsPerMinute = 0;

  if (turnGaps && turnGaps.length > 0) {
    const sortedGaps = [...turnGaps].sort((a, b) => a - b);
    const midIndex = Math.floor(sortedGaps.length / 2);
    medianTurnGap = sortedGaps.length % 2 === 0
      ? (sortedGaps[midIndex - 1] + sortedGaps[midIndex]) / 2
      : sortedGaps[midIndex];
    longestPause = Math.max(...turnGaps);
  }

  if (sessionDuration > 0) {
    turnsPerMinute = (totalTurns / sessionDuration) * 60000;
  }

  return {
    totalTurns,
    sessionDuration,
    medianTurnGap,
    turnsPerMinute,
    longestPause,
    avgUtteranceWords,
    fragmentRate,
    questionRatio,
    questionCount
  };
}

/**
 * Update profile based on session analysis
 * @param {Object} analysis - Session analysis object
 * @param {Object} currentProfile - Current immersion profile
 * @param {Object} moveCounts - Phase 8: Structural move counts (optional)
 * @returns {Object} Updated profile
 */
export function updateProfile(analysis, currentProfile, moveCounts = null) {
  if (!analysis || analysis.totalTurns < 4) {
    // Don't update profile for sessions with fewer than 4 turns
    return currentProfile;
  }

  const newProfile = { ...currentProfile };
  newProfile.dimensions = { ...currentProfile.dimensions };
  
  // Phase 8: Update structural moves (aggregate counters)
  if (moveCounts && currentProfile.structuralMoves) {
    newProfile.structuralMoves = {
      past: currentProfile.structuralMoves.past + moveCounts.past,
      future: currentProfile.structuralMoves.future + moveCounts.future,
      cause: currentProfile.structuralMoves.cause + moveCounts.cause,
      conditional: currentProfile.structuralMoves.conditional + moveCounts.conditional,
      contrast: currentProfile.structuralMoves.contrast + moveCounts.contrast,
      question: currentProfile.structuralMoves.question + moveCounts.question
    };
  } else if (!newProfile.structuralMoves) {
    // Initialize if missing (for existing profiles)
    newProfile.structuralMoves = {
      past: 0,
      future: 0,
      cause: 0,
      conditional: 0,
      contrast: 0,
      question: 0
    };
  }

  // --- DEPTH UPDATE (TEXT-ONLY, max ±0.25) ---
  let depthDelta = 0;

  // Increase depth signals
  if (analysis.fragmentRate < 0.15) depthDelta += 0.1;         // sustained coherence
  if (analysis.avgUtteranceWords > 15) depthDelta += 0.1;      // longer utterances
  if (analysis.questionRatio > 0.3) depthDelta += 0.05;        // active engagement

  // Decrease depth signals
  if (analysis.fragmentRate > 0.4) depthDelta -= 0.15;         // high fragmentation
  if (analysis.avgUtteranceWords < 5) depthDelta -= 0.1;       // very short utterances
  if (analysis.totalTurns >= 4 && analysis.avgUtteranceWords < 3) depthDelta -= 0.1; // minimal output

  // Clamp depth delta to ±0.25
  depthDelta = clamp(depthDelta, -0.25, 0.25);
  newProfile.depth = clamp(currentProfile.depth + depthDelta, 0, 4);

  // --- DIMENSION UPDATES (max ±0.5, clamped to depth±1) ---

  // S (syntactic): text-driven with slight timing influence
  let sDelta = 0;
  if (analysis.avgUtteranceWords > 15) sDelta += 0.3;
  if (analysis.fragmentRate > 0.3) sDelta -= 0.3;
  if (analysis.turnsPerMinute > 2.5) sDelta += 0.1; // ONLY timing influence on S
  sDelta = clamp(sDelta, -0.5, 0.5);

  // P (prosody): ONLY timing-driven
  let pDelta = 0;
  if (analysis.turnsPerMinute > 2.0) pDelta += 0.4;
  if (analysis.medianTurnGap < 2000) pDelta += 0.3;
  if (analysis.turnsPerMinute < 1.0) pDelta -= 0.3;
  if (analysis.longestPause > 12000) pDelta -= 0.2;
  pDelta = clamp(pDelta, -0.5, 0.5);

  // M (morphology): text-only
  let mDelta = 0;
  if (analysis.avgUtteranceWords > 12) mDelta += 0.2;
  if (analysis.fragmentRate < 0.2) mDelta += 0.2;
  if (analysis.fragmentRate > 0.4) mDelta -= 0.2;
  mDelta = clamp(mDelta, -0.5, 0.5);

  // T (topic maturity): text-only
  let tDelta = 0;
  if (analysis.totalTurns >= 10) tDelta += 0.2;
  if (analysis.questionRatio > 0.25) tDelta += 0.2;
  tDelta = clamp(tDelta, -0.5, 0.5);

  // R (recast sensitivity): text-only
  let rDelta = 0;
  if (analysis.fragmentRate > 0.3) rDelta += 0.3;
  if (analysis.avgUtteranceWords < 6) rDelta += 0.2;
  if (analysis.fragmentRate < 0.15) rDelta -= 0.2;
  rDelta = clamp(rDelta, -0.5, 0.5);

  // Apply dimension updates with depth±1 clamping
  newProfile.dimensions.S = clampToDial(currentProfile.dimensions.S + sDelta, newProfile.depth);
  newProfile.dimensions.P = clampToDial(currentProfile.dimensions.P + pDelta, newProfile.depth);
  newProfile.dimensions.M = clampToDial(currentProfile.dimensions.M + mDelta, newProfile.depth);
  newProfile.dimensions.T = clampToDial(currentProfile.dimensions.T + tDelta, newProfile.depth);
  newProfile.dimensions.R = clampToDial(currentProfile.dimensions.R + rDelta, newProfile.depth);

  newProfile.lastUpdated = Date.now();
  newProfile.sessionCount++;

  return newProfile;
}

/**
 * Build dynamic system prompt with profile constraints
 * @param {string} basePrompt - Base system prompt
 * @param {Object} profile - Current immersion profile
 * @returns {string} Enhanced system prompt with linguistic constraints
 */
export function buildPromptWithProfile(basePrompt, profile) {
  let constraints = '\n\n--- ADAPTIVE LINGUISTIC CONSTRAINTS ---\n';

  const { depth, dimensions } = profile;

  // Depth: sentence length & structural complexity
  if (depth < 1.5) {
    constraints += 'Keep sentences short (5-8 words). Use one idea per sentence.\n';
  } else if (depth < 2.5) {
    constraints += 'Use moderate sentence length (8-12 words). Occasional two-clause sentences acceptable.\n';
  } else if (depth < 3.5) {
    constraints += 'Use varied sentence length (10-15 words). Mix simple and compound structures.\n';
  } else {
    constraints += 'Use natural sentence variation. Complex structures and embedded clauses welcome.\n';
  }

  // S (syntactic): clause complexity
  if (dimensions.S < 1.5) {
    constraints += 'Syntax: One clause per sentence. Avoid embedding or subordination.\n';
  } else if (dimensions.S > 3.0) {
    constraints += 'Syntax: Use subordinate clauses, relative clauses, and varied word order naturally.\n';
  }

  // M (morphology): form variation
  if (dimensions.M < 1.5) {
    constraints += 'Morphology: Prefer simple, common word forms. Limit inflectional variation.\n';
  } else if (dimensions.M > 3.0) {
    constraints += 'Morphology: Use full range of grammatical forms naturally as context requires.\n';
  }

  // P (prosody): response pacing
  if (dimensions.P < 1.5) {
    constraints += 'Pacing: Keep responses brief and evenly structured. Avoid rapid topic shifts.\n';
  } else if (dimensions.P > 3.0) {
    constraints += 'Pacing: Vary response rhythm and length naturally with conversational momentum.\n';
  }

  // T (topic maturity): concreteness
  if (dimensions.T < 1.5) {
    constraints += 'Topics: Stay concrete and observable. Avoid abstractions or cultural references.\n';
  } else if (dimensions.T > 3.0) {
    constraints += 'Topics: Engage with abstract concepts and cultural context as conversation allows.\n';
  }

  // R (recast sensitivity): correction policy
  if (dimensions.R < 1.5) {
    constraints += 'Recasts: Only recast critical errors that block understanding. Otherwise respond naturally without explicitly correcting.\n';
  } else if (dimensions.R > 3.0) {
    constraints += 'Recasts: Respond naturally without explicitly correcting; embed correct forms in flow when relevant.\n';
  }

  // Phase 8: Structural Move Bias (adjacent-push)
  const { structuralMoves } = profile;
  
  if (structuralMoves) {
    const moveEntries = Object.entries(structuralMoves);
    const totalMoves = moveEntries.reduce((sum, [_, count]) => sum + count, 0);
    
    if (totalMoves > 10) {
      constraints += '\n--- STRUCTURAL MOVE BIAS ---\n';
      
      // Sort by frequency
      const sorted = moveEntries.sort((a, b) => b[1] - a[1]);
      
      // Top 1-2 (frequent: >15% of total)
      const frequent = sorted.slice(0, 2)
        .filter(([_, count]) => count > totalMoves * 0.15)
        .map(([move, _]) => move);
      
      // Bottom 1-2 (rare: <10% of total)
      const rare = sorted.slice(-2)
        .filter(([_, count]) => count < totalMoves * 0.10)
        .map(([move, _]) => move);
      
      if (frequent.length > 0) {
        constraints += `Structures the learner uses often: ${frequent.join(', ')}.\n`;
      }
      
      if (rare.length > 0) {
        constraints += `Structures the learner uses rarely: ${rare.join(', ')}.\n`;
      }
      
      // Adjacent-push instruction (no coaching language)
      constraints += 'Prefer using the learner\'s frequent structures. Occasionally include at most one underused structure in the reply. Do not explain or evaluate.\n';
      
      constraints += '--- END STRUCTURAL MOVE BIAS ---\n';
    }
  }

  constraints += '--- END CONSTRAINTS ---\n';

  return basePrompt + constraints;
}

/**
 * Utility: Clamp value to range
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Utility: Clamp dimension value to depth±1 range
 */
function clampToDial(dimValue, depth) {
  const lower = Math.max(0, depth - 1);
  const upper = Math.min(4, depth + 1);
  return clamp(dimValue, lower, upper);
}
