/**
 * Playground Sequence Builder
 * 
 * Clean service for building Playground phrase sequences.
 * Generates nearby phrase variations using controlled pattern movement.
 * 
 * Priority order:
 * 1. Try patternId-based generation (if succeeds, use it)
 * 2. Fall back to route-provided contextVariations (if patternId failed or not available)
 * 3. Single phrase fallback (if no variations possible)
 * 
 * NO AI - local, deterministic generation only.
 */

import { PHRASE_PATTERNS_PT } from '../data/phrasePatterns';

/**
 * Build a complete Playground sequence from route state data
 * @param {Object} routeState - Route state from Practice Loop or Landing Page
 * @returns {Array} Array of phrase objects for Playground display
 */
export function buildPlaygroundSequence(routeState) {
  console.log('[Playground Sequence Builder] Building sequence from:', {
    seedSentence: routeState.seedSentence,
    patternId: routeState.patternId,
    contextVariations: routeState.contextVariations ? routeState.contextVariations.length : 'none'
  });

  // PRIORITY 1: Try patternId-based generation first
  if (routeState.patternId) {
    const pattern = findPatternById(routeState.patternId);
    if (pattern) {
      console.log('[Playground Sequence Builder] Pattern found for:', routeState.patternId);
      const sequence = buildSequenceFromPattern(routeState, pattern);
      console.log('[Playground Sequence Builder] Pattern sequence built, length:', sequence.length);
      if (sequence && sequence.length > 1) {
        console.log('[Playground Sequence Builder] Returning patternId sequence');
        return sequence;
      } else {
        console.log('[Playground Sequence Builder] PatternId generation failed, length:', sequence.length);
        // Fall back to contextVariations if available
        if (Array.isArray(routeState.contextVariations) && routeState.contextVariations.length > 0) {
          console.log('[Playground Sequence Builder] Returning pattern failed then context fallback, length:', routeState.contextVariations.length + 1);
          const seedPhrase = buildSeedPhrase(routeState);
          return [seedPhrase, ...routeState.contextVariations];
        }
      }
    } else {
      console.log('[Playground Sequence Builder] Pattern not found for:', routeState.patternId);
    }
  }

  // PRIORITY 2: route-provided contextVariations (if not already used as fallback)
  if (Array.isArray(routeState.contextVariations) && routeState.contextVariations.length > 0) {
    console.log('[Playground Sequence Builder] Returning contextVariations, length:', routeState.contextVariations.length + 1);
    const seedPhrase = buildSeedPhrase(routeState);
    return [seedPhrase, ...routeState.contextVariations];
  }

  // PRIORITY 3: single phrase fallback
  console.log('[Playground Sequence Builder] Returning single fallback');
  const seedPhrase = buildSeedPhrase(routeState);
  return [seedPhrase];
}

/**
 * Build seed phrase object from route state
 * @param {Object} routeState - Route state data
 * @returns {Object} Seed phrase object
 */
function buildSeedPhrase(routeState) {
  return {
    text: routeState.seedSentence,
    meaning: routeState.seedMeaning || routeState.meaning || null,
    icon: routeState.icon || '💭',
    scene: routeState.scene || null,
    patternId: routeState.patternId || null,
    generated: false
  };
}

/**
 * Find pattern by ID in PHRASE_PATTERNS_PT
 * @param {string} patternId - Pattern ID to search for
 * @returns {Object|null} Pattern object or null if not found
 */
function findPatternById(patternId) {
  return PHRASE_PATTERNS_PT.find(p => p.id === patternId) || null;
}

/**
 * Build complete sequence from pattern
 * Attempts to parse seed phrase and generate nearby variations
 * @param {Object} routeState - Route state data
 * @param {Object} pattern - Phrase pattern from phrasePatterns.js
 * @returns {Array} Sequence of phrase objects
 */
function buildSequenceFromPattern(routeState, pattern) {
  const seedPhrase = buildSeedPhrase(routeState);
  
  // Try to parse seed sentence into slots
  const parsedSlots = parseSeedIntoSlots(routeState.seedSentence, pattern);
  console.log('[Playground Sequence Builder] parseSeedIntoSlots:', parsedSlots ? 'succeeded' : 'failed');
  
  if (parsedSlots) {
    // Successfully parsed - generate nearby variations
    console.log('[Playground Sequence Builder] parsed slots:', Object.keys(parsedSlots));
    const variations = generateVariationsFromParsedSlots(pattern, parsedSlots);
    console.log('[Playground Sequence Builder] generated variations:', variations.length);
    const sequence = [seedPhrase, ...variations];
    console.log('[Playground Sequence Builder] final sequence length:', sequence.length);
    return sequence;
  } else {
    // Parsing failed - use safe default from pattern
    console.log('[Playground Sequence Builder] Parsing failed, using safe default');
    const safeSequence = generateSafeDefaultSequence(pattern);
    console.log('[Playground Sequence Builder] safe default variations:', safeSequence.length);
    const sequence = [seedPhrase, ...safeSequence];
    console.log('[Playground Sequence Builder] final sequence length:', sequence.length);
    return sequence;
  }
}

/**
 * Parse seed sentence into slots by reverse template matching
 * @param {string} seedText - Seed sentence text
 * @param {Object} pattern - Phrase pattern
 * @returns {Object|null} Parsed slots with indices, or null if parsing fails
 */
function parseSeedIntoSlots(seedText, pattern) {
  const cleanSeed = seedText.trim().replace(/\.$/, '');
  
  // Try each slot combination to find a match
  const slots = {};
  
  // Check if pattern has required slot types
  const hasSubjectVerb = pattern.subjectVerb && pattern.subjectVerb.length > 0;
  const hasVerbs = pattern.verbs && pattern.verbs.length > 0;
  const hasObjects = pattern.objects && pattern.objects.length > 0;
  const hasLocations = pattern.locations && pattern.locations.length > 0;
  const hasTimes = pattern.times && pattern.times.length > 0;
  const hasEvents = pattern.events && pattern.events.length > 0;
  const hasStates = pattern.states && pattern.states.length > 0;
  const hasFeelings = pattern.feelings && pattern.feelings.length > 0;
  
  // Try to find matching subjectVerb
  if (hasSubjectVerb) {
    for (let i = 0; i < pattern.subjectVerb.length; i++) {
      const sv = pattern.subjectVerb[i];
      if (cleanSeed.includes(sv.subject) && cleanSeed.includes(sv.verb)) {
        slots.subjectVerb = { ...sv, index: i };
        break;
      }
    }
  }
  
  // Try to find matching object
  if (hasObjects) {
    for (let i = 0; i < pattern.objects.length; i++) {
      const obj = pattern.objects[i];
      if (cleanSeed.includes(obj.text)) {
        slots.object = { ...obj, index: i };
        break;
      }
    }
  }
  
  // Try to find matching location
  if (hasLocations) {
    for (let i = 0; i < pattern.locations.length; i++) {
      const loc = pattern.locations[i];
      if (cleanSeed.includes(loc.text)) {
        slots.location = { ...loc, index: i };
        break;
      }
    }
  }
  
  // Try to find matching time
  if (hasTimes) {
    for (let i = 0; i < pattern.times.length; i++) {
      const time = pattern.times[i];
      if (cleanSeed.includes(time.text)) {
        slots.time = { ...time, index: i };
        break;
      }
    }
  }
  
  // Try to find matching event
  if (hasEvents) {
    for (let i = 0; i < pattern.events.length; i++) {
      const event = pattern.events[i];
      if (cleanSeed.includes(event.text)) {
        slots.event = { ...event, index: i };
        break;
      }
    }
  }
  
  // Try to find matching state
  if (hasStates) {
    for (let i = 0; i < pattern.states.length; i++) {
      const state = pattern.states[i];
      if (cleanSeed.includes(state.text)) {
        slots.state = { ...state, index: i };
        break;
      }
    }
  }
  
  // Try to find matching feeling
  if (hasFeelings) {
    for (let i = 0; i < pattern.feelings.length; i++) {
      const feeling = pattern.feelings[i];
      if (cleanSeed.includes(feeling.text)) {
        slots.feeling = { ...feeling, index: i };
        break;
      }
    }
  }
  
  // Check if we found at least some slots
  const foundSlotCount = Object.keys(slots).length;
  if (foundSlotCount === 0) {
    return null; // Parsing failed
  }
  
  return slots;
}

/**
 * Generate variations from parsed slots
 * Changes ONE dimension at a time
 * @param {Object} pattern - Phrase pattern
 * @param {Object} parsedSlots - Parsed slots with indices
 * @returns {Array} Array of variation phrase objects
 */
function generateVariationsFromParsedSlots(pattern, parsedSlots) {
  const variations = [];
  const used = new Set([JSON.stringify(parsedSlots)]);
  const maxVariations = 4;
  
  // Priority 1: Change object
  if (parsedSlots.object && pattern.objects && pattern.objects.length > 1) {
    const currentIndex = parsedSlots.object.index;
    for (let offset = 1; offset <= 2 && variations.length < maxVariations; offset++) {
      const nextIndex = (currentIndex + offset) % pattern.objects.length;
      if (nextIndex !== currentIndex) {
        const newSlots = { ...parsedSlots, object: { ...pattern.objects[nextIndex], index: nextIndex } };
        const key = JSON.stringify(newSlots);
        if (!used.has(key)) {
          used.add(key);
          const phrase = buildPhraseFromSlots(pattern, newSlots);
          if (phrase) variations.push(phrase);
        }
      }
    }
  }
  
  // Priority 2: Change location
  if (parsedSlots.location && pattern.locations && pattern.locations.length > 1 && variations.length < maxVariations) {
    const currentIndex = parsedSlots.location.index;
    const nextIndex = (currentIndex + 1) % pattern.locations.length;
    if (nextIndex !== currentIndex) {
      const newSlots = { ...parsedSlots, location: { ...pattern.locations[nextIndex], index: nextIndex } };
      const key = JSON.stringify(newSlots);
      if (!used.has(key)) {
        used.add(key);
        const phrase = buildPhraseFromSlots(pattern, newSlots);
        if (phrase) variations.push(phrase);
      }
    }
  }
  
  // Priority 3: Change time
  if (parsedSlots.time && pattern.times && pattern.times.length > 1 && variations.length < maxVariations) {
    const currentIndex = parsedSlots.time.index;
    const nextIndex = (currentIndex + 1) % pattern.times.length;
    if (nextIndex !== currentIndex) {
      const newSlots = { ...parsedSlots, time: { ...pattern.times[nextIndex], index: nextIndex } };
      const key = JSON.stringify(newSlots);
      if (!used.has(key)) {
        used.add(key);
        const phrase = buildPhraseFromSlots(pattern, newSlots);
        if (phrase) variations.push(phrase);
      }
    }
  }
  
  // Priority 4: Change state/event/feeling
  if (parsedSlots.state && pattern.states && pattern.states.length > 1 && variations.length < maxVariations) {
    const currentIndex = parsedSlots.state.index;
    const nextIndex = (currentIndex + 1) % pattern.states.length;
    if (nextIndex !== currentIndex) {
      const newSlots = { ...parsedSlots, state: { ...pattern.states[nextIndex], index: nextIndex } };
      const key = JSON.stringify(newSlots);
      if (!used.has(key)) {
        used.add(key);
        const phrase = buildPhraseFromSlots(pattern, newSlots);
        if (phrase) variations.push(phrase);
      }
    }
  }
  
  if (parsedSlots.event && pattern.events && pattern.events.length > 1 && variations.length < maxVariations) {
    const currentIndex = parsedSlots.event.index;
    const nextIndex = (currentIndex + 1) % pattern.events.length;
    if (nextIndex !== currentIndex) {
      const newSlots = { ...parsedSlots, event: { ...pattern.events[nextIndex], index: nextIndex } };
      const key = JSON.stringify(newSlots);
      if (!used.has(key)) {
        used.add(key);
        const phrase = buildPhraseFromSlots(pattern, newSlots);
        if (phrase) variations.push(phrase);
      }
    }
  }
  
  if (parsedSlots.feeling && pattern.feelings && pattern.feelings.length > 1 && variations.length < maxVariations) {
    const currentIndex = parsedSlots.feeling.index;
    const nextIndex = (currentIndex + 1) % pattern.feelings.length;
    if (nextIndex !== currentIndex) {
      const newSlots = { ...parsedSlots, feeling: { ...pattern.feelings[nextIndex], index: nextIndex } };
      const key = JSON.stringify(newSlots);
      if (!used.has(key)) {
        used.add(key);
        const phrase = buildPhraseFromSlots(pattern, newSlots);
        if (phrase) variations.push(phrase);
      }
    }
  }
  
  // Priority 5: Change subject (lowest priority, max 1)
  if (parsedSlots.subjectVerb && pattern.subjectVerb && pattern.subjectVerb.length > 1 && variations.length < maxVariations) {
    const currentIndex = parsedSlots.subjectVerb.index;
    const nextIndex = (currentIndex + 1) % pattern.subjectVerb.length;
    if (nextIndex !== currentIndex) {
      const newSlots = { ...parsedSlots, subjectVerb: { ...pattern.subjectVerb[nextIndex], index: nextIndex } };
      const key = JSON.stringify(newSlots);
      if (!used.has(key)) {
        used.add(key);
        const phrase = buildPhraseFromSlots(pattern, newSlots);
        if (phrase) variations.push(phrase);
      }
    }
  }
  
  return variations;
}

/**
 * Build phrase from slots using pattern templates
 * @param {Object} pattern - Phrase pattern
 * @param {Object} slots - Slot objects
 * @returns {Object} Complete phrase object
 */
function buildPhraseFromSlots(pattern, slots) {
  let text = pattern.template;
  let meaning = pattern.meaningTemplate || '';
  let scene = pattern.sceneTemplate || '';
  
  // Replace placeholders
  if (slots.subjectVerb) {
    text = text.replace('{subject}', slots.subjectVerb.subject);
    text = text.replace('{verb}', slots.subjectVerb.verb);
    meaning = meaning.replace('{subjMeaning}', slots.subjectVerb.subjMeaning || '');
    meaning = meaning.replace('{verbMeaning}', slots.subjectVerb.verbMeaning || '');
    scene = scene.replace('{verbMeaning}', slots.subjectVerb.verbMeaning || '');
  }
  
  if (slots.verb) {
    text = text.replace('{verb}', slots.verb.verb);
    meaning = meaning.replace('{verbMeaning}', slots.verb.verbMeaning || '');
    scene = scene.replace('{verbMeaning}', slots.verb.verbMeaning || '');
  }
  
  if (slots.object) {
    if (slots.object.article) {
      text = text.replace('{article}', slots.object.article);
    }
    text = text.replace('{object}', slots.object.text);
    meaning = meaning.replace('{objMeaning}', slots.object.meaning || '');
    scene = scene.replace('{objMeaning}', slots.object.meaning || '');
  }
  
  if (slots.location) {
    if (slots.location.prep) {
      text = text.replace('{prep}', slots.location.prep);
    }
    text = text.replace('{location}', slots.location.text);
    meaning = meaning.replace('{locMeaning}', slots.location.meaning || '');
    scene = scene.replace('{locMeaning}', slots.location.meaning || '');
  }
  
  if (slots.time) {
    text = text.replace('{time}', slots.time.text);
    meaning = meaning.replace('{timeMeaning}', slots.time.meaning || '');
    scene = scene.replace('{timeMeaning}', slots.time.meaning || '');
  }
  
  if (slots.event) {
    text = text.replace('{event}', slots.event.text);
    meaning = meaning.replace('{eventMeaning}', slots.event.meaning || '');
    scene = scene.replace('{eventMeaning}', slots.event.meaning || '');
  }
  
  if (slots.state) {
    text = text.replace('{state}', slots.state.text);
    meaning = meaning.replace('{stateMeaning}', slots.state.meaning || '');
    scene = scene.replace('{stateMeaning}', slots.state.meaning || '');
  }
  
  if (slots.feeling) {
    text = text.replace('{feeling}', slots.feeling.text);
    meaning = meaning.replace('{feelMeaning}', slots.feeling.meaning || '');
    scene = scene.replace('{feelMeaning}', slots.feeling.meaning || '');
  }
  
  // Get icon (priority: object > event > state > feeling > location > pattern default)
  const icon = slots.object?.icon || slots.event?.icon || slots.state?.icon || 
               slots.feeling?.icon || slots.location?.icon || pattern.icon || '💭';
  
  return {
    text,
    meaning: meaning || null,
    icon,
    scene: scene || null,
    patternId: pattern.id,
    generated: true
  };
}

/**
 * Generate safe default sequence when parsing fails
 * Uses first few slot combinations from pattern
 * @param {Object} pattern - Phrase pattern
 * @returns {Array} Array of safe default phrases
 */
function generateSafeDefaultSequence(pattern) {
  const variations = [];
  const maxVariations = 4;
  
  // Build phrases from first few combinations of pattern slots
  const hasSubjectVerb = pattern.subjectVerb && pattern.subjectVerb.length > 0;
  const hasVerbs = pattern.verbs && pattern.verbs.length > 0;
  const hasObjects = pattern.objects && pattern.objects.length > 0;
  const hasLocations = pattern.locations && pattern.locations.length > 0;
  const hasTimes = pattern.times && pattern.times.length > 0;
  const hasEvents = pattern.events && pattern.events.length > 0;
  const hasStates = pattern.states && pattern.states.length > 0;
  const hasFeelings = pattern.feelings && pattern.feelings.length > 0;
  
  // Generate a few combinations
  for (let i = 0; i < maxVariations && i < 6; i++) {
    const slots = {};
    
    if (hasSubjectVerb) {
      const index = i % pattern.subjectVerb.length;
      slots.subjectVerb = { ...pattern.subjectVerb[index], index };
    }
    
    if (hasVerbs) {
      const index = i % pattern.verbs.length;
      slots.verb = { ...pattern.verbs[index], index };
    }
    
    if (hasObjects) {
      const index = i % pattern.objects.length;
      slots.object = { ...pattern.objects[index], index };
    }
    
    if (hasLocations) {
      const index = i % pattern.locations.length;
      slots.location = { ...pattern.locations[index], index };
    }
    
    if (hasTimes) {
      const index = i % pattern.times.length;
      slots.time = { ...pattern.times[index], index };
    }
    
    if (hasEvents) {
      const index = i % pattern.events.length;
      slots.event = { ...pattern.events[index], index };
    }
    
    if (hasStates) {
      const index = i % pattern.states.length;
      slots.state = { ...pattern.states[index], index };
    }
    
    if (hasFeelings) {
      const index = i % pattern.feelings.length;
      slots.feeling = { ...pattern.feelings[index], index };
    }
    
    const phrase = buildPhraseFromSlots(pattern, slots);
    if (phrase) {
      variations.push(phrase);
    }
  }
  
  return variations;
}
