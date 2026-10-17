// @ts-check
import { logger } from '../utils/logger.js';

const SARVAM_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_MODEL = 'saarika:v2.5';

const BCP = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Hinglish: 'hi-IN',
  Punjabi: 'pa-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Bengali: 'bn-IN',
  Marathi: 'mr-IN',
};

/**
 * Try Sarvam Saarika. Returns null on any failure so the caller can fall
 * back to Gemini audio.
 *
 * @param {{audio:string, mimeType:string, language:string}} args
 * @returns {Promise<{transcript:string, provider:string, languageCode:string}|null>}
 */
export async function sarvamSTT({ audio, mimeType, language }) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return null;
  const languageCode = BCP[language] || 'unknown';

  try {
    const bytes = Buffer.from(audio, 'base64');
    const form = new FormData();
    const blob = new Blob([bytes], { type: mimeType });
    form.append('file', blob, 'audio.webm');
    form.append('model', SARVAM_MODEL);
    if (languageCode && languageCode !== 'unknown') form.append('language_code', languageCode);

    const r = await fetch(SARVAM_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': key },
      body: form,
    });
    if (!r.ok) {
      logger.warn('sarvam_status', { status: r.status });
      return null;
    }
    const data = await r.json();
    const transcript = data.transcript || data.text || '';
    if (!transcript) return null;
    return { transcript, provider: 'sarvam', languageCode };
  } catch (err) {
    logger.warn('sarvam_fetch_failed', { msg: /** @type {Error} */ (err).message });
    return null;
  }
}

/**
 * Language-code lookup used by both Sarvam and the client's SpeechSynthesis.
 * @param {string} language
 */
export function bcpFor(language) {
  return BCP[language] || 'en-IN';
}
