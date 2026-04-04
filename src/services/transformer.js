/**
 * Text Transformer Service
 * Deterministic transformation of input text to match grammatical patterns
 * No history, no profile updates, no session storage
 */

// Hard failure strings (exact format)
export const FAILURE_INPUT_LENGTH = "Limit input to two sentences.";
export const FAILURE_PATTERN_MISMATCH = (template) => `Use the structure: "${template}".`;

/**
 * Count sentences in text
 */
function countSentences(text) {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 * Validate output (fail closed - no truncation)
 */
function validateOutput(output, patternTemplate) {
  // Count sentences
  const sentenceCount = countSentences(output);
  
  // Check for questions
  const hasQuestion = output.includes('?');
  
  // Check for teaching language or preamble
  const teachingPatterns = /\b(Let's|Here's|Now|Try|Great|Good|Well done|Remember|Notice|Note that|This means|First|Second)\b/i;
  const hasTeachingLanguage = teachingPatterns.test(output);
  
  // Check for explanatory text (colons often indicate explanation)
  const hasExplanation = output.includes(':');
  
  // Fail if any violation
  if (hasQuestion || sentenceCount > 2 || hasTeachingLanguage || hasExplanation) {
    return FAILURE_PATTERN_MISMATCH(patternTemplate);
  }
  
  return output.trim();
}

/**
 * Transform input text to match pattern structure
 * @param {string} inputText - User's input text
 * @param {string} patternTemplate - Pattern template (e.g., "I am ___.")
 * @returns {Promise<string>} - Transformed text or failure string
 */
export async function transform(inputText, patternTemplate) {
  try {
    // Client-side validation should already be done, but double-check
    const sentenceCount = countSentences(inputText);
    if (inputText.trim() === "" || sentenceCount > 2) {
      return FAILURE_INPUT_LENGTH;
    }

    // Build static transformer prompt (no per-pattern injection)
    const systemPrompt = `You are a text transformer. Transform the input text to match the specified grammatical structure.

RULES:
1. Output ONLY the transformed text. No explanations, no preamble, no commentary.
2. Use the exact grammatical structure specified in TARGET STRUCTURE.
3. Preserve the input's core meaning: same events, same actors, same facts.
4. Add ONLY minimal grammar words if absolutely required (articles, auxiliaries, tense markers).
5. Do NOT add new events, new actors, named entities, or specific identities that are not explicitly present in the input.
6. Do NOT replace pronouns (you, he, she, they, your, etc.) with specific names unless that name appears in the input.
7. Do NOT complete or expand famous phrases, quotes, or cultural references beyond what appears in the input.
8. Output maximum 2 sentences.
9. Output must be statements only. NO questions. NO question marks.
10. If the structure cannot be applied to the input meaning, output exactly this string:
   Use the structure: "${patternTemplate}".

TARGET STRUCTURE: ${patternTemplate}

INPUT: ${inputText}

OUTPUT:`;

    // Make API request with deterministic settings
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: systemPrompt,
        stream: false,
        options: {
          temperature: 0,  // Deterministic
          seed: 42,        // Fixed seed
          top_p: 1,        // No nucleus sampling
          top_k: 1         // Most likely token only
        }
      })
    });

    if (!response.ok) {
      console.error('Transformer API error:', response.statusText);
      return FAILURE_PATTERN_MISMATCH(patternTemplate);
    }

    const data = await response.json();
    const rawOutput = data.response;

    // Validate output (fail closed)
    const validatedOutput = validateOutput(rawOutput, patternTemplate);
    
    return validatedOutput;
  } catch (error) {
    console.error('Error in transformer:', error);
    return FAILURE_PATTERN_MISMATCH(patternTemplate);
  }
}
