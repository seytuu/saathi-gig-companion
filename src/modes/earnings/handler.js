// @ts-check
import { AppError } from '../../errors.js';
import { buildEarningsPrompt } from './prompt.js';
import { earningsSchema, isEarningsOutput } from './schema.js';

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
  return out;
}
