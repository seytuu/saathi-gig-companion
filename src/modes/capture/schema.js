// @ts-check

export const captureSchema = {
  type: 'object',
  properties: {
    transcript: { type: 'string' },
    intent: { type: 'string' },
    confidence: { type: 'number' },
    reply: { type: 'string' },
    prefill: { type: 'string' },
  },
  required: ['transcript', 'intent', 'confidence', 'reply', 'prefill'],
};

export const VALID_INTENTS = [
  'earnings',
  'safety',
  'schemes',
  'document',
  'grievance',
  'scam',
  'unknown',
];

/** @param {unknown} obj */
export function isCaptureOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  return (
    typeof o.transcript === 'string' &&
    typeof o.intent === 'string' &&
    VALID_INTENTS.includes(o.intent) &&
    typeof o.confidence === 'number' &&
    typeof o.reply === 'string' &&
    typeof o.prefill === 'string'
  );
}
