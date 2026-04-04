/**
 * Word Meaning Service - Phase 11
 * 
 * Fallback-first strategy:
 * 1. Built-in meaning map (common words) - instant
 * 2. Runtime cache (previously looked up) - instant
 * 3. LLM fallback (uncommon words) - slower
 * 
 * LIMITATION: Optimized for space-separated languages (English, Spanish, etc.)
 * Future expansion needed for CJK languages requiring tokenization.
 */

// Built-in meanings for ~150 most common English words
const COMMON_MEANINGS = {
  "forgot": "didn't remember / left behind",
  "phone": "mobile device",
  "home": "where you live",
  "went": "past: go / moved to",
  "because": "for this reason",
  "but": "however / opposite",
  "if": "in case / supposing",
  "will": "future: going to",
  "would": "conditional: might",
  "might": "possibly / maybe",
  "could": "able to / possibility",
  "should": "recommended / ought to",
  "have": "possess / own",
  "has": "possesses / owns",
  "had": "past: possess",
  "was": "past: be",
  "were": "past: be (plural)",
  "been": "past: be",
  "is": "exists / equals",
  "are": "exist / equal (plural)",
  "am": "I exist",
  "do": "perform / action",
  "does": "performs",
  "did": "past: perform",
  "can": "able to",
  "may": "possible / allowed",
  "must": "required / necessary",
  "need": "require / want",
  "want": "desire / wish",
  "like": "enjoy / similar to",
  "love": "care deeply / enjoy very much",
  "hate": "dislike strongly",
  "think": "believe / consider",
  "know": "understand / aware",
  "say": "speak / tell",
  "said": "past: speak / told",
  "tell": "inform / say to someone",
  "told": "past: inform",
  "ask": "request / question",
  "asked": "past: request",
  "get": "obtain / receive",
  "got": "past: obtain",
  "give": "provide / offer",
  "gave": "past: provide",
  "take": "grab / receive",
  "took": "past: grab",
  "make": "create / cause",
  "made": "past: create",
  "find": "discover / locate",
  "found": "past: discover",
  "see": "look at / observe",
  "saw": "past: look at",
  "come": "arrive / move toward",
  "came": "past: arrive",
  "go": "move / travel",
  "going": "moving / traveling",
  "work": "job / function",
  "worked": "past: function",
  "call": "phone / name",
  "called": "past: phone",
  "try": "attempt / test",
  "tried": "past: attempt",
  "use": "employ / utilize",
  "used": "past: employ",
  "feel": "sense / emotion",
  "felt": "past: sense",
  "leave": "depart / exit",
  "left": "past: depart",
  "put": "place / position",
  "mean": "signify / intend",
  "meant": "past: signify",
  "keep": "maintain / hold",
  "kept": "past: maintain",
  "let": "allow / permit",
  "begin": "start / commence",
  "began": "past: start",
  "seem": "appear to be",
  "seemed": "past: appear",
  "help": "assist / aid",
  "helped": "past: assist",
  "show": "display / demonstrate",
  "showed": "past: display",
  "hear": "listen / perceive sound",
  "heard": "past: listen",
  "play": "game / perform",
  "played": "past: play",
  "run": "sprint / operate",
  "ran": "past: sprint",
  "move": "relocate / shift",
  "moved": "past: relocate",
  "live": "reside / exist",
  "lived": "past: reside",
  "believe": "trust / think true",
  "bring": "carry here",
  "brought": "past: carry here",
  "happen": "occur / take place",
  "happened": "past: occur",
  "write": "compose / record",
  "wrote": "past: compose",
  "sit": "be seated",
  "sat": "past: be seated",
  "stand": "be upright",
  "stood": "past: be upright",
  "lose": "misplace / fail to win",
  "lost": "past: misplace",
  "pay": "give money",
  "paid": "past: give money",
  "meet": "encounter / gather",
  "met": "past: encounter",
  "include": "contain / add",
  "continue": "keep going",
  "set": "place / group",
  "learn": "study / discover how",
  "learned": "past: study",
  "change": "alter / modify",
  "changed": "past: alter",
  "lead": "guide / direct",
  "led": "past: guide",
  "understand": "comprehend / grasp",
  "watch": "observe / look at",
  "follow": "go after / pursue",
  "stop": "halt / cease",
  "stopped": "past: halt",
  "create": "make / produce",
  "speak": "talk / say words",
  "spoke": "past: talk",
  "read": "look at text / comprehend",
  "spend": "use money or time",
  "spent": "past: use money",
  "grow": "increase / develop",
  "grew": "past: increase",
  "open": "not closed / start",
  "opened": "past: not closed",
  "walk": "move on foot",
  "walked": "past: move on foot",
  "win": "succeed / triumph",
  "won": "past: succeed",
  "offer": "propose / give choice",
  "remember": "recall / not forget",
  "consider": "think about / regard",
  "appear": "seem / become visible",
  "buy": "purchase / acquire",
  "bought": "past: purchase",
  "wait": "stay / pause",
  "serve": "provide service / help",
  "die": "stop living / expire",
  "send": "transmit / deliver",
  "sent": "past: transmit",
  "expect": "anticipate / suppose",
  "build": "construct / create",
  "built": "past: construct",
  "stay": "remain / not leave",
  "fall": "drop / descend",
  "fell": "past: drop",
  "cut": "slice / divide",
  "reach": "arrive at / extend to",
  "kill": "cause death",
  "raise": "lift / increase",
  "pass": "go by / succeed",
  "sell": "trade for money",
  "sold": "past: trade",
  "decide": "choose / determine",
  "return": "come back / go back",
  "explain": "clarify / make clear",
  "hope": "wish / desire",
  "develop": "grow / improve",
  "carry": "transport / hold",
  "break": "fracture / damage",
  "broke": "past: fracture",
  "receive": "get / accept",
  "agree": "concur / say yes",
  "support": "help / hold up",
  "hit": "strike / impact",
  "produce": "create / make",
  "eat": "consume food",
  "ate": "past: consume food",
  "cover": "overlay / hide",
  "catch": "grab / intercept",
  "caught": "past: grab",
  "draw": "sketch / pull",
  "choose": "select / pick",
  "chose": "past: select",
  "cause": "make happen / reason"
};

const runtimeCache = new Map();

/**
 * Get simple meaning for a word using fallback-first strategy
 * @param {string} word - The word to get meaning for
 * @param {string} sentenceContext - The full sentence for context
 * @returns {Promise<string|null>} - Simple meaning or null if unavailable
 */
export async function getWordMeaning(word, sentenceContext) {
  const cleanWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
  
  // 1. Check built-in map (instant)
  if (COMMON_MEANINGS[cleanWord]) {
    return COMMON_MEANINGS[cleanWord];
  }
  
  // 2. Check runtime cache (instant)
  const cacheKey = `${cleanWord}|${sentenceContext}`;
  if (runtimeCache.has(cacheKey)) {
    return runtimeCache.get(cacheKey);
  }
  
  // 3. LLM fallback (slower, for uncommon words)
  try {
    const meaning = await fetchMeaningFromLLM(cleanWord, sentenceContext);
    runtimeCache.set(cacheKey, meaning);
    return meaning;
  } catch (error) {
    console.error('Error fetching word meaning:', error);
    return null; // Graceful failure
  }
}

/**
 * Fetch word meaning from LLM (fallback for uncommon words)
 * @param {string} word - Clean word (no punctuation, lowercase)
 * @param {string} sentenceContext - Full sentence for context
 * @returns {Promise<string>} - Simple meaning
 */
async function fetchMeaningFromLLM(word, sentenceContext) {
  const prompt = `Give a simple, natural meaning for this word in context.

Word: "${word}"
Sentence: "${sentenceContext}"

RULES:
1. Explain conceptually, not academically
2. Keep it 1-2 short phrases maximum
3. Use simple, everyday language
4. Format: [word] → [simple meaning]
5. No grammar terms, no long explanations

Meaning:`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0,
        max_tokens: 50,
        top_p: 1
      }
    })
  });

  if (!response.ok) throw new Error('LLM API error');
  
  const data = await response.json();
  return data.response.trim();
}
