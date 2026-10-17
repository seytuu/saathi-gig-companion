// @ts-check
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { logger } from '../utils/logger.js';
import { parseModelJson } from '../utils/parseModelJson.js';

/**
 * Build a Gemini provider. Features never call fetch directly.
 * @returns {import('./provider.js').AIProvider}
 */
export function createGeminiProvider() {
  return {
    generateJson,
    generateWithTools,
  };
}

/**
 * Raw function-calling turn. Caller owns the loop (orchestrator).
 * Returns `{ parts, finishReason }`.
 *
 * @param {{system:string, contents:any[], tools?:any[]}} args
 * @returns {Promise<{parts:any[], finishReason?:string}>}
 */
async function generateWithTools({ system, contents, tools }) {
  if (!config.gemini.apiKey) throw AppError.misconfigured();
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools,
    generationConfig: { temperature: config.gemini.temperature },
  };
  const data = await callWithRetry(body);
  const cand = data?.candidates?.[0];
  return { parts: cand?.content?.parts || [], finishReason: cand?.finishReason };
}

/**
 * @param {import('./provider.js').GenerateJsonArgs} args
 */
async function generateJson({ system, user, media = [], schema }) {
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

  const data = await callWithRetry(body);
  const text =
    data?.candidates?.[0]?.content?.parts?.map((/** @type {{text?: string}} */ p) => p.text).join('') || '';
  const parsed = parseModelJson(text);
  if (parsed === null || typeof parsed !== 'object') {
    logger.warn('ai_bad_json', { textPreview: text.slice(0, 200) });
    throw AppError.upstream('invalid JSON');
  }
  return parsed;
}

/**
 * @param {object} body
 */
async function callWithRetry(body) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callOnce(body);
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
 */
async function callOnce(body) {
  const url = `${config.gemini.endpoint}/${config.gemini.model}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.gemini.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.gemini.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
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
    clearTimeout(timer);
  }
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
