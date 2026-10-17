// @ts-check

export const scamSchema = {
  type: 'object',
  properties: {
    verdict: { type: 'string' }, // scam | suspicious | safe
    reasons: { type: 'array', items: { type: 'string' } },
    what_to_do: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'reasons', 'what_to_do'],
};

/** @param {unknown} obj */
export function isScamOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  return (
    typeof o.verdict === 'string' &&
    ['scam', 'suspicious', 'safe'].includes(o.verdict) &&
    Array.isArray(o.reasons) &&
    Array.isArray(o.what_to_do)
  );
}
