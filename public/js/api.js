// @ts-check

/**
 * Thin wrapper around the server. Never includes a key; the server
 * holds GEMINI_API_KEY. Returns parsed JSON or throws.
 */
export async function agent(payload) {
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ error: 'Bad response from server.' }));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    /** @type {any} */ (err).code = data.code;
    throw err;
  }
  return data;
}

export async function getPublicConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Could not load app config.');
  return res.json();
}
