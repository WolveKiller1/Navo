/**
 * Text-to-Speech service using Web Speech API
 */

/**
 * Speaks the provided text using browser's speech synthesis
 * @param {string} text - The text to speak
 * @param {string} lang - Optional language code (e.g., 'pt-BR', 'en-US')
 * @returns {Promise<void>} - Resolves when speech is complete
 */
export function speak(text, lang = null) {
  return new Promise((resolve, reject) => {
    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Set language if provided
    if (lang) {
      utterance.lang = lang;
    }
    
    // Try to select appropriate voice based on language
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = null;
    
    if (lang) {
      // Match voice to specified language
      const langPrefix = lang.split('-')[0]; // 'pt' from 'pt-BR', 'en' from 'en-US'
      preferredVoice = voices.find(voice => voice.lang.startsWith(lang)) ||
                      voices.find(voice => voice.lang.startsWith(langPrefix));
    } else {
      // Default to English
      preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Natural')
      ) || voices.find(voice => voice.lang.startsWith('en'));
    }
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Handle events
    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      reject(event);
    };

    // Speak the text
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stops any ongoing speech
 */
export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Load voices (needed for some browsers)
 * Call this on app initialization
 */
export function initializeTTS() {
  if (window.speechSynthesis) {
    // Load voices
    window.speechSynthesis.getVoices();
    
    // Some browsers require this event listener
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}
