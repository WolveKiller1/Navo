/**
 * Determine if a sentence is reusable based on simple heuristics.
 * @param {string} sentence
 * @returns {boolean}
 */
export function isReusableSentence(sentence) {
  if (!sentence || typeof sentence !== 'string') return false;
  const trimmed = sentence.trim();
  if (trimmed.length < 5) return false;
  // Avoid generic short answers and empty templates
  const low = trimmed.toLowerCase();
  const nonReusable = ['hello', 'ok', 'yes', 'no', '...'];
  if (nonReusable.includes(low)) return false;
  return true;
}
