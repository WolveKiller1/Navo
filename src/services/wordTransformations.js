/**
 * Chapter 4, Phase 1: Word Transformation Service
 * Simple hardcoded options - NO LLM calls
 * Fast and deterministic
 */

// Time words - most common transformations
const timeOptions = {
  'yesterday': ['today', 'tomorrow'],
  'today': ['yesterday', 'tomorrow'],
  'tomorrow': ['today', 'yesterday'],
  'now': ['later', 'then'],
  'later': ['now', 'soon'],
  'then': ['now', 'later'],
  'last night': ['this morning', 'yesterday'],
  'this morning': ['last night', 'today'],
  'right now': ['later', 'soon']
};

// Pronouns
const pronounOptions = {
  'i': ['he', 'she', 'they'],
  'he': ['I', 'she', 'they'],
  'she': ['I', 'he', 'they'],
  'they': ['I', 'we'],
  'we': ['I', 'they'],
  'you': ['I', 'they']
};

// Simple location words
const locationOptions = {
  'here': ['there', 'home'],
  'there': ['here', 'home'],
  'home': ['here', 'there']
};

// Objects
const objectOptions = {
  'phone': ['keys', 'wallet', 'bag'],
  'keys': ['phone', 'wallet', 'bag'],
  'wallet': ['phone', 'keys', 'bag'],
  'bag': ['phone', 'keys', 'wallet'],
  'book': ['charger', 'computer', 'backpack'],
  'charger': ['book', 'computer', 'backpack'],
  'computer': ['book', 'charger', 'backpack'],
  'backpack': ['book', 'charger', 'computer']
};

// Places
const placeOptions = {
  'home': ['school', 'work', 'the store'],
  'school': ['home', 'work', 'the park'],
  'work': ['home', 'school', 'the office'],
  'the store': ['home', 'the park', 'the gym'],
  'the park': ['school', 'the store', 'the gym'],
  'the gym': ['the store', 'the park', 'the office'],
  'my house': ['school', 'work', 'the store'],
  'the office': ['work', 'the gym', 'my house']
};

// People
const peopleOptions = {
  'my friend': ['my brother', 'my sister', 'my mom'],
  'my brother': ['my friend', 'my sister', 'my dad'],
  'my sister': ['my friend', 'my brother', 'my mom'],
  'my mom': ['my friend', 'my dad', 'my teacher'],
  'my dad': ['my brother', 'my mom', 'my teacher'],
  'my teacher': ['my mom', 'my dad', 'someone'],
  'someone': ['my friend', 'my teacher', 'a stranger'],
  'a stranger': ['someone', 'my friend', 'my teacher']
};

// Descriptors
const descriptorOptions = {
  'big': ['small', 'new', 'old'],
  'small': ['big', 'new', 'old'],
  'new': ['big', 'small', 'old'],
  'old': ['big', 'small', 'new'],
  'good': ['bad', 'expensive', 'cheap'],
  'bad': ['good', 'expensive', 'cheap'],
  'expensive': ['good', 'bad', 'cheap'],
  'cheap': ['good', 'bad', 'expensive']
};

// Quantities
const quantityOptions = {
  'a lot': ['a little', 'a few', 'some'],
  'a little': ['a lot', 'a few', 'some'],
  'a few': ['a lot', 'a little', 'some'],
  'some': ['a lot', 'a little', 'a few'],
  'many': ['a lot', 'a few', 'some'],
  'once': ['twice', 'a few', 'some'],
  'twice': ['once', 'a few', 'some']
};

/**
 * Get quick replacement options for a word
 * Returns array of 0-3 simple options based on heuristics
 * @param {string} word - The word to get options for
 * @param {number} wordIndex - Index in sentence (unused but available for future)
 * @param {string} sentence - Full sentence context (unused but available for future)
 * @returns {string[]} Array of 0-3 replacement options
 */
export function getWordOptions(word, wordIndex, sentence) {
  const lowerWord = word.toLowerCase();
  
  // Time words
  if (timeOptions[lowerWord]) {
    return timeOptions[lowerWord];
  }
  
  // Pronouns
  if (pronounOptions[lowerWord]) {
    return pronounOptions[lowerWord];
  }
  
  // Simple location words
  if (locationOptions[lowerWord]) {
    return locationOptions[lowerWord];
  }
  
  // Objects
  if (objectOptions[lowerWord]) {
    return objectOptions[lowerWord];
  }
  
  // Places
  if (placeOptions[lowerWord]) {
    return placeOptions[lowerWord];
  }
  
  // People
  if (peopleOptions[lowerWord]) {
    return peopleOptions[lowerWord];
  }
  
  // Descriptors
  if (descriptorOptions[lowerWord]) {
    return descriptorOptions[lowerWord];
  }
  
  // Quantities
  if (quantityOptions[lowerWord]) {
    return quantityOptions[lowerWord];
  }
  
  // No options available - user will use custom input
  return [];
}
