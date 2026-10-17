// @ts-check

export const schemesSchema = {
  type: 'object',
  properties: {
    schemes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          who_can_apply: { type: 'string' },
          benefits: { type: 'string' },
          how_to_apply_steps: { type: 'array', items: { type: 'string' } },
          documents_needed: { type: 'array', items: { type: 'string' } },
          official_link: { type: 'string' },
        },
        required: [
          'name',
          'who_can_apply',
          'benefits',
          'how_to_apply_steps',
          'documents_needed',
          'official_link',
        ],
      },
    },
  },
  required: ['schemes'],
};

/** @param {unknown} obj */
export function isSchemesOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  if (!Array.isArray(o.schemes)) return false;
  return o.schemes.every(
    (s) =>
      s &&
      typeof s === 'object' &&
      typeof s.name === 'string' &&
      typeof s.who_can_apply === 'string' &&
      typeof s.benefits === 'string' &&
      Array.isArray(s.how_to_apply_steps) &&
      Array.isArray(s.documents_needed) &&
      typeof s.official_link === 'string'
  );
}
