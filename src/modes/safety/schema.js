// @ts-check

export const safetySchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    do_now: { type: 'array', items: { type: 'string' } },
    do_not: { type: 'array', items: { type: 'string' } },
    evidence_to_keep: { type: 'array', items: { type: 'string' } },
    report_to: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'do_now', 'do_not', 'evidence_to_keep', 'report_to'],
};

/** @param {unknown} obj */
export function isSafetyOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  return (
    typeof o.title === 'string' &&
    Array.isArray(o.do_now) &&
    Array.isArray(o.do_not) &&
    Array.isArray(o.evidence_to_keep) &&
    Array.isArray(o.report_to)
  );
}
