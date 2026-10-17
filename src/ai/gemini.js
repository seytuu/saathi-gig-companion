// @ts-check
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { logger } from '../utils/logger.js';
import { parseModelJson } from '../utils/parseModelJson.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';

/**
 * Build a Gemini provider. Features never call fetch directly.
 * @returns {import('./provider.js').AIProvider}
 */
import { LruCache } from '../utils/cache.js';

// 10-min cache for identical AI JSON requests (hash of system+user+schema).
// Skipped automatically when media is present.
const jsonCache = new LruCache({ max: 100, ttlMs: 10 * 60_000 });

/**
 * @param {{model?: string}} [opts] opts.model routes to a lighter model
 *   for classification-only calls.
 */
export function createGeminiProvider(opts = {}) {
  const model = opts.model || config.gemini.model;
  return {
    generateJson: (args) => generateJson({ ...args, model }),
    generateWithTools: (args) => generateWithTools({ ...args, model }),
  };
}

/**
 * Raw function-calling turn. Caller owns the loop (orchestrator).
 * Returns `{ parts, finishReason }`.
 *
 * @param {{system:string, contents:any[], tools?:any[]}} args
 * @returns {Promise<{parts:any[], finishReason?:string}>}
 */
async function generateWithTools({ system, contents, tools, model }) {
  if (!config.gemini.apiKey) throw AppError.misconfigured();
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools,
    generationConfig: { temperature: config.gemini.temperature },
  };
  const data = await callWithRetry(body, model);
  const cand = data?.candidates?.[0];
  return { parts: cand?.content?.parts || [], finishReason: cand?.finishReason };
}

/**
 * @param {import('./provider.js').GenerateJsonArgs} args
 */
async function generateJson({ system, user, media = [], schema, model }) {
  if (!config.gemini.apiKey) throw AppError.misconfigured();

  const parts = [{ text: user || ' ' }];
  for (const m of media) {
    parts.push({ inlineData: { mimeType: m.mimeType, data: m.data } });
  }

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: config.gemini.temperature,
    },
  };

  // Deterministic cache: only when there's no media (binary payloads are
  // never going to be byte-identical and would blow the cache budget).
  const canCache = media.length === 0;
  const cacheKey = canCache ? hash(JSON.stringify({ s: system, u: user, sc: schema, m: model || '' })) : '';
  if (canCache) {
    const hit = jsonCache.get(cacheKey);
    if (hit) return hit;
  }

  const data = await callWithRetry(body, model);
  const text =
    data?.candidates?.[0]?.content?.parts?.map((/** @type {{text?: string}} */ p) => p.text).join('') || '';
  const parsed = parseModelJson(text);
  if (parsed === null || typeof parsed !== 'object') {
    logger.warn('ai_bad_json', { textPreview: text.slice(0, 200) });
    throw AppError.upstream('invalid JSON');
  }
  if (canCache) jsonCache.set(cacheKey, parsed);
  return parsed;
}

/** FNV-1a — tiny, fast, deterministic. Enough for cache keys. @param {string} s */
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

/**
 * @param {object} body
 * @param {string} [model]
 */
async function callWithRetry(body, model) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callOnce(body, model);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof AppError)) throw err;
      const retryable = err.code === 'rate_limited' || err.code === 'upstream_error';
      if (!retryable || attempt === 1) throw err;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * @param {object} body
 * @param {string} [model]
 */
async function callOnce(body, model) {
  const url = `${config.gemini.endpoint}/${model || config.gemini.model}:generateContent`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.gemini.apiKey,
      },
      body: JSON.stringify(body),
      timeoutMs: config.gemini.timeoutMs,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('ai_http_error', { status: res.status, textPreview: text.slice(0, 200) });
      if (res.status === 429) throw AppError.rateLimited();
      if (config.gemini.retryStatuses.includes(res.status)) throw AppError.upstream(`${res.status}`);
      throw AppError.upstream(`${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (/** @type {{name?: string}} */ (err)?.name === 'AbortError') throw AppError.timeout();
    throw AppError.upstream(/** @type {Error} */ (err).message || 'unknown');
  } finally {
    /* fetchWithTimeout owns the timer */
  }
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
