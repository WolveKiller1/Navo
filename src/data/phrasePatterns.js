/**
 * Controlled Phrase Patterns for Practice Loop
 * Local, deterministic phrase generation - NO live AI
 * 
 * Grammar rules:
 * - Subject-verb agreement enforced through paired structures
 * - Articles match gender (o/a, os/as)
 * - Preposition contractions handled (em + o = no, de + a = da)
 */

export const PHRASE_PATTERNS_PT = [
  // Pattern 1: Deixar/Esquecer objects in locations
  {
    id: "deixar-object-location",
    description: "Someone left/forgot an object somewhere",
    icon: "📦",
    
    // Subject-verb pairs (correct agreement)
    subjectVerb: [
      { subject: "Ela", verb: "deixou", subjPron: "EH-lah", verbPron: "day-SHOH", subjMeaning: "she", verbMeaning: "left" },
      { subject: "Ele", verb: "deixou", subjPron: "EH-lee", verbPron: "day-SHOH", subjMeaning: "he", verbMeaning: "left" },
      { subject: "Eu", verb: "deixei", subjPron: "EH-oo", verbPron: "day-SHAY", subjMeaning: "I", verbMeaning: "left" },
      { subject: "Ela", verb: "esqueceu", subjPron: "EH-lah", verbPron: "es-keh-SEH-oo", subjMeaning: "she", verbMeaning: "forgot" },
      { subject: "Ele", verb: "esqueceu", subjPron: "EH-lee", verbPron: "es-keh-SEH-oo", subjMeaning: "he", verbMeaning: "forgot" },
      { subject: "Eu", verb: "esqueci", subjPron: "EH-oo", verbPron: "es-keh-SEE", subjMeaning: "I", verbMeaning: "forgot" }
    ],
    
    objects: [
      { article: "o", text: "telefone", artPron: "oo", objPron: "teh-leh-FOH-nee", icon: "📱", meaning: "phone" },
      { article: "a", text: "carteira", artPron: "ah", objPron: "kar-TAY-rah", icon: "👛", meaning: "wallet" },
      { article: "as", text: "chaves", artPron: "ahs", objPron: "SHAH-ves", icon: "🔑", meaning: "keys" },
      { article: "o", text: "livro", artPron: "oo", objPron: "LEE-vroo", icon: "📚", meaning: "book" },
      { article: "a", text: "bolsa", artPron: "ah", objPron: "BOHL-sah", icon: "👜", meaning: "bag" }
    ],
    
    locations: [
      { prep: "em", prepPron: "ayn", text: "casa", locPron: "KAH-zah", meaning: "home" },
      { prep: "no", prepPron: "noo", text: "trabalho", locPron: "trah-BAH-lyoo", meaning: "work" },
      { prep: "no", prepPron: "noo", text: "carro", locPron: "KAH-hoo", meaning: "car" },
      { prep: "na", prepPron: "nah", text: "escola", locPron: "es-KOH-lah", meaning: "school" }
    ],
    
    template: "{subject} {verb} {article} {object} {prep} {location}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} {objMeaning} at {locMeaning}",
    sceneTemplate: "{verbMeaning} {objMeaning}, {locMeaning}"
  },

  // Pattern 2: Perder/Quase perder transport
  {
    id: "perder-transport",
    description: "Missing or almost missing transportation",
    icon: "🚌",
    
    subjectVerb: [
      { subject: "Eu", verb: "perdi", subjPron: "EH-oo", verbPron: "pehr-JEE", subjMeaning: "I", verbMeaning: "missed" },
      { subject: "Eu", verb: "quase perdi", subjPron: "EH-oo", verbPron: "KWAH-zee pehr-JEE", subjMeaning: "I", verbMeaning: "almost missed" }
    ],
    
    objects: [
      { article: "o", text: "ônibus", artPron: "oo", objPron: "OH-nee-boos", icon: "🚌", meaning: "bus" },
      { article: "o", text: "trem", artPron: "oo", objPron: "trayn", icon: "🚆", meaning: "train" },
      { article: "o", text: "metrô", artPron: "oo", objPron: "meh-TROH", icon: "🚇", meaning: "metro" }
    ],
    
    times: [
      { text: "esta manhã", timePron: "ES-tah mah-NYAH", meaning: "this morning" },
      { text: "ontem", timePron: "on-TAYN", meaning: "yesterday" },
      { text: "hoje", timePron: "OH-zhee", meaning: "today" }
    ],
    
    template: "{subject} {verb} {article} {object} {time}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} the {objMeaning} {timeMeaning}",
    sceneTemplate: "{verbMeaning} {objMeaning}, {timeMeaning}"
  },

  // Pattern 3: Querer (want)
  {
    id: "querer",
    description: "Wanting something",
    icon: "☕",
    
    subjectVerb: [
      { subject: "Eu", verb: "quero", subjPron: "EH-oo", verbPron: "KEH-roo", subjMeaning: "I", verbMeaning: "want" },
      { subject: "Ela", verb: "quer", subjPron: "EH-lah", verbPron: "kehr", subjMeaning: "she", verbMeaning: "wants" },
      { subject: "Ele", verb: "quer", subjPron: "EH-lee", verbPron: "kehr", subjMeaning: "he", verbMeaning: "wants" }
    ],
    
    objects: [
      { text: "café", objPron: "kah-FEH", icon: "☕", meaning: "coffee" },
      { text: "água", objPron: "AH-gwah", icon: "💧", meaning: "water" },
      { text: "comida", objPron: "koh-MEE-dah", icon: "🍽️", meaning: "food" }
    ],
    
    template: "{subject} {verb} {object}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} {objMeaning}",
    sceneTemplate: "{verbMeaning} {objMeaning}"
  },

  // Pattern 4: Precisar de (need)
  {
    id: "precisar",
    description: "Needing something",
    icon: "💧",
    
    subjectVerb: [
      { subject: "Eu", verb: "preciso de", subjPron: "EH-oo", verbPron: "preh-SEE-zoo jee", subjMeaning: "I", verbMeaning: "need" },
      { subject: "Ela", verb: "precisa de", subjPron: "EH-lah", verbPron: "preh-SEE-zah jee", subjMeaning: "she", verbMeaning: "needs" },
      { subject: "Ele", verb: "precisa de", subjPron: "EH-lee", verbPron: "preh-SEE-zah jee", subjMeaning: "he", verbMeaning: "needs" }
    ],
    
    objects: [
      { text: "ajuda", objPron: "ah-ZHOO-dah", icon: "🆘", meaning: "help" },
      { text: "água", objPron: "AH-gwah", icon: "💧", meaning: "water" },
      { text: "tempo", objPron: "TEM-poo", icon: "⏰", meaning: "time" }
    ],
    
    template: "{subject} {verb} {object}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} {objMeaning}",
    sceneTemplate: "{verbMeaning} {objMeaning}"
  },

  // Pattern 5: Ir para (going to)
  {
    id: "ir-location",
    description: "Going somewhere",
    icon: "🚶",
    
    subjectVerb: [
      { subject: "Eu", verb: "vou para", subjPron: "EH-oo", verbPron: "voh PAH-rah", subjMeaning: "I", verbMeaning: "am going to" },
      { subject: "Ela", verb: "vai para", subjPron: "EH-lah", verbPron: "vai PAH-rah", subjMeaning: "she", verbMeaning: "is going to" },
      { subject: "Ele", verb: "vai para", subjPron: "EH-lee", verbPron: "vai PAH-rah", subjMeaning: "he", verbMeaning: "is going to" }
    ],
    
    locations: [
      { text: "casa", locPron: "KAH-zah", icon: "🏠", meaning: "home" },
      { text: "escola", locPron: "es-KOH-lah", icon: "🏫", meaning: "school" },
      { text: "o trabalho", locPron: "oo trah-BAH-lyoo", icon: "🏢", meaning: "work" }
    ],
    
    template: "{subject} {verb} {location}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} {locMeaning}",
    sceneTemplate: "{verbMeaning} {locMeaning}"
  },

  // Pattern 6: Weather/sudden events
  {
    id: "comecar-weather",
    description: "Weather or sudden events starting",
    icon: "🌧️",
    
    // No subject needed - impersonal
    verbs: [
      { verb: "Começou a", verbPron: "koh-meh-SOH ah", verbMeaning: "started" }
    ],
    
    events: [
      { text: "chover", eventPron: "shoh-VEHR", icon: "🌧️", meaning: "raining" },
      { text: "nevar", eventPron: "neh-VAHR", icon: "🌨️", meaning: "snowing" }
    ],
    
    times: [
      { text: "do nada", timePron: "doo NAH-dah", meaning: "out of nowhere" },
      { text: "de repente", timePron: "jee heh-PEN-chee", meaning: "suddenly" },
      { text: "forte", timePron: "FOHR-chee", meaning: "hard" }
    ],
    
    template: "{verb} {event} {time}.",
    meaningTemplate: "it {verbMeaning} {eventMeaning} {timeMeaning}",
    sceneTemplate: "{verbMeaning} {eventMeaning}, {timeMeaning}"
  },

  // Pattern 7: State/Feeling with estar
  {
    id: "estar-state",
    description: "Being in a state or feeling",
    icon: "😴",
    
    subjectVerb: [
      { subject: "Eu", verb: "estou", subjPron: "EH-oo", verbPron: "es-TOH", subjMeaning: "I", verbMeaning: "am" },
      { subject: "Ela", verb: "está", subjPron: "EH-lah", verbPron: "es-TAH", subjMeaning: "she", verbMeaning: "is" },
      { subject: "Ele", verb: "está", subjPron: "EH-lee", verbPron: "es-TAH", subjMeaning: "he", verbMeaning: "is" }
    ],
    
    states: [
      { text: "cansado", statePron: "kan-SAH-doo", icon: "😴", meaning: "tired" },
      { text: "ocupado", statePron: "oh-koo-PAH-doo", icon: "💼", meaning: "busy" },
      { text: "atrasado", statePron: "ah-trah-ZAH-doo", icon: "⏰", meaning: "late" }
    ],
    
    template: "{subject} {verb} {state}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} {stateMeaning}",
    sceneTemplate: "{verbMeaning} {stateMeaning}"
  },

  // Pattern 8: Estar com (feeling with estar com)
  {
    id: "estar-com",
    description: "Feeling hungry, thirsty, etc.",
    icon: "🍽️",
    
    subjectVerb: [
      { subject: "Eu", verb: "estou com", subjPron: "EH-oo", verbPron: "es-TOH kom", subjMeaning: "I", verbMeaning: "am" },
      { subject: "Ela", verb: "está com", subjPron: "EH-lah", verbPron: "es-TAH kom", subjMeaning: "she", verbMeaning: "is" },
      { subject: "Ele", verb: "está com", subjPron: "EH-lee", verbPron: "es-TAH kom", subjMeaning: "he", verbMeaning: "is" }
    ],
    
    feelings: [
      { text: "fome", feelPron: "FOH-mee", icon: "🍽️", meaning: "hungry" },
      { text: "sede", feelPron: "SEH-jee", icon: "💧", meaning: "thirsty" },
      { text: "sono", feelPron: "SOH-noo", icon: "😴", meaning: "sleepy" },
      { text: "frio", feelPron: "FREE-oo", icon: "🥶", meaning: "cold" }
    ],
    
    template: "{subject} {verb} {feeling}.",
    meaningTemplate: "{subjMeaning} {verbMeaning} {feelMeaning}",
    sceneTemplate: "{verbMeaning} {feelMeaning}"
  },

  // Pattern 9: Simple uncertainty/reactions
  {
    id: "simple-reactions",
    description: "Short reactions and uncertainty",
    icon: "🤷",
    
    // Complete phrases (no slots needed)
    phrases: [
      { 
        text: "Eu não sei.", 
        words: [
          { text: "Eu", pronunciation: "EH-oo", meaning: "I" },
          { text: "não", pronunciation: "now", meaning: "not" },
          { text: "sei.", pronunciation: "say", meaning: "know" }
        ],
        meaning: "I don't know",
        scene: "don't know",
        icon: "🤷"
      },
      {
        text: "Acho que sim.",
        words: [
          { text: "Acho", pronunciation: "AH-shoo", meaning: "I think" },
          { text: "que", pronunciation: "kee", meaning: "that" },
          { text: "sim.", pronunciation: "seem", meaning: "yes" }
        ],
        meaning: "I think so",
        scene: "I think so",
        icon: "🤔"
      },
      {
        text: "Acho que não.",
        words: [
          { text: "Acho", pronunciation: "AH-shoo", meaning: "I think" },
          { text: "que", pronunciation: "kee", meaning: "that" },
          { text: "não.", pronunciation: "now", meaning: "no" }
        ],
        meaning: "I don't think so",
        scene: "I don't think so",
        icon: "🤔"
      },
      {
        text: "Talvez.",
        words: [
          { text: "Talvez.", pronunciation: "tahl-VEHZ", meaning: "maybe" }
        ],
        meaning: "Maybe",
        scene: "maybe",
        icon: "🤷"
      }
    ]
  }
];

/**
 * English Phrase Patterns
 * Natural, reusable English phrase families for Practice Loop
 */
export const PHRASE_PATTERNS_EN = [
  // Pattern 1: I just...
  {
    id: "just-did",
    description: "Something I just did",
    icon: "⏰",
    language: "en",
    
    objects: [
      { text: "got here", meaning: "arrived" },
      { text: "finished", meaning: "completed" },
      { text: "woke up", meaning: "woke" },
      { text: "realized", meaning: "understood" },
      { text: "remembered", meaning: "recalled" },
      { text: "started", meaning: "began" }
    ],
    
    template: "I just {object}.",
    meaningTemplate: "just {objMeaning}",
    sceneTemplate: "just {objMeaning}"
  },

  // Pattern 2: I was trying to...
  {
    id: "trying-to",
    description: "Something I was trying to do",
    icon: "🤔",
    language: "en",
    
    objects: [
      { text: "call you", meaning: "reach you" },
      { text: "find it", meaning: "locate it" },
      { text: "remember", meaning: "recall" },
      { text: "figure it out", meaning: "solve it" },
      { text: "explain", meaning: "clarify" },
      { text: "help", meaning: "assist" }
    ],
    
    template: "I was trying to {object}.",
    meaningTemplate: "trying to {objMeaning}",
    sceneTemplate: "trying to {objMeaning}"
  },

  // Pattern 3: I couldn't...
  {
    id: "couldnt",
    description: "Something I couldn't do",
    icon: "❌",
    language: "en",
    
    objects: [
      { text: "sleep", meaning: "rest" },
      { text: "find it", meaning: "locate it" },
      { text: "hear you", meaning: "understand" },
      { text: "remember", meaning: "recall" },
      { text: "focus", meaning: "concentrate" },
      { text: "decide", meaning: "choose" }
    ],
    
    template: "I couldn't {object}.",
    meaningTemplate: "couldn't {objMeaning}",
    sceneTemplate: "couldn't {objMeaning}"
  },

  // Pattern 4: Do you want to...?
  {
    id: "want-to",
    description: "Asking if someone wants to do something",
    icon: "❓",
    language: "en",
    
    objects: [
      { text: "go", meaning: "leave" },
      { text: "eat", meaning: "have food" },
      { text: "try it", meaning: "test it" },
      { text: "come with me", meaning: "join me" },
      { text: "talk about it", meaning: "discuss it" },
      { text: "see", meaning: "look" }
    ],
    
    template: "Do you want to {object}?",
    meaningTemplate: "want to {objMeaning}",
    sceneTemplate: "want to {objMeaning}"
  },

  // Pattern 5: I think I...
  {
    id: "think-i",
    description: "Something I think I did or will do",
    icon: "💭",
    language: "en",
    
    objects: [
      { text: "understand", meaning: "get it" },
      { text: "forgot", meaning: "didn't remember" },
      { text: "know", meaning: "am aware" },
      { text: "made a mistake", meaning: "erred" },
      { text: "can do it", meaning: "am able" },
      { text: "see it", meaning: "perceive it" }
    ],
    
    template: "I think I {object}.",
    meaningTemplate: "think I {objMeaning}",
    sceneTemplate: "think {objMeaning}"
  },

  // Pattern 6: I forgot to...
  {
    id: "forgot-to",
    description: "Something I forgot to do",
    icon: "🤦",
    language: "en",
    
    objects: [
      { text: "call", meaning: "phone" },
      { text: "lock the door", meaning: "secure door" },
      { text: "bring it", meaning: "carry it" },
      { text: "tell you", meaning: "inform you" },
      { text: "check", meaning: "verify" },
      { text: "respond", meaning: "reply" }
    ],
    
    template: "I forgot to {object}.",
    meaningTemplate: "forgot to {objMeaning}",
    sceneTemplate: "forgot {objMeaning}"
  },

  // Pattern 7: I need to...
  {
    id: "need-to",
    description: "Something I need to do",
    icon: "📝",
    language: "en",
    
    objects: [
      { text: "go", meaning: "leave" },
      { text: "think about it", meaning: "consider" },
      { text: "ask", meaning: "inquire" },
      { text: "finish this", meaning: "complete" },
      { text: "rest", meaning: "take break" },
      { text: "decide", meaning: "choose" }
    ],
    
    template: "I need to {object}.",
    meaningTemplate: "need to {objMeaning}",
    sceneTemplate: "need {objMeaning}"
  },

  // Pattern 8: I'm about to...
  {
    id: "about-to",
    description: "Something I'm about to do",
    icon: "⏳",
    language: "en",
    
    objects: [
      { text: "leave", meaning: "depart" },
      { text: "start", meaning: "begin" },
      { text: "call", meaning: "phone" },
      { text: "try", meaning: "attempt" },
      { text: "go", meaning: "move" },
      { text: "ask", meaning: "inquire" }
    ],
    
    template: "I'm about to {object}.",
    meaningTemplate: "about to {objMeaning}",
    sceneTemplate: "about to {objMeaning}"
  }
];
