// @ts-check

/**
 * Thin wrapper around the server. Never includes a key; the server
 * holds GEMINI_API_KEY. 30s client-side timeout + per-tag cancellation
 * (the next call tagged "earnings" aborts the previous "earnings" call).
 */

/** @type {Map<string, AbortController>} */
const inflight = new Map();

/**
 * @param {{mode: string, input?: string, profile: any, media?: any[], context?: any, tag?: string, timeoutMs?: number}} payload
 */
export async function agent(payload) {
  const tag = payload.tag || payload.mode || 'agent';
  return fetchJson('/api/agent', { mode: payload.mode, input: payload.input, profile: payload.profile, media: payload.media, context: payload.context }, { tag, timeoutMs: payload.timeoutMs || 45_000 });
}

export async function getPublicConfig() {
  const r = await fetchWithAbort('/api/config', { tag: 'config', timeoutMs: 5_000 });
  if (!r.ok) throw new Error('Could not load app config.');
  return r.json();
}

/**
 * Shared JSON POST that cancels any in-flight request with the same tag.
 * @param {string} url
 * @param {any} body
 * @param {{tag: string, timeoutMs: number}} opts
 */
async function fetchJson(url, body, opts) {
  const r = await fetchWithAbort(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    tag: opts.tag,
    timeoutMs: opts.timeoutMs,
  });
  const data = await r.json().catch(() => ({ error: 'Bad response from server.' }));
  if (!r.ok) {
    const err = new Error(data.error || `Request failed (${r.status})`);
    /** @type {any} */ (err).code = data.code;
    throw err;
  }
  return data;
}

/**
 * @param {string} url
 * @param {RequestInit & {tag: string, timeoutMs: number}} init
 * @returns {Promise<Response>}
 */
async function fetchWithAbort(url, init) {
  const { tag, timeoutMs, ...rest } = init;
  // Cancel previous call with the same tag.
  const prev = inflight.get(tag);
  if (prev) prev.abort('superseded');
  const controller = new AbortController();
  inflight.set(tag, controller);
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (inflight.get(tag) === controller) inflight.delete(tag);
  }
}
