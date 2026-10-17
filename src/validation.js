// @ts-check
import { config } from './config.js';
import { AppError } from './errors.js';

/** @param {unknown} v */
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {unknown} v */
const isStr = (v) => typeof v === 'string';

/**
 * Validate /api/agent body. Throws AppError on failure.
 * @param {unknown} body
 * @returns {import('./types.js').AgentRequest}
 */
export function validateAgentRequest(body) {
  if (!isObj(body)) throw AppError.badRequest('body');
  const b = /** @type {Record<string, unknown>} */ (body);

  const mode = b.mode;
  if (!isStr(mode) || !config.modes.includes(mode)) {
    throw AppError.badRequest('mode');
  }

  const input = isStr(b.input) ? b.input : '';
  if (input.length > config.limits.maxTextChars) throw AppError.badRequest('input too long');

  const profile = validateProfile(b.profile);
  const media = validateMedia(b.media);
  const context = isObj(b.context) ? /** @type {Record<string, unknown>} */ (b.context) : {};

  // We don't reject empty input here — some modes (schemes) run from
  // the profile alone. Each mode validates its own minimum inputs.

  return { mode, input, profile, media, context };
}

/**
 * @param {unknown} raw
 * @returns {import('./types.js').WorkerProfile}
 */
export function validateProfile(raw) {
  if (!isObj(raw)) throw AppError.badRequest('profile');
  const p = /** @type {Record<string, unknown>} */ (raw);

  const check = (/** @type {string} */ field, /** @type {unknown} */ val) => {
    if (!isStr(val)) throw AppError.badRequest(`profile.${field}`);
    const trimmed = /** @type {string} */ (val).trim();
    if (!trimmed) throw AppError.badRequest(`profile.${field}`);
    if (trimmed.length > config.limits.maxProfileFieldChars) {
      throw AppError.badRequest(`profile.${field} too long`);
    }
    return trimmed;
  };

  const name = check('name', p.name);
  const workTypeRaw = check('workType', p.workType);
  if (!config.workTypes.includes(workTypeRaw)) throw AppError.badRequest('profile.workType');
  const platform = check('platform', p.platform);
  const city = check('city', p.city);
  const state = check('state', p.state);
  const language = check('language', p.language);
  if (!config.languages.includes(language)) throw AppError.badRequest('profile.language');

  const simpleMode = p.simpleMode === true;

  return {
    name,
    workType: /** @type {import('./types.js').WorkerProfile['workType']} */ (workTypeRaw),
    platform,
    city,
    state,
    language,
    simpleMode,
  };
}

/**
 * @param {unknown} raw
 * @returns {import('./types.js').MediaPart[]}
 */
export function validateMedia(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw AppError.badRequest('media');
  if (raw.length > config.limits.maxMediaParts) throw AppError.badRequest('media parts > max');

  let totalBytes = 0;
  const out = [];
  for (const part of raw) {
    if (!isObj(part)) throw AppError.badRequest('media part');
    const mimeType = /** @type {Record<string, unknown>} */ (part).mimeType;
    const data = /** @type {Record<string, unknown>} */ (part).data;
    if (!isStr(mimeType) || !config.mediaMimeAllowed.includes(mimeType)) {
      throw AppError.badRequest('media mimeType');
    }
    if (!isStr(data) || !/^[A-Za-z0-9+/=\s]+$/.test(data)) {
      throw AppError.badRequest('media data');
    }
    // Approx decoded size: base64 length * 3/4
    const bytes = Math.floor((data.length * 3) / 4);
    totalBytes += bytes;
    if (totalBytes > config.limits.maxMediaBytes) throw AppError.badRequest('media total too large');
    out.push({ mimeType, data: data.replace(/\s+/g, '') });
  }
  return out;
}
