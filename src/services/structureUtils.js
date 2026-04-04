/**
 * Structure Utilities: Shared Structural Analysis and Validation
 * Reusable helpers extracted from chainEngine for playground components
 * 
 * Used by:
 * - pressureEngine.js
 * - variationEngine.js
 * - stabilizeGrammar.js
 */

// Active structural moves for playground
export const ACTIVE_MOVES = ['past', 'future', 'cause', 'conditional', 'contrast'];

// Group nouns for entity detection (Phase 7 guard)
export const GROUP_NOUNS = [
  'family', 'families', 'friend', 'friends', 'kid', 'kids', 
  'parent', 'parents', 'wife', 'husband', 'brother', 'sister', 
  'brothers', 'sisters', 'children', 'child'
];

/**
 * Detect structural moves present in a sentence
 */
export function detectMoves(sentence) {
  const moves = {
    past: /\b(went|did|was|were|had|made|got|saw|came|took)\b|(\w{5,}ed\b)/i.test(sentence),
    future: /\b(will|going to|gonna)\b/i.test(sentence),
    cause: /\b(because|so)\b/i.test(sentence),
    conditional: /\b(if|would)\b/i.test(sentence),
    contrast: /\b(but|although|even though)\b/i.test(sentence)
  };
  
  return Object.keys(moves).filter(move => moves[move]);
}

/**
 * Extract entities from text (capitalized words + group nouns)
 */
export function extractEntities(text) {
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
export function hasInventedEntities(newText, sourceText) {
  const newEntities = extractEntities(newText);
  const sourceEntities = extractEntities(sourceText);
  
  // Find entities in new text not in source
  const invented = Array.from(newEntities).filter(e => !sourceEntities.has(e));
  
  return invented.length > 0;
}

/**
 * Extract key nouns from sentence
 * Used for variation validation (prevent noun substitution)
 */
export function extractKeyNouns(sentence) {
  const stopwords = new Set([
    'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 
    'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'can', 'could', 'should', 'may', 'might', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
    'our', 'their', 'this', 'that', 'these', 'those'
  ]);
  
  const words = sentence.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
  
  return words;
}

/**
 * Check if variation substitutes key nouns from original
 * Example: "store" → "grocery store" is a substitution
 */
export function hasSubstitutedNouns(variation, original) {
  const origNouns = extractKeyNouns(original);
  const varNouns = extractKeyNouns(variation);
  
  // Check for missing core nouns and new specific nouns
  const missing = origNouns.filter(n => !varNouns.some(vn => vn.includes(n) || n.includes(vn)));
  const added = varNouns.filter(n => !origNouns.some(on => on.includes(n) || n.includes(on)));
  
  // If core nouns are replaced, it's a substitution
  if (missing.length > 0 && added.length > 0) {
    return true;
  }
  
  return false;
}

/**
 * Validate that text contains no questions
 */
export function validateNoQuestions(text) {
  return !text.includes('?');
}

/**
 * Validate that text is a single sentence
 */
export function validateSingleSentence(text) {
  const sentences = text.match(/[.!?]+/g);
  return !sentences || sentences.length <= 1;
}
