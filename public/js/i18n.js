// @ts-check

/**
 * Lazy i18n loader. Each language pack lives at public/js/i18n/<code>.js
 * (default export = key→text map) and is fetched via dynamic import() the
 * first time it is needed. Fallback chain: chosen → Hindi (for Indic
 * scripts) → English. English is bundled with the first language so there
 * is never a flash of key names.
 */

/** Short code per Saathi language. Keep in sync with public/js/i18n/*.js. */
const codeMap = {
  English: 'en',
  Hindi: 'hi',
  Hinglish: 'hinglish',
  Punjabi: 'pa',
  Tamil: 'ta',
  Telugu: 'te',
  Bengali: 'bn',
  Marathi: 'mr',
};

/** HTML `lang` attribute and SpeechRecognition BCP-47. */
const htmlLangMap = {
  English: 'en',
  Hindi: 'hi',
  Hinglish: 'hi-Latn',
  Punjabi: 'pa',
  Tamil: 'ta',
  Telugu: 'te',
  Bengali: 'bn',
  Marathi: 'mr',
};

/** @type {Map<string, Record<string,string>>} */
const packs = new Map();

/** Which Indic-script langs fall back to Hindi before English. */
const INDIC_SCRIPT = new Set(['Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi']);

/** @param {string} lang */
export function htmlLang(lang) {
  return htmlLangMap[lang] || 'en';
}

/**
 * Load a language pack (and English + Hindi as fallbacks). Idempotent.
 * @param {string} lang
 */
export async function loadLang(lang) {
  await Promise.all(
    [lang, INDIC_SCRIPT.has(lang) ? 'Hindi' : null, 'English']
      .filter(Boolean)
      .map((l) => loadOne(/** @type {string} */ (l)))
  );
}

async function loadOne(lang) {
  if (packs.has(lang)) return;
  const code = codeMap[lang];
  if (!code) {
    packs.set(lang, {});
    return;
  }
  try {
    const mod = await import(`./i18n/${code}.js`);
    packs.set(lang, mod.default || {});
  } catch (err) {
    console.warn(`i18n: pack ${code} missing`, err);
    packs.set(lang, {});
  }
}

/**
 * Resolve a key with the fallback chain. If packs aren't loaded yet,
 * returns the key itself (caller should await loadLang before first paint).
 * @param {string} lang
 * @param {string} key
 */
export function t(lang, key) {
  const chosen = packs.get(lang);
  if (chosen && chosen[key]) return chosen[key];
  if (INDIC_SCRIPT.has(lang)) {
    const hi = packs.get('Hindi');
    if (hi && hi[key]) return hi[key];
  }
  const en = packs.get('English');
  if (en && en[key]) return en[key];
  return key;
}

/**
 * Replace `data-i18n` text and `data-i18n-aria-label` attributes within the
 * given root using the chosen language.
 * @param {ParentNode} root
 * @param {string} lang
 */
export function applyI18n(root, lang) {
  // Ensure the pack is in memory before writing. If called synchronously
  // with an unloaded pack, callers will have already awaited loadLang.
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(lang, key);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(lang, key));
  });
  document.documentElement.lang = htmlLang(lang);
}
