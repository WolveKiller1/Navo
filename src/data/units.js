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

// Imitation Loop Units - Portuguese
export const IMITATION_UNITS_PT = [
  { id: 1, text: "Eu perdi o ônibus esta manhã." },
  { id: 2, text: "Ela deixou o telefone em casa." },
  { id: 3, text: "Começou a chover do nada." },
  { id: 4, text: "O professor me fez uma pergunta." },
  { id: 5, text: "Um cachorro correu pela rua." },
  { id: 6, text: "Meu amigo chegou atrasado." },
  { id: 7, text: "Eu esqueci minhas chaves no trabalho." },
  { id: 8, text: "A porta abriu de repente." },
  { id: 9, text: "Meu telefone tocou durante o filme." },
  { id: 10, text: "Eu derramei café na minha camisa." },
  { id: 11, text: "O ônibus partiu sem mim." },
  { id: 12, text: "Ela encontrou uma carteira na rua." },
  { id: 13, text: "A loja fechou cedo hoje." },
  { id: 14, text: "Eu ouvi um barulho estranho lá fora." },
  { id: 15, text: "Ele derrubou a bolsa no chão." }
];

// Default export for backward compatibility
export const IMITATION_UNITS = IMITATION_UNITS_EN;
