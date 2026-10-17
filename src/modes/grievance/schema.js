// @ts-check

/**
 * Gemini responseSchema for grievance mode. OpenAPI-subset.
 */
export const grievanceSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    english_letter: { type: 'string' },
    local_language_letter: { type: 'string' },
    where_to_submit: { type: 'array', items: { type: 'string' } },
    evidence_list: { type: 'array', items: { type: 'string' } },
  },
  required: ['subject', 'english_letter', 'local_language_letter', 'where_to_submit', 'evidence_list'],
};

/**
 * Shape check for provider output.
 * @param {unknown} obj
 */
export function isGrievanceOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  return (
    typeof o.subject === 'string' &&
    typeof o.english_letter === 'string' &&
    typeof o.local_language_letter === 'string' &&
    Array.isArray(o.where_to_submit) &&
    Array.isArray(o.evidence_list)
  );
}
