/**
 * Pattern Library for Playground Mode
 * Template patterns with blanks - filtered by immersionProfile.depth
 * No grammar labels, no teaching language, no prompt injection fields
 */

export const PATTERNS = [
  {
    id: 'pattern-1',
    minDepth: 0.5,
    template: 'I am ___.'
  },
  {
    id: 'pattern-2',
    minDepth: 1.0,
    template: 'I like ___.'
  },
  {
    id: 'pattern-3',
    minDepth: 1.5,
    template: 'I want ___ because ___.'
  },
  {
    id: 'pattern-4',
    minDepth: 2.5,
    template: 'If ___, I would ___.'
  },
  {
    id: 'pattern-5',
    minDepth: 3.0,
    template: 'Even though ___, ___.'
  }
];
