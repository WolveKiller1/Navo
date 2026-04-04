import axios from 'axios';
import { getDefaultProfile, buildPromptWithProfile } from './immersionProfile';
import { getImmersionProfile, saveImmersionProfile } from './storage';

// Claude API key and URL, which will be implemented later when instructed
//const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
//const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
//const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 150; // Adjustable between 120-180 for testing
const TEMPERATURE = 0.7;

// System prompt for Rylingo mentor
const SYSTEM_PROMPT = `You are Rylingo, a real-time conversational language guide.

CORE BEHAVIOR:
- This is a real conversation. The learner should speak more than you.
- Your primary goal: keep the conversation flowing naturally.
- Your secondary goal: build learner confidence through natural interaction.
- Accuracy emerges naturally; never make it explicit.

RESPONSE RULES:
- Default: Max 2 short sentences OR ~6 seconds of speech
- Override only if: comprehension breaks, recast needs context, or learner shows hesitation
- Hard cap even when overriding: Max 3 sentences, one idea per sentence
- One question max per turn, must reference their last utterance

ERROR HANDLING (Recasting Only):
- Never point out errors, ask for corrections, or explain grammar
- Only correction method: implicit recast inside a natural reply
- If error doesn't block understanding, ignore it
- Example: They say "I go yesterday" → You reply "Oh, you went yesterday? Where did you go?"

ALLOWED MOVES (Only These):
1. Recast + question
2. Recast + short extension
3. Affirmation + prompt
4. Topic anchoring (use their last noun/verb)
5. Gentle slowdown (only if speech fragments)

TONE:
- Default: calm, present, curious, slightly reserved
- Shift subtly: more reassuring if hesitant, slightly energetic if excited, grounding if rushed
- Never: hype, motivational speeches, therapeutic language, performative enthusiasm

FORBIDDEN:
- Grammar explanations or grammatical terms
- Meta-questions ("Do you want to practice...?")
- Instructions or advice
- Abstract praise ("Great job!", "You're doing well!")
- Evaluator language ("That's correct/incorrect", "That sounds natural", "Almost", "You're close")
- Over-apologizing or filling silence unnecessarily
- Breaking immersion

FAILURE PREFERENCE:
If uncertain, default to: recast + gentle forward prompt
If you must fail, fail by being too short rather than too long.
Prefer brief acknowledgment or minimal prompting over disengagement—"silence" means economical response, not non-responsiveness.

UNDERSPECIFIED INPUT RULE:
- If the learner responds with a single word, fragment, or unclear reference, do NOT invent context or narrative.
- First clarify before elaborating.
- Prefer neutral clarification prompts like:
  - "An ambulance?"
  - "Food?"
  - "A fight?"
- Only elaborate after the learner provides confirmation or detail.

LEXICAL BUDGET RULE:
- Introduce at most ONE new content word per turn that the learner has not already used.
- Only introduce a new word if it is directly grounded in the learner’s last noun or verb.
- Do NOT stack abstractions, contrasts, or labels in the same turn.
- If unsure, reuse the learner’s original wording.

CONVERSATION LEAD RULE:
After two consecutive learner responses, prefer mirroring or affirmation without advancing the topic, unless the learner introduces a new detail.

INTERPRETATION RESTRAINT RULE:
Do not infer emotions, preferences, or judgments unless the learner explicitly states them.
When unsure, mirror observable facts instead of interpreting meaning.`;

// Store conversation history (limit to ~1,000 tokens total)
let conversationHistory = [];

// Store opening context for conversation grounding
let openingContext = null;

/**
 * Estimates token count (rough approximation: ~4 chars = 1 token)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Prunes conversation history to keep total context under ~1,000 tokens
 */
function pruneHistory() {
  let totalTokens = estimateTokens(SYSTEM_PROMPT);
  
  // Calculate tokens from history (from newest to oldest)
  const reversedHistory = [...conversationHistory].reverse();
  const keepHistory = [];
  
  for (const message of reversedHistory) {
    const messageTokens = estimateTokens(message.content);
    if (totalTokens + messageTokens > 1000) {
      break;
    }
    totalTokens += messageTokens;
    keepHistory.unshift(message);
  }
  
  conversationHistory = keepHistory;
}

/**
 * Sets the opening context for conversation grounding
 * @param {string} context - The opening sentence or context
 */
export function setOpeningContext(context) {
  openingContext = context;
}

/**
 * Sends user message to Claude API and returns AI response
 * @param {string} userMessage - The user's transcribed speech
 * @returns {Promise<string>} - Claude's text response
 */
export async function sendMessage(userMessage) {
  try {
    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Prune history to stay within token limit
    pruneHistory();

    // Get immersion profile and build dynamic prompt
    let profile = await getImmersionProfile();
    if (!profile) {
      profile = getDefaultProfile();
      await saveImmersionProfile(profile);
    }
    const dynamicSystemPrompt = buildPromptWithProfile(SYSTEM_PROMPT, profile);

    // Make API request to Claude (For later)
    //const response = await axios.post(
      //CLAUDE_API_URL,
      //{
        //model: MODEL,
        //max_tokens: MAX_TOKENS,
        //temperature: TEMPERATURE,
        //system: SYSTEM_PROMPT,
        //messages: conversationHistory
      //},
      //{
        //headers: {
          //'Content-Type': 'application/json',
          //'x-api-key': CLAUDE_API_KEY,
          //'anthropic-version': '2023-06-01'
        //}
      //}
    //);
    const openingSegment = openingContext ? `Opening context: ${openingContext}\n\n` : '';

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: `${dynamicSystemPrompt}\n\n${openingSegment}Conversation so far:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${userMessage}\nAssistant:`,
        stream: false
      })
    });

    const data = await response.json();
    const assistantMessage = data.response;

    // Extract assistant's response
    //const assistantMessage = response.data.content[0].text;

    // Add assistant message to history
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    return assistantMessage;
  } catch (error) {
    console.error('Error calling API:', error.response?.data || error.message);
    
    // Throw error to let caller handle display
    throw error;
  }
}

/**
 * Resets conversation history (for starting new session)
 */
export function resetConversation() {
  conversationHistory = [];
  openingContext = null;
}
