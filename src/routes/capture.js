// @ts-check
import { AppError } from '../errors.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { validateProfile } from '../validation.js';
import { createGeminiProvider } from '../ai/gemini.js';
import { sarvamSTT } from '../ai/stt.js';
import { buildCapturePrompt } from '../modes/capture/prompt.js';
import { captureSchema, isCaptureOutput, VALID_INTENTS } from '../modes/capture/schema.js';

const AUDIO_MIMES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
const AUDIO_MAX_BYTES = 1_500_000;

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function capture(req, res) {
  const body = /** @type {Record<string, unknown>} */ (req.body || {});
  const profile = validateProfile(body.profile);
  const provider = createGeminiProvider();

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const audioRaw = body.audio;
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';

  if (!text && !audioRaw) throw AppError.badRequest('capture needs text or audio');

  // Text path: skip STT; just classify.
  if (text && !audioRaw) {
    const out = await classify({ provider, profile, transcript: text, audio: null });
    return res.json({ ...out, sttProvider: 'text' });
  }

  // Audio path: Sarvam primary → Gemini audio fallback.
  if (typeof audioRaw !== 'string' || !AUDIO_MIMES.includes(mimeType)) {
    throw AppError.badRequest('capture audio mime');
  }
  const audioBytes = Math.floor((audioRaw.length * 3) / 4);
  if (audioBytes > AUDIO_MAX_BYTES) throw AppError.badRequest('audio too large (>1.5MB)');

  const stt = await sarvamSTT({ audio: audioRaw, mimeType, language: profile.language });
  if (stt) {
    const out = await classify({ provider, profile, transcript: stt.transcript, audio: null });
    return res.json({ ...out, transcript: out.transcript || stt.transcript, sttProvider: stt.provider });
  }

  // Fallback: let Gemini listen to the audio and classify in one call.
  logger.info('capture_gemini_audio_fallback', {});
  const out = await classify({
    provider,
    profile,
    transcript: '',
    audio: { mimeType, data: audioRaw },
  });
  return res.json({ ...out, sttProvider: 'gemini-audio' });
}

/**
 * @param {{provider: any, profile: any, transcript: string, audio: {mimeType:string, data:string}|null}} args
 */
async function classify({ provider, profile, transcript, audio }) {
  const ctx = { input: transcript, profile, media: audio ? [audio] : [], context: {} };
  const system = buildCapturePrompt(ctx);
  const userText = transcript
    ? `Worker said (transcript): ${JSON.stringify(transcript)}`
    : 'The attached audio is the worker speaking. Transcribe it, then classify the intent.';

  const out = await provider.generateJson({
    system,
    user: userText,
    media: audio ? [audio] : [],
    schema: captureSchema,
  });
  if (!isCaptureOutput(out)) throw AppError.upstream('bad capture shape');
  if (!VALID_INTENTS.includes(out.intent)) out.intent = 'unknown';
  // Keep profile-only intents safely routable
  if (!config.modes.includes(out.intent) && out.intent !== 'unknown') out.intent = 'unknown';
  return out;
}
