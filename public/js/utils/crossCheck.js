// @ts-check

/**
 * Deterministic sanity checks on AI-extracted records. No AI calls.
 *
 * Pattern: "AI suggests, worker confirms." Lower the confidence of a field
 * that fails a check, and surface a short reason the UI can show.
 */

export const BOUNDS = Object.freeze({
  maxOrders: 80,
  maxAmount: 1_000_000, // ₹10 lakh single entry — absurd upper bound
  confirmThreshold: 0.75, // below this: ask the worker to confirm
  autoConfirmThreshold: 0.9, // above this + checks pass: can auto-confirm
});

/**
 * Numbers mentioned in free text. We only look for integer-ish decimals that
 * could be rupee amounts or counts; locale commas are stripped.
 * @param {string} text
 * @returns {number[]}
 */
export function extractNumbers(text) {
  if (!text) return [];
  const cleaned = String(text).replace(/[,₹]/g, '');
  const matches = cleaned.match(/\d+(?:\.\d+)?/g) || [];
  return matches.map(Number).filter((n) => Number.isFinite(n));
}

/**
 * @param {{orders?:number, gross?:number, incentives?:number, deductions?:number, expenses?:number, net?:number, date?:string}} entry
 * @param {string} [rawInput]
 * @returns {{ok:boolean, issues:string[]}}
 */
export function checkEarningsEntry(entry, rawInput = '') {
  const issues = [];

  const orders = Number(entry.orders) || 0;
  const gross = Number(entry.gross) || 0;
  const incentives = Number(entry.incentives) || 0;
  const deductions = Number(entry.deductions) || 0;
  const expenses = Number(entry.expenses) || 0;
  const net = Number(entry.net) || 0;

  // Bounds
  if (orders < 0 || orders > BOUNDS.maxOrders) issues.push('orders_out_of_range');
  for (const [k, v] of Object.entries({ gross, incentives, deductions, expenses, net })) {
    if (v < 0 || v > BOUNDS.maxAmount) issues.push(`${k}_out_of_range`);
  }

  // Arithmetic: net ≈ gross + incentives − deductions − expenses (tolerate ₹1)
  const expectedNet = gross + incentives - deductions - expenses;
  if (gross > 0 && Math.abs(net - expectedNet) > 1) issues.push('net_mismatch');

  // Future dates
  if (entry.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    const d = Date.parse(entry.date);
    if (Number.isFinite(d) && d > Date.now() + 24 * 60 * 60 * 1000) issues.push('future_date');
  }

  // Number cross-check against raw text (gross should appear if the user said one)
  if (rawInput && gross > 0) {
    const nums = extractNumbers(rawInput);
    if (nums.length && !nums.some((n) => Math.abs(n - gross) < 1)) {
      issues.push('gross_not_in_text');
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Starting from a baseline confidence (default 0.9), subtract 0.15 per issue
 * and clamp to [0, 1]. Simple, inspectable.
 * @param {string[]} issues
 * @param {number} [baseline]
 */
export function confidenceFromIssues(issues, baseline = 0.9) {
  const score = baseline - 0.15 * issues.length;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}
