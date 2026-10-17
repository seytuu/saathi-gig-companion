// @ts-check

export const earningsSchema = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          platform: { type: 'string' },
          orders: { type: 'number' },
          gross: { type: 'number' },
          incentives: { type: 'number' },
          deductions: { type: 'number' },
          expenses: { type: 'number' },
          net: { type: 'number' },
          notes: { type: 'string' },
          flag: { type: 'string' },
        },
        required: [
          'date',
          'platform',
          'orders',
          'gross',
          'incentives',
          'deductions',
          'expenses',
          'net',
          'notes',
        ],
      },
    },
    tip: { type: 'string' },
  },
  required: ['entries', 'tip'],
};

/** @param {unknown} obj */
export function isEarningsOutput(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  if (!Array.isArray(o.entries) || typeof o.tip !== 'string') return false;
  return o.entries.every(
    (e) =>
      e &&
      typeof e === 'object' &&
      typeof e.date === 'string' &&
      typeof e.platform === 'string' &&
      typeof e.orders === 'number' &&
      typeof e.gross === 'number' &&
      typeof e.net === 'number'
  );
}
