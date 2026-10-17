// @ts-check

/**
 * fetch with an AbortController timeout and clean error surface. Used by
 * every outbound call we make (Gemini, Sarvam, Places, Weather, AQI,
 * Geocoding) so nothing can hang a Vercel function for the full 60s cap.
 *
 * @param {string} url
 * @param {RequestInit & {timeoutMs?: number}} [init]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, init = {}) {
  const { timeoutMs = 15_000, signal: userSignal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  // If the caller passed their own signal, chain it in.
  if (userSignal) {
    if (userSignal.aborted) controller.abort(userSignal.reason);
    else userSignal.addEventListener('abort', () => controller.abort(userSignal.reason), { once: true });
  }
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience: returns {ok, status, body} without throwing on 4xx/5xx. */
export async function fetchJsonWithTimeout(url, init = {}) {
  try {
    const r = await fetchWithTimeout(url, init);
    const body = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: null, error: /** @type {Error} */ (err).message };
  }
}
