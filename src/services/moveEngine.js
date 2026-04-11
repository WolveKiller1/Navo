/**
 * Move Engine: Two-Pass Governance for Free-Room Conversation
 * Enforces structural invariants deterministically.
 * Draft input → governed output.
 * 
 * Phase 7 implementation - applies ONLY to free-room (/room)
 */

// Local aggregate counters (in-memory, no timestamps)
let counters = {
  totalProcessed: 0,
  phrasesStripped: 0,
  sentencesTrimmed: 0,
  questionsTrimmed: 0,
  lexicalPrunings: 0,
  contextInventionRemoved: 0,
  fallbacksApplied: 0
};

// Forbidden language patterns
const TUTORING_PATTERNS = /\b(should|try|practice|remember|tip|advice|let's practice|here's how|you can|you could|you might|I suggest|I recommend|keep practicing)\b/i;
const EVALUATION_PATTERNS = /\b(good job|great job|well done|excellent|correct|incorrect|better|improve|natural|sounds good|that's right|that's wrong|almost|close|you're doing)\b/i;
const META_COMMENTARY_PATTERNS = /\b(you're?\s+(curious|wondering|thinking|interested|uncertain|confused|hesitant)|you(?:'ve| have)?\s+(wrapped up|mentioned|said|asked|explained)|it sounds like|it seems like|it looks like|it feels like|what you mean is)\b/i;

const STOPWORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'about', 'like', 'through', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'and', 'or', 'but', 'if', 'so', 'not', 'no', 'yes']);

// Acknowledgment patterns - responses that are valid conversation even if short
const ACKNOWLEDGMENT_PATTERNS = /\b(thank you|thanks|thank|yes|yeah|yep|no|nope|okay|ok|good|that's good|that's right|exactly|right|true|correct|sure|absolutely|definitely|of course|i know|i agree|i see|understood|got it|makes sense|me too|same|likewise|for sure|you're right|you're correct|i know right)\b/i;

/**
 * Detect if user input is an acknowledgment (short, affirmative, conversational)
 */
function isAcknowledgment(userInput) {
  if (!userInput || userInput.trim().length === 0) return false;
  
  const trimmed = userInput.trim().toLowerCase();
  const words = trimmed.split(/\s+/);

  if (words.length <= 12 && ACKNOWLEDGMENT_PATTERNS.test(trimmed)) {
    return true;
  }

  // allow some patterns with optional derived speech style
  if (words.length <= 12 && /\b(well(,|\s)? that's good to hear|i know right|i know right what should i do about it|what about me|cuz i just wondering how you doing)\b/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Extract content words from text (with light stemming)
 */
function extractContentWords(text) {
  if (!text) return new Set();
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  const contentWords = new Set();
  
  words.forEach(word => {
    let stem = word;
    if (word.length > 4) {
      stem = word.replace(/s$|ed$|ing$/, '');
    }
    
    if (!STOPWORDS.has(stem) && stem.length > 2) {
      contentWords.add(stem);
    }
  });
  
  return contentWords;
}

/**
 * Compute repair_required
 */
function computeRepairRequired(userInput) {
  const words = userInput.trim().split(/\s+/);
  // Only flag single-word inputs as needing repair
  // Short but grammatically complete inputs (e.g., "yes it is", "I know right") are fine
  if (words.length <= 1) return true;
  
  return false;
}

/**
 * Detect sentence limit violation
 */
function detectSentenceLimit(text, repairRequired) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const count = sentences.length;
  
  if (repairRequired) {
    if (count === 3) {
      const thirdSentence = sentences[2];
      if (!thirdSentence.includes('?')) return true;
    }
    return count > 3;
  }
  
  return count > 2;
}

/**
 * Detect question limit violation
 */
function detectQuestionLimit(text) {
  const questions = text.match(/\?/g);
  const count = questions ? questions.length : 0;
  return count > 1;
}

/**
 * Detect forbidden tutoring language
 */
function detectForbiddenTutoring(text) {
  return TUTORING_PATTERNS.test(text);
}

/**
 * Detect forbidden evaluation language
 */
function detectForbiddenEvaluation(text) {
  return EVALUATION_PATTERNS.test(text);
}

/**
 * Detect forbidden meta-commentary language
 */
function detectForbiddenMetaCommentary(text) {
  return META_COMMENTARY_PATTERNS.test(text);
}

/**
 * Extract entities (capitalized words + group nouns)
 * Phase 7 Patch: Anti-invention guard
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
  
  // Group nouns (fixed list)
  const groupNouns = ['family', 'families', 'friend', 'friends', 'kid', 'kids', 'parent', 'parents', 'wife', 'husband', 'brother', 'sister', 'brothers', 'sisters', 'children', 'child'];
  groupNouns.forEach(noun => {
    if (text.toLowerCase().includes(noun)) {
      entities.add(noun);
    }
  });
  
  return entities;
}

/**
 * Detect invented entities/actors
 */
function detectInventedEntities(draft, userInput, learnerLast) {
  const draftEntities = extractEntities(draft);
  const userEntities = extractEntities(userInput);
  const lastEntities = learnerLast ? extractEntities(learnerLast) : new Set();
  
  // Combine known entities
  const knownEntities = new Set([...userEntities, ...lastEntities]);
  
  // Find new entities in draft
  const newEntities = Array.from(draftEntities).filter(e => !knownEntities.has(e));
  
  return newEntities.length > 0;
}

/**
 * Detect invented context (original + entity guard)
 * PHASE 14: Made less aggressive to avoid false positives
 */
function detectInventedContext(draft, userInput, learnerLast) {
  const userWords = userInput.trim().split(/\s+/);
  
  // Only flag if input is very short (1-2 words) AND draft is very elaborate
  if (userWords.length <= 2) {
    const draftWords = draft.split(/\s+/).length;
    if (draftWords > 15 && !draft.includes('?')) {
      return true;
    }
  }
  
  // Don't flag invented context for normal conversations
  return false;
}

/**
 * Detect lexical budget violation
 * PHASE 14: Made less aggressive - allow more new words
 * PHASE 15: Skip violation check for acknowledgments + opening context
 */
function detectLexicalBudgetViolation(draft, userInput, learnerLast, isAcknowledgmentInput = false, isOpeningExchange = false) {
  // Don't apply strict lexical budget to acknowledgments or opening exchanges
  if (isAcknowledgmentInput || isOpeningExchange) {
    return false;
  }
  
  const draftWords = extractContentWords(draft);
  const userWords = extractContentWords(userInput);
  const lastWords = learnerLast ? extractContentWords(learnerLast) : new Set();
  
  const knownWords = new Set([...userWords, ...lastWords]);
  
  const newWords = Array.from(draftWords).filter(w => !knownWords.has(w));
  
  // PHASE 14: Increased threshold from 1 to 3 to reduce false positives
  // PHASE 15: make even less strict for natural chat context
  return newWords.length > 5;
}

/**
 * Detect all violations
 * PHASE 15: Skip certain violations for acknowledgments
 */
function detectViolations(modelDraft, userInput, learnerLast, isAcknowledgmentInput, isOpeningExchange) {
  const violations = [];
  const repairRequired = computeRepairRequired(userInput);
  
  if (detectSentenceLimit(modelDraft, repairRequired)) {
    violations.push('SENTENCE_LIMIT');
  }
  
  if (detectQuestionLimit(modelDraft)) {
    violations.push('QUESTION_LIMIT');
  }
  
  if (detectForbiddenTutoring(modelDraft)) {
    violations.push('FORBIDDEN_TUTORING');
  }
  
  if (detectForbiddenEvaluation(modelDraft)) {
    violations.push('FORBIDDEN_EVALUATION');
  }
  
  if (detectForbiddenMetaCommentary(modelDraft)) {
    violations.push('FORBIDDEN_META');
  }

  
  if (detectLexicalBudgetViolation(modelDraft, userInput, learnerLast, isAcknowledgmentInput, isOpeningExchange)) {
    violations.push('LEXICAL_BUDGET');
  }
  
  return { violations, repairRequired };
}

/**
 * Strip forbidden phrases
 */
function stripForbiddenPhrases(text) {
  let result = text;
  
  // Remove tutoring phrases
  result = result.replace(/\b(should|try to|practice|remember|here's a tip|I suggest|I recommend|keep practicing)\b[^.!?]*/gi, '');
  
  // Remove evaluation phrases
  result = result.replace(/\b(good job|great job|well done|excellent|correct|better|natural|sounds good|that's right|almost|you're doing well)\b[^.!?]*/gi, '');
  
  // Remove meta-commentary phrasing
  result = result.replace(META_COMMENTARY_PATTERNS, '');
  
  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Trim sentences and questions
 */
function trimSentencesAndQuestions(text, repairRequired) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const maxSentences = repairRequired ? 3 : 2;
  
  let trimmed;
  
  if (repairRequired && sentences.length === 3) {
    const thirdSentence = sentences[2];
    if (!thirdSentence.includes('?')) {
      trimmed = sentences.slice(0, 2).join(' ');
    } else {
      trimmed = sentences.join(' ');
    }
  } else {
    trimmed = sentences.slice(0, maxSentences).join(' ');
  }
  
  // Ensure max 1 question mark
  const questionCount = (trimmed.match(/\?/g) || []).length;
  if (questionCount > 1) {
    const parts = trimmed.split('?');
    trimmed = parts[0] + '?' + parts.slice(1).join('').replace(/\?/g, '.');
  }
  
  return trimmed.trim();
}

/**
 * Enforce lexical budget (simplified pruning)
 */
function enforceLexicalBudget(text, userInput, learnerLast) {
  // Check if already compliant
  if (!detectLexicalBudgetViolation(text, userInput, learnerLast)) {
    return text;
  }
  
  // Step 1: Drop sentence 2 if present
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length > 1) {
    const pruned = sentences[0];
    if (!detectLexicalBudgetViolation(pruned, userInput, learnerLast)) {
      return pruned;
    }
  }
  
  // Step 2: Remove trailing clauses
  let pruned = text.replace(/,\s+[^.!?]+(\.|\!|\?)/g, '$1');
  pruned = pruned.replace(/\s+(because|which|that|who|when|where)\s+[^.!?]+(\.|\!|\?)/gi, '$2');
  
  if (!detectLexicalBudgetViolation(pruned, userInput, learnerLast)) {
    return pruned;
  }
  
  // Step 3: If still violating, return null (route to fallback)
  return null;
}

/**
 * Remove invented context
 */
function removeInventedContext(draft, userInput) {
  const userWords = userInput.trim().split(/\s+/);

  if (userWords.length <= 2) {
    const anchor = getAnchor(userInput);
    if (anchor) {
      return `${anchor}. What about it?`;
    }
    return 'What do you mean?';
  }

  return generateFallback(userInput);
}

/**
 * Extract anchor word (last content word from input)
 * Filters out weak anchors that don't provide meaningful grounding
 */
function getAnchor(userInput) {
  const words = userInput.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  // Weak anchors that don't provide meaningful context
  const weakAnchors = new Set([
    'really', 'very', 'just', 'maybe', 'probably', 'actually', 
    'basically', 'literally', 'definitely', 'sure', 'okay',
    'thing', 'stuff', 'something', 'anything', 'nothing'
  ]);
  
  // Filter out stopwords, weak anchors, and find substantial content words
  const contentWords = words.filter(w => 
    !STOPWORDS.has(w) && 
    !weakAnchors.has(w) &&
    w.length > 3  // Require at least 4 characters for meaningful anchors
  );
  
  // Return last content word (capitalized), or null if none found
  if (contentWords.length > 0) {
    const anchor = contentWords[contentWords.length - 1];
    return anchor.charAt(0).toUpperCase() + anchor.slice(1);
  }
  return null;
}

/**
 * Generate grounded fallback (grammatically correct with mirror-first)
 * PHASE 14 FIX: Disable word-isolation patterns entirely
 * GUIDANCE EVOLUTION: More contextual and honest fallbacks
 * CLEANUP: Less interpretive, better anchor selection, natural clarification
 */
function generateFallback(userInput) {
  const anchor = getAnchor(userInput);
  
  // If no meaningful anchor, be direct about not understanding
  if (!anchor) {
    return "I'm not sure I caught that. Can you say more?";
  }
  
  // Acknowledge anchor but ask for expansion (not interpretation)
  return `I heard "${anchor.toLowerCase()}" - can you say more about that?`;
}

/**
 * Validate final message
 */
function isValid(text, repairRequired) {
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const hasForbidden = TUTORING_PATTERNS.test(text) || EVALUATION_PATTERNS.test(text) || META_COMMENTARY_PATTERNS.test(text);
  
  const maxSentences = repairRequired ? 3 : 2;
  
  return sentences <= maxSentences && questions <= 1 && !hasForbidden;
}

/**
 * Main entry point - Apply Move Engine governance
 * @param {string} modelDraft - Raw model output (never stored/spoken)
 * @param {string} userInput - Current user utterance
 * @param {string} learnerLast - Previous user utterance
 * @param {boolean} isOpeningExchange - True if this is the first exchange after opening context
 * @param {string} mode - 'conversation' or 'imitation'
 * @returns {{finalMessage: string, metadata: object}}
 */
export function applyMoveEngine(modelDraft, userInput, learnerLast, isOpeningExchange = false, mode = 'conversation') {
  counters.totalProcessed++;
  
  // IMITATION MODE: Apply tighter constraints for practice loop
  if (mode === 'imitation') {
    let result = modelDraft;
    
    // 1. Limit to first sentence only
    const sentences = result.match(/[^.!?]+[.!?]+/g) || [result];
    result = sentences[0] || result;
    
    // 2. Remove all questions
    result = result.replace(/\?/g, '.');
    
    // 3. Strip teaching/evaluation language (reuse existing patterns)
    if (TUTORING_PATTERNS.test(result) || EVALUATION_PATTERNS.test(result)) {
      result = stripForbiddenPhrases(result);
    }
    
    // 4. If result is empty or too short after stripping, use simple recast
    if (!result.trim() || result.trim().length < 3) {
      result = userInput + '.';
    }
    
    return {
      finalMessage: result.trim(),
      metadata: {
        mode: 'imitation',
        wasModified: true,
        violations: [],
        modifications: ['imitation_constraints']
      }
    };
  }
  
  // CONVERSATION MODE: Original behavior
  // Detect if user input is an acknowledgment
  const isAcknowledgmentInput = isAcknowledgment(userInput);
  
  // Pass 1: Detect violations + compute repair_required
  const { violations, repairRequired } = detectViolations(
    modelDraft, 
    userInput, 
    learnerLast,
    isAcknowledgmentInput,
    isOpeningExchange
  );
  
  // Pass 2: Enforce (in order)
  let finalMessage = modelDraft;
  let wasModified = false;
  const modifications = [];
  
  if (violations.length > 0) {
    wasModified = true;
    
    // 1. Strip forbidden phrases
    if (violations.includes('FORBIDDEN_TUTORING') || violations.includes('FORBIDDEN_EVALUATION')) {
      finalMessage = stripForbiddenPhrases(finalMessage);
      modifications.push('stripped_phrases');
      counters.phrasesStripped++;
    }
    
    // 2. Trim extra sentences/questions
    if (violations.includes('SENTENCE_LIMIT') || violations.includes('QUESTION_LIMIT')) {
      finalMessage = trimSentencesAndQuestions(finalMessage, repairRequired);
      modifications.push('trimmed');
      counters.sentencesTrimmed++;
    }
    
    // 3. Enforce lexical budget
    if (violations.includes('LEXICAL_BUDGET')) {
      const pruned = enforceLexicalBudget(finalMessage, userInput, learnerLast);
      if (pruned === null) {
        finalMessage = generateFallback(userInput);
        modifications.push('fallback');
        counters.fallbacksApplied++;
      } else {
        finalMessage = pruned;
        modifications.push('lexical_pruning');
        counters.lexicalPrunings++;
      }
    }
    
    // 4. Remove invented context
    if (violations.includes('INVENTED_CONTEXT')) {
      finalMessage = removeInventedContext(finalMessage, userInput);
      modifications.push('context_removed');
      counters.contextInventionRemoved++;
    }
    
    // 5. Fallback if still invalid (but skip for acknowledgments and opening exchanges)
    if (!isValid(finalMessage, repairRequired)) {
      if (!isAcknowledgmentInput && !isOpeningExchange) {
        finalMessage = generateFallback(userInput);
        modifications.push('fallback');
        counters.fallbacksApplied++;
      }
    }
  }
  
  return {
    finalMessage,
    metadata: {
      wasModified,
      violations,
      modifications,
      repairRequired,
      isAcknowledgment: isAcknowledgmentInput,
      isOpeningExchange,
      counters: { ...counters }
    }
  };
}

/**
 * Export counters for inspection
 */
export function getCounters() {
  return { ...counters };
}

/**
 * Reset counters (for testing)
 */
export function resetCounters() {
  counters = {
    totalProcessed: 0,
    phrasesStripped: 0,
    sentencesTrimmed: 0,
    questionsTrimmed: 0,
    lexicalPrunings: 0,
    contextInventionRemoved: 0,
    fallbacksApplied: 0
  };
}
/** this was  edited on my phone */