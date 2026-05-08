/**
 * Language Units for Navo Entry
 * Usable pieces of language tied to concrete moments
 * Foundation for both Room and Playground entry
 */

export const LANGUAGE_UNITS = [
  {
    id: 'missed-bus',
    moment: 'Someone missed the bus',
    sentence: 'I missed the bus.'
  },
  {
    id: 'friend-late',
    moment: 'A friend arrives late',
    sentence: 'My friend arrived late.'
  },
  {
    id: 'forgot-phone',
    moment: 'Someone forgot their phone',
    sentence: 'I forgot my phone at home.'
  },
  {
    id: 'dog-runs',
    moment: 'A dog runs across the street',
    sentence: 'A dog ran across the street.'
  },
  {
    id: 'teacher-asks',
    moment: 'A teacher asks a question',
    sentence: 'The teacher asked me a question.'
  },
  {
    id: 'rain-starts',
    moment: 'It starts to rain',
    sentence: "It's raining now."
  },
  {
    id: 'door-opens',
    moment: 'A door suddenly opens',
    sentence: 'The door opened suddenly.'
  },
  {
    id: 'phone-rings',
    moment: 'A phone rings at night',
    sentence: 'My phone rang at night.'
  },
  {
    id: 'coffee-spills',
    moment: 'Someone spills their coffee',
    sentence: 'I spilled my coffee.'
  },
  {
    id: 'child-cries',
    moment: 'A child starts crying',
    sentence: 'A child started crying.'
  }
];

// Imitation Loop Units - English
export const IMITATION_UNITS_EN = [
  { id: 1, text: "I missed the bus this morning." },
  { id: 2, text: "She left her phone at home." },
  { id: 3, text: "It started raining out of nowhere." },
  { id: 4, text: "The teacher asked me a question." },
  { id: 5, text: "A dog ran across the street." },
  { id: 6, text: "My friend arrived late." },
  { id: 7, text: "I forgot my keys at work." },
  { id: 8, text: "The door opened suddenly." },
  { id: 9, text: "My phone rang during the movie." },
  { id: 10, text: "I spilled coffee on my shirt." },
  { id: 11, text: "The bus left without me." },
  { id: 12, text: "She found a wallet on the street." },
  { id: 13, text: "The store closed early today." },
  { id: 14, text: "I heard a strange noise outside." },
  { id: 15, text: "He dropped his bag on the floor." }
];

// Imitation Loop Units - Portuguese (with pronunciation support)
export const IMITATION_UNITS_PT = [
  {
    id: 1,
    text: "Eu perdi o ônibus esta manhã.",
    meaning: "Someone is saying they missed the bus this morning.",
    icon: "🚌",
    scene: "missed bus, morning",
    words: [
      { text: "Eu", pronunciation: "EH-oo", meaning: "I" },
      { text: "perdi", pronunciation: "pehr-JEE", meaning: "missed" },
      { text: "o", pronunciation: "oo", meaning: "the" },
      { text: "ônibus", pronunciation: "OH-nee-boos", meaning: "bus" },
      { text: "esta", pronunciation: "ES-tah", meaning: "this" },
      { text: "manhã.", pronunciation: "mah-NYAH", meaning: "morning" }
    ],
    contextVariations: [
      { text: "Eu perdi o trem esta manhã.", icon: "🚆", scene: "missed train, morning" },
      { text: "Eu quase perdi o ônibus esta manhã.", icon: "🏃🚌", scene: "almost missed bus" },
      { text: "Eu perdi o ônibus ontem.", icon: "🚌🌙", scene: "missed bus, yesterday" }
    ],
    movableChunk: {
      wordIndex: 3,  // "ônibus"
      options: ["trem", "metrô", "táxi"]
    }
  },
  {
    id: 2,
    patternId: "deixar-object-location",
    text: "Ela deixou o telefone em casa.",
    meaning: "She left her phone at home.",
    icon: "📱",
    scene: "left phone at home",
    words: [
      { text: "Ela", pronunciation: "EH-lah", meaning: "she" },
      { text: "deixou", pronunciation: "day-SHOH", meaning: "left" },
      { text: "o", pronunciation: "oo", meaning: "the" },
      { text: "telefone", pronunciation: "teh-leh-FOH-nee", meaning: "phone" },
      { text: "em", pronunciation: "ayn", meaning: "at/in" },
      { text: "casa.", pronunciation: "KAH-zah", meaning: "home" }
    ],
    contextVariations: [
      { text: "Ela deixou a carteira em casa.", icon: "👛", scene: "left wallet at home" },
      { text: "Ela deixou o telefone no trabalho.", icon: "📱🏢", scene: "left phone at work" },
      { text: "Ele deixou as chaves em casa.", icon: "🔑", scene: "he left keys at home" }
    ]
  },
  {
    id: 3,
    patternId: "comecar-weather",
    text: "Começou a chover do nada.",
    meaning: "It started raining out of nowhere.",
    icon: "🌧️",
    scene: "started raining suddenly",
    words: [
      { text: "Começou", pronunciation: "koh-meh-SOH", meaning: "started" },
      { text: "a", pronunciation: "ah", meaning: "to" },
      { text: "chover", pronunciation: "shoh-VEHR", meaning: "rain" },
      { text: "do", pronunciation: "doo", meaning: "of the" },
      { text: "nada.", pronunciation: "NAH-dah", meaning: "nothing" }
    ],
    contextVariations: [
      { text: "Começou a nevar do nada.", icon: "🌨️", scene: "started snowing suddenly" },
      { text: "Parou de chover de repente.", icon: "🌤️", scene: "stopped raining suddenly" },
      { text: "Começou a chover forte.", icon: "⛈️", scene: "started raining hard" }
    ]
  },
  {
    id: 4,
    text: "O professor me fez uma pergunta.",
    meaning: "The teacher asked me a question.",
    words: [
      { text: "O", pronunciation: "oo", meaning: "the" },
      { text: "professor", pronunciation: "proh-feh-SOHR", meaning: "teacher" },
      { text: "me", pronunciation: "mee", meaning: "me" },
      { text: "fez", pronunciation: "fez", meaning: "made/asked" },
      { text: "uma", pronunciation: "OO-mah", meaning: "a" },
      { text: "pergunta.", pronunciation: "pehr-GOON-tah", meaning: "question" }
    ]
  },
  {
    id: 5,
    text: "Um cachorro correu pela rua.",
    meaning: "A dog ran across the street.",
    words: [
      { text: "Um", pronunciation: "oom", meaning: "a" },
      { text: "cachorro", pronunciation: "kah-SHOH-hoo", meaning: "dog" },
      { text: "correu", pronunciation: "koh-HEH-oo", meaning: "ran" },
      { text: "pela", pronunciation: "PEH-lah", meaning: "through the" },
      { text: "rua.", pronunciation: "HOO-ah", meaning: "street" }
    ]
  },
  {
    id: 6,
    text: "Meu amigo chegou atrasado.",
    meaning: "My friend arrived late.",
    words: [
      { text: "Meu", pronunciation: "MEH-oo", meaning: "my" },
      { text: "amigo", pronunciation: "ah-MEE-goo", meaning: "friend" },
      { text: "chegou", pronunciation: "sheh-GOH", meaning: "arrived" },
      { text: "atrasado.", pronunciation: "ah-trah-ZAH-doo", meaning: "late" }
    ]
  },
  {
    id: 7,
    text: "Eu esqueci minhas chaves no trabalho.",
    meaning: "I forgot my keys at work.",
    words: [
      { text: "Eu", pronunciation: "EH-oo", meaning: "I" },
      { text: "esqueci", pronunciation: "es-keh-SEE", meaning: "forgot" },
      { text: "minhas", pronunciation: "MEEN-yas", meaning: "my" },
      { text: "chaves", pronunciation: "SHAH-ves", meaning: "keys" },
      { text: "no", pronunciation: "noo", meaning: "at the" },
      { text: "trabalho.", pronunciation: "trah-BAH-lyoo", meaning: "work" }
    ]
  },
  {
    id: 8,
    text: "A porta abriu de repente.",
    meaning: "The door opened suddenly.",
    words: [
      { text: "A", pronunciation: "ah", meaning: "the" },
      { text: "porta", pronunciation: "POHR-tah", meaning: "door" },
      { text: "abriu", pronunciation: "ah-BREE-oo", meaning: "opened" },
      { text: "de", pronunciation: "jee", meaning: "of/from" },
      { text: "repente.", pronunciation: "heh-PEN-chee", meaning: "suddenly" }
    ]
  },
  {
    id: 9,
    text: "Meu telefone tocou durante o filme.",
    meaning: "My phone rang during the movie.",
    words: [
      { text: "Meu", pronunciation: "MEH-oo", meaning: "my" },
      { text: "telefone", pronunciation: "teh-leh-FOH-nee", meaning: "phone" },
      { text: "tocou", pronunciation: "toh-KOH", meaning: "rang" },
      { text: "durante", pronunciation: "doo-RAHN-chee", meaning: "during" },
      { text: "o", pronunciation: "oo", meaning: "the" },
      { text: "filme.", pronunciation: "FEEL-mee", meaning: "movie" }
    ]
  },
  {
    id: 10,
    text: "Eu derramei café na minha camisa.",
    meaning: "I spilled coffee on my shirt.",
    words: [
      { text: "Eu", pronunciation: "EH-oo", meaning: "I" },
      { text: "derramei", pronunciation: "deh-hah-MAY", meaning: "spilled" },
      { text: "café", pronunciation: "kah-FEH", meaning: "coffee" },
      { text: "na", pronunciation: "nah", meaning: "on the" },
      { text: "minha", pronunciation: "MEEN-yah", meaning: "my" },
      { text: "camisa.", pronunciation: "kah-MEE-zah", meaning: "shirt" }
    ]
  },
  {
    id: 11,
    text: "O ônibus partiu sem mim.",
    meaning: "The bus left without me.",
    words: [
      { text: "O", pronunciation: "oo", meaning: "the" },
      { text: "ônibus", pronunciation: "OH-nee-boos", meaning: "bus" },
      { text: "partiu", pronunciation: "pahr-CHEE-oo", meaning: "left" },
      { text: "sem", pronunciation: "sayn", meaning: "without" },
      { text: "mim.", pronunciation: "meen", meaning: "me" }
    ]
  },
  {
    id: 12,
    text: "Ela encontrou uma carteira na rua.",
    meaning: "She found a wallet on the street.",
    words: [
      { text: "Ela", pronunciation: "EH-lah", meaning: "she" },
      { text: "encontrou", pronunciation: "en-kon-TROH", meaning: "found" },
      { text: "uma", pronunciation: "OO-mah", meaning: "a" },
      { text: "carteira", pronunciation: "kar-TAY-rah", meaning: "wallet" },
      { text: "na", pronunciation: "nah", meaning: "on the" },
      { text: "rua.", pronunciation: "HOO-ah", meaning: "street" }
    ]
  },
  {
    id: 13,
    text: "A loja fechou cedo hoje.",
    meaning: "The store closed early today.",
    words: [
      { text: "A", pronunciation: "ah", meaning: "the" },
      { text: "loja", pronunciation: "LOH-zhah", meaning: "store" },
      { text: "fechou", pronunciation: "feh-SHOH", meaning: "closed" },
      { text: "cedo", pronunciation: "SEH-doo", meaning: "early" },
      { text: "hoje.", pronunciation: "OH-zhee", meaning: "today" }
    ]
  },
  {
    id: 14,
    text: "Eu ouvi um barulho estranho lá fora.",
    meaning: "I heard a strange noise outside.",
    words: [
      { text: "Eu", pronunciation: "EH-oo", meaning: "I" },
      { text: "ouvi", pronunciation: "oh-VEE", meaning: "heard" },
      { text: "um", pronunciation: "oom", meaning: "a" },
      { text: "barulho", pronunciation: "bah-ROO-lyoo", meaning: "noise" },
      { text: "estranho", pronunciation: "es-TRAHN-yoo", meaning: "strange" },
      { text: "lá", pronunciation: "lah", meaning: "there" },
      { text: "fora.", pronunciation: "FOH-rah", meaning: "outside" }
    ]
  },
  {
    id: 15,
    text: "Ele derrubou a bolsa no chão.",
    meaning: "He dropped his bag on the floor.",
    words: [
      { text: "Ele", pronunciation: "EH-lee", meaning: "he" },
      { text: "derrubou", pronunciation: "deh-hoo-BOH", meaning: "dropped" },
      { text: "a", pronunciation: "ah", meaning: "the" },
      { text: "bolsa", pronunciation: "BOHL-sah", meaning: "bag" },
      { text: "no", pronunciation: "noo", meaning: "on the" },
      { text: "chão.", pronunciation: "shaown", meaning: "floor" }
    ]
  }
];

// Default export for backward compatibility
export const IMITATION_UNITS = IMITATION_UNITS_EN;
