// @ts-check
import { AppError } from '../../errors.js';
import { buildEarningsPrompt } from './prompt.js';
import { earningsSchema, isEarningsOutput } from './schema.js';
import { normalizeDate } from '../../utils/dates.js';

/**
 * @param {import('../../types.js').ModeContext} ctx
 * @param {import('../../ai/provider.js').AIProvider} provider
 */
export async function runEarnings(ctx, provider) {
  if (ctx.media.length === 0 && !ctx.input) {
    throw AppError.badRequest('earnings needs text, a screenshot, SMS or a PDF');
  }
  const system = buildEarningsPrompt(ctx);
  const out = await provider.generateJson({
    system,
    user:
      ctx.input ||
      'Extract earnings entries from the attached media. Return INR amounts as numbers.',
    media: ctx.media,
    schema: earningsSchema,
  });
  if (!isEarningsOutput(out)) throw AppError.upstream('bad earnings shape');
  // Normalize relative/free-form dates to ISO YYYY-MM-DD (Asia/Kolkata).
  const now = new Date();
  const typed = /** @type {{entries:any[], tip:string}} */ (out);
  typed.entries = typed.entries.map((e) => ({ ...e, date: normalizeDate(String(e.date || ''), now) }));
  return typed;
}
