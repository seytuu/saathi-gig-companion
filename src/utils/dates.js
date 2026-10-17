// @ts-check

/**
 * Normalize relative or free-form date strings to ISO YYYY-MM-DD, resolved
 * in Asia/Kolkata (where our workers are). Deterministic (no AI).
 *
 * Handles: today / aaj / yesterday / kal / parso (-2) / tomorrow / parson (+2)
 * Also passes through anything already in YYYY-MM-DD.
 *
 * @param {string} input
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD
 */
export function normalizeDate(input, now = new Date()) {
  const s = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const offsets = {
    today: 0,
    aaj: 0,
    aj: 0,
    'is din': 0,
    yesterday: -1,
    kal: -1, // In worker context, almost always "yesterday"
    kalh: -1,
    beeta: -1,
    parso: -2,
    parson: -2,
    tomorrow: 1,
    'kal aage': 1,
    'day before yesterday': -2,
    'day after tomorrow': 2,
  };

  // Match the longest known phrase first.
  const keys = Object.keys(offsets).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (s === k || s.includes(k)) return iso(addDays(now, offsets[k]));
  }

  // DD-MM-YY or DD/MM/YYYY etc.
  const dmy = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(date.getTime())) return iso(date);
  }

  // Fallback: today (don't invent anything suspicious).
  return iso(now);
}

/** @param {Date} d @param {number} days */
function addDays(d, days) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Format a Date as YYYY-MM-DD in Asia/Kolkata, no matter what the host tz is.
 * @param {Date} d
 */
function iso(d) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA returns YYYY-MM-DD directly.
  return fmt.format(d);
}
