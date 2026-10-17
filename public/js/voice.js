// @ts-check

/**
 * Web Speech API helpers — recognition (mic) + synthesis (listen).
 * Both degrade gracefully: if unsupported, calls return no-op/false.
 */

const bcpMap = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Hinglish: 'hi-IN',
  Punjabi: 'pa-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Bengali: 'bn-IN',
  Marathi: 'mr-IN',
};

/** @param {string} lang */
export function bcp(lang) {
  return bcpMap[lang] || 'en-IN';
}

export function isMicSupported() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Start a one-shot dictation session that appends to `target`'s value.
 * Returns a stop() function. Caller is responsible for toggling UI state.
 *
 * @param {HTMLTextAreaElement|HTMLInputElement} target
 * @param {string} lang
 * @param {{ onStart?: () => void, onEnd?: () => void, onError?: (msg: string) => void }} [cb]
 */
export function startDictation(target, lang, cb = {}) {
  const Ctor = /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
  if (!Ctor) {
    cb.onError?.('Voice input is not supported on this browser.');
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = bcp(lang);
  rec.interimResults = true;
  rec.continuous = false;
  const base = target.value;
  rec.onstart = () => cb.onStart?.();
  rec.onerror = (e) => cb.onError?.(e.error || 'mic error');
  rec.onend = () => cb.onEnd?.();
  rec.onresult = (e) => {
    let txt = '';
    for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    target.value = (base ? base + ' ' : '') + txt.trim();
  };
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}

/**
 * Read text aloud using SpeechSynthesis. Picks a voice matching the
 * worker's language, with hi-IN/en-IN fallback.
 *
 * @param {string} text
 * @param {string} lang
 */
export function speak(text, lang) {
  if (!('speechSynthesis' in window) || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = bcp(lang);
  const voices = window.speechSynthesis.getVoices();
  const match =
    voices.find((v) => v.lang === utter.lang) ||
    voices.find((v) => v.lang === 'hi-IN') ||
    voices.find((v) => v.lang === 'en-IN') ||
    null;
  if (match) utter.voice = match;
  utter.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
