// @ts-check
import { AppError } from '../errors.js';
import { logger } from '../utils/logger.js';
import { validateProfile } from '../validation.js';
import { createGeminiProvider } from '../ai/gemini.js';
import { sarvamSTT } from '../ai/stt.js';
import { orchestrate } from '../agent/orchestrator.js';
import { config } from '../config.js';

const AUDIO_MIMES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
const AUDIO_MAX_BYTES = 1_500_000;

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function capture(req, res) {
  const body = /** @type {Record<string, unknown>} */ (req.body || {});
  const profile = validateProfile(body.profile);
  // Agent orchestration is routing-heavy, not drafting — use the fast model.
  const provider = createGeminiProvider({ model: config.gemini.fastModel });
  const history = Array.isArray(body.history)
    ? body.history.filter((h) => h && typeof h === 'object').slice(-6)
    : [];

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const audioRaw = body.audio;
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
  if (!text && !audioRaw) throw AppError.badRequest('capture needs text or audio');

  let transcript = text;
  let sttProvider = 'text';
  /** @type {any[]} */
  const media = [];

  if (audioRaw) {
    if (typeof audioRaw !== 'string' || !AUDIO_MIMES.some((m) => mimeType.startsWith(m))) {
      throw AppError.badRequest('capture audio mime');
    }
    const audioBytes = Math.floor((audioRaw.length * 3) / 4);
    if (audioBytes > AUDIO_MAX_BYTES) throw AppError.badRequest('audio too large (>1.5MB)');

    const stt = await sarvamSTT({ audio: audioRaw, mimeType, language: profile.language });
    if (stt) {
      transcript = stt.transcript;
      sttProvider = stt.provider;
    } else {
      // Fallback: let Gemini listen to the audio inside the agent turn.
      logger.info('capture_gemini_audio_fallback', {});
      media.push({ mimeType, data: audioRaw });
      sttProvider = 'gemini-audio';
    }
  }

  const result = await orchestrate({ transcript, history, profile, media, provider });
  res.json({ ...result, sttProvider });
}
