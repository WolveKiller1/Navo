/**
 * Phrase Generator Service
 * Generates complete practice phrases from controlled patterns
 * NO live AI - local, deterministic generation only
 */

import { PHRASE_PATTERNS_PT } from '../data/phrasePatterns';

/**
 * Generate multiple phrases from a single pattern
 * @param {Object} pattern - The phrase pattern
 * @param {number} count - Number of phrases to generate
 * @returns {Array} Array of complete phrase objects
 */
export function generatePhrasesFromPattern(pattern, count = 5) {
  const phrases = [];
  
  // Handle special case: pre-built complete phrases
  if (pattern.phrases) {
    // Return pre-built phrases with generated IDs and explicit language
    return pattern.phrases.map((phrase, index) => ({
      id: `gen-${pattern.id}-${index}`,
      text: phrase.text,
      meaning: phrase.meaning,
      icon: phrase.icon,
      scene: phrase.scene,
      patternId: pattern.id,
      language: pattern.language || 'pt', // Explicit language metadata
      generated: true,
      words: phrase.words
    }));
  }
  
  // Generate combinations for templated patterns
  const combinations = generateCombinations(pattern, count);
  
  combinations.forEach((combo, index) => {
    const phrase = buildPhraseFromCombo(pattern, combo, index);
    phrases.push(phrase);
  });
  
  return phrases;
}

/**
 * Generate random combinations of slots
 * @param {Object} pattern - The phrase pattern
 * @param {number} count - Number of combinations to generate
 * @returns {Array} Array of slot combinations
 */
function generateCombinations(pattern, count) {
  const combinations = [];
  const used = new Set();
  
  // Determine which slots exist
  const hasSubjectVerb = pattern.subjectVerb && pattern.subjectVerb.length > 0;
  const hasVerbs = pattern.verbs && pattern.verbs.length > 0;
  const hasObjects = pattern.objects && pattern.objects.length > 0;
  const hasLocations = pattern.locations && pattern.locations.length > 0;
  const hasTimes = pattern.times && pattern.times.length > 0;
  const hasEvents = pattern.events && pattern.events.length > 0;
  const hasStates = pattern.states && pattern.states.length > 0;
  const hasFeelings = pattern.feelings && pattern.feelings.length > 0;
  
  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loops
  
  while (combinations.length < count && attempts < maxAttempts) {
    attempts++;
    
    const combo = {};
    
    // Select from each slot randomly
    if (hasSubjectVerb) {
      combo.subjectVerb = pattern.subjectVerb[Math.floor(Math.random() * pattern.subjectVerb.length)];
    }
    if (hasVerbs) {
      combo.verb = pattern.verbs[Math.floor(Math.random() * pattern.verbs.length)];
    }
    if (hasObjects) {
      combo.object = pattern.objects[Math.floor(Math.random() * pattern.objects.length)];
    }
    if (hasLocations) {
      combo.location = pattern.locations[Math.floor(Math.random() * pattern.locations.length)];
    }
    if (hasTimes) {
      combo.time = pattern.times[Math.floor(Math.random() * pattern.times.length)];
    }
    if (hasEvents) {
      combo.event = pattern.events[Math.floor(Math.random() * pattern.events.length)];
    }
    if (hasStates) {
      combo.state = pattern.states[Math.floor(Math.random() * pattern.states.length)];
    }
    if (hasFeelings) {
      combo.feeling = pattern.feelings[Math.floor(Math.random() * pattern.feelings.length)];
    }
    
    // Create unique key for this combination
    const key = JSON.stringify(combo);
    
    // Only add if not already used
    if (!used.has(key)) {
      used.add(key);
      combinations.push(combo);
    }
  }
  
  return combinations;
}

/**
 * Get indices of combo slots within pattern arrays
 * @param {Object} pattern - The phrase pattern
 * @param {Object} combo - The slot combination
 * @returns {Object} Indices for each slot
 */
function getComboIndices(pattern, combo) {
  const indices = {};
  
  if (combo.subjectVerb && pattern.subjectVerb) {
    indices.subjectVerb = pattern.subjectVerb.findIndex(sv => 
      sv.subject === combo.subjectVerb.subject && sv.verb === combo.subjectVerb.verb
    );
  }
  
  if (combo.verb && pattern.verbs) {
    indices.verb = pattern.verbs.findIndex(v => v.verb === combo.verb.verb);
  }
  
  if (combo.object && pattern.objects) {
    indices.object = pattern.objects.findIndex(o => o.text === combo.object.text);
  }
  
  if (combo.location && pattern.locations) {
    indices.location = pattern.locations.findIndex(l => l.text === combo.location.text);
  }
  
  if (combo.time && pattern.times) {
    indices.time = pattern.times.findIndex(t => t.text === combo.time.text);
  }
  
  if (combo.event && pattern.events) {
    indices.event = pattern.events.findIndex(e => e.text === combo.event.text);
  }
  
  if (combo.state && pattern.states) {
    indices.state = pattern.states.findIndex(s => s.text === combo.state.text);
  }
  
  if (combo.feeling && pattern.feelings) {
    indices.feeling = pattern.feelings.findIndex(f => f.text === combo.feeling.text);
  }
  
  return indices;
}

/**
 * Get next item from array using offset (deterministic cycling)
 * @param {Array} array - Slot array
 * @param {number} currentIndex - Current index
 * @param {number} offset - How many steps forward (default 1)
 * @returns {*} Next item or null if not available
 */
function getNextSlotItem(array, currentIndex, offset = 1) {
  if (!array || array.length === 0 || currentIndex === -1) return null;
  const nextIndex = (currentIndex + offset) % array.length;
  return nextIndex !== currentIndex ? array[nextIndex] : null;
}

/**
 * Build a variation phrase from combo (for contextVariations)
 * @param {Object} pattern - The phrase pattern
 * @param {Object} combo - The slot combination
 * @returns {Object} Variation phrase object
 */
function buildVariationFromCombo(pattern, combo) {
  let text = pattern.template;
  let scene = pattern.sceneTemplate || '';
  
  // Replace placeholders
  if (combo.subjectVerb) {
    text = text.replace('{subject}', combo.subjectVerb.subject);
    text = text.replace('{verb}', combo.subjectVerb.verb);
    scene = scene.replace('{verbMeaning}', combo.subjectVerb.verbMeaning || '');
  }
  
  if (combo.verb) {
    text = text.replace('{verb}', combo.verb.verb);
    scene = scene.replace('{verbMeaning}', combo.verb.verbMeaning || '');
  }
  
  if (combo.object) {
    if (combo.object.article) {
      text = text.replace('{article}', combo.object.article);
    }
    text = text.replace('{object}', combo.object.text);
    scene = scene.replace('{objMeaning}', combo.object.meaning || '');
  }
  
  if (combo.location) {
    if (combo.location.prep) {
      text = text.replace('{prep}', combo.location.prep);
    }
    text = text.replace('{location}', combo.location.text);
    scene = scene.replace('{locMeaning}', combo.location.meaning || '');
  }
  
  if (combo.time) {
    text = text.replace('{time}', combo.time.text);
    scene = scene.replace('{timeMeaning}', combo.time.meaning || '');
  }
  
  if (combo.event) {
    text = text.replace('{event}', combo.event.text);
    scene = scene.replace('{eventMeaning}', combo.event.meaning || '');
  }
  
  if (combo.state) {
    text = text.replace('{state}', combo.state.text);
    scene = scene.replace('{stateMeaning}', combo.state.meaning || '');
  }
  
  if (combo.feeling) {
    text = text.replace('{feeling}', combo.feeling.text);
    scene = scene.replace('{feelMeaning}', combo.feeling.meaning || '');
  }
  
  // Get icon (priority: object > event > state > feeling > location > pattern default)
  const icon = combo.object?.icon || combo.event?.icon || combo.state?.icon || 
               combo.feeling?.icon || combo.location?.icon || pattern.icon;
  
  return {
    text,
    icon,
    scene: scene || null,
    patternId: pattern.id,
    generated: true
  };
}

/**
 * Build a stable pattern cluster (3-4 nearby variations)
 * Uses deterministic next-index selection, no randomness
 * @param {Object} pattern - The phrase pattern
 * @param {Object} combo - The original slot combination
 * @returns {Array} Array of variation phrases
 */
function buildPatternCluster(pattern, combo) {
  const indices = getComboIndices(pattern, combo);
  const cluster = [];
  const used = new Set([JSON.stringify(combo)]);
  
  // Priority: object > location/time > state/feeling/event > subjectVerb
  
  // Variation 1: Next object
  if (indices.object !== undefined && indices.object !== -1) {
    const nextObject = getNextSlotItem(pattern.objects, indices.object, 1);
    if (nextObject && cluster.length < 4) {
      const newCombo = { ...combo, object: nextObject };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 2: Next location
  if (indices.location !== undefined && indices.location !== -1 && cluster.length < 4) {
    const nextLocation = getNextSlotItem(pattern.locations, indices.location, 1);
    if (nextLocation) {
      const newCombo = { ...combo, location: nextLocation };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 3: Next time
  if (indices.time !== undefined && indices.time !== -1 && cluster.length < 4) {
    const nextTime = getNextSlotItem(pattern.times, indices.time, 1);
    if (nextTime) {
      const newCombo = { ...combo, time: nextTime };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 4: Second object (offset +2)
  if (indices.object !== undefined && indices.object !== -1 && cluster.length < 4) {
    const nextObject = getNextSlotItem(pattern.objects, indices.object, 2);
    if (nextObject) {
      const newCombo = { ...combo, object: nextObject };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 5: Next state
  if (indices.state !== undefined && indices.state !== -1 && cluster.length < 4) {
    const nextState = getNextSlotItem(pattern.states, indices.state, 1);
    if (nextState) {
      const newCombo = { ...combo, state: nextState };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 6: Next feeling
  if (indices.feeling !== undefined && indices.feeling !== -1 && cluster.length < 4) {
    const nextFeeling = getNextSlotItem(pattern.feelings, indices.feeling, 1);
    if (nextFeeling) {
      const newCombo = { ...combo, feeling: nextFeeling };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 7: Next event
  if (indices.event !== undefined && indices.event !== -1 && cluster.length < 4) {
    const nextEvent = getNextSlotItem(pattern.events, indices.event, 1);
    if (nextEvent) {
      const newCombo = { ...combo, event: nextEvent };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  // Variation 8: Next subjectVerb (lowest priority, only if still under 4)
  if (indices.subjectVerb !== undefined && indices.subjectVerb !== -1 && cluster.length < 4) {
    const nextSv = getNextSlotItem(pattern.subjectVerb, indices.subjectVerb, 1);
    if (nextSv) {
      const newCombo = { ...combo, subjectVerb: nextSv };
      const key = JSON.stringify(newCombo);
      if (!used.has(key)) {
        used.add(key);
        cluster.push(buildVariationFromCombo(pattern, newCombo));
      }
    }
  }
  
  return cluster.slice(0, 4);  // Max 4 variations
}

/**
 * Build a complete phrase from a combination
 * @param {Object} pattern - The phrase pattern
 * @param {Object} combo - The slot combination
 * @param {number} index - Index for unique ID
 * @returns {Object} Complete phrase object
 */
function buildPhraseFromCombo(pattern, combo, index) {
  let text = pattern.template;
  let meaning = pattern.meaningTemplate;
  let scene = pattern.sceneTemplate;
  
  // Build words array for pronunciation support
  const words = [];
  
  // Replace placeholders based on pattern type
  if (combo.subjectVerb) {
    text = text.replace('{subject}', combo.subjectVerb.subject);
    text = text.replace('{verb}', combo.subjectVerb.verb);
    meaning = meaning.replace('{subjMeaning}', combo.subjectVerb.subjMeaning);
    meaning = meaning.replace('{verbMeaning}', combo.subjectVerb.verbMeaning);
    scene = scene.replace('{verbMeaning}', combo.subjectVerb.verbMeaning);
    
    // Add words
    words.push({ text: combo.subjectVerb.subject, pronunciation: combo.subjectVerb.subjPron, meaning: combo.subjectVerb.subjMeaning });
    
    // Handle multi-word verbs
    const verbWords = combo.subjectVerb.verb.split(' ');
    if (verbWords.length > 1) {
      verbWords.forEach(vw => {
        words.push({ text: vw, pronunciation: combo.subjectVerb.verbPron.split(' ')[verbWords.indexOf(vw)] || combo.subjectVerb.verbPron, meaning: combo.subjectVerb.verbMeaning });
      });
    } else {
      words.push({ text: combo.subjectVerb.verb, pronunciation: combo.subjectVerb.verbPron, meaning: combo.subjectVerb.verbMeaning });
    }
  }
  
  if (combo.verb) {
    text = text.replace('{verb}', combo.verb.verb);
    meaning = meaning.replace('{verbMeaning}', combo.verb.verbMeaning);
    scene = scene.replace('{verbMeaning}', combo.verb.verbMeaning);
    
    // Add verb words
    const verbWords = combo.verb.verb.split(' ');
    verbWords.forEach(vw => {
      words.push({ text: vw, pronunciation: combo.verb.verbPron, meaning: combo.verb.verbMeaning });
    });
  }
  
  if (combo.object) {
    // Handle article if present
    if (combo.object.article) {
      text = text.replace('{article}', combo.object.article);
      words.push({ text: combo.object.article, pronunciation: combo.object.artPron, meaning: 'the' });
    }
    
    text = text.replace('{object}', combo.object.text);
    meaning = meaning.replace('{objMeaning}', combo.object.meaning);
    scene = scene.replace('{objMeaning}', combo.object.meaning);
    
    words.push({ text: combo.object.text, pronunciation: combo.object.objPron, meaning: combo.object.meaning });
  }
  
  if (combo.location) {
    // Handle preposition
    if (combo.location.prep) {
      text = text.replace('{prep}', combo.location.prep);
      words.push({ text: combo.location.prep, pronunciation: combo.location.prepPron, meaning: 'at/in' });
    }
    
    text = text.replace('{location}', combo.location.text);
    meaning = meaning.replace('{locMeaning}', combo.location.meaning);
    scene = scene.replace('{locMeaning}', combo.location.meaning);
    
    words.push({ text: combo.location.text, pronunciation: combo.location.locPron, meaning: combo.location.meaning });
  }
  
  if (combo.time) {
    text = text.replace('{time}', combo.time.text);
    meaning = meaning.replace('{timeMeaning}', combo.time.meaning);
    scene = scene.replace('{timeMeaning}', combo.time.meaning);
    
    // Add time words
    const timeWords = combo.time.text.split(' ');
    timeWords.forEach(tw => {
      words.push({ text: tw, pronunciation: combo.time.timePron, meaning: combo.time.meaning });
    });
  }
  
  if (combo.event) {
    text = text.replace('{event}', combo.event.text);
    meaning = meaning.replace('{eventMeaning}', combo.event.meaning);
    scene = scene.replace('{eventMeaning}', combo.event.meaning);
    
    words.push({ text: combo.event.text, pronunciation: combo.event.eventPron, meaning: combo.event.meaning });
  }
  
  if (combo.state) {
    text = text.replace('{state}', combo.state.text);
    meaning = meaning.replace('{stateMeaning}', combo.state.meaning);
    scene = scene.replace('{stateMeaning}', combo.state.meaning);
    
    words.push({ text: combo.state.text + '.', pronunciation: combo.state.statePron, meaning: combo.state.meaning });
  }
  
  if (combo.feeling) {
    text = text.replace('{feeling}', combo.feeling.text);
    meaning = meaning.replace('{feelMeaning}', combo.feeling.meaning);
    scene = scene.replace('{feelMeaning}', combo.feeling.meaning);
    
    words.push({ text: combo.feeling.text + '.', pronunciation: combo.feeling.feelPron, meaning: combo.feeling.meaning });
  }
  
  // Get icon (priority: object > event > state > feeling > pattern default)
  const icon = combo.object?.icon || combo.event?.icon || combo.state?.icon || combo.feeling?.icon || combo.location?.icon || pattern.icon;
  
  // Build stable pattern cluster (3-4 nearby variations)
  const contextVariations = buildPatternCluster(pattern, combo);
  
  console.log(`[Phrase Generator] Built cluster for "${text}": ${contextVariations.length} variations`);
  
  return {
    id: `gen-${pattern.id}-${index}`,
    text,
    meaning,
    icon,
    scene,
    patternId: pattern.id,
    language: pattern.language || 'pt', // Explicit language metadata
    generated: true,
    words: words.length > 0 ? words : undefined, // Only include if we built words
    contextVariations: contextVariations.length > 0 ? contextVariations : undefined  // Stable cluster
  };
}

/**
 * Generate all phrases from all patterns
 * @param {Array} patterns - Array of phrase patterns
 * @param {number} perPattern - Number of phrases per pattern (default: 8)
 * @returns {Array} Array of all generated phrases
 */
export function generateAllPhrases(patterns = PHRASE_PATTERNS_PT, perPattern = 8) {
  const allPhrases = [];
  
  patterns.forEach(pattern => {
    const patternPhrases = generatePhrasesFromPattern(pattern, perPattern);
    allPhrases.push(...patternPhrases);
    
    console.log(`[Phrase Generator] Generated ${patternPhrases.length} phrases for pattern: ${pattern.id}`);
  });
  
  console.log(`[Phrase Generator] Total generated: ${allPhrases.length} phrases`);
  
  return allPhrases;
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
