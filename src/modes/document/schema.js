// @ts-check

export const documentSchema = {
  type: 'object',
  properties: {
    document_type: { type: 'string' },
    plain_explanation: { type: 'string' },
    key_points: { type: 'array', items: { type: 'string' } },
    action_needed: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['document_type', 'plain_explanation', 'key_points', 'action_needed', 'warnings'],
};

/** @param {unknown} obj */
export function isDocumentOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  return (
    typeof o.document_type === 'string' &&
    typeof o.plain_explanation === 'string' &&
    Array.isArray(o.key_points) &&
    Array.isArray(o.action_needed) &&
    Array.isArray(o.warnings)
  );
}
