// @ts-check
import { AppError } from '../../errors.js';
import { buildScamPrompt } from './prompt.js';
import { scamSchema, isScamOutput } from './schema.js';

/**
 * @param {import('../../types.js').ModeContext} ctx
 * @param {import('../../ai/provider.js').AIProvider} provider
 */
export async function runScam(ctx, provider) {
  if (!ctx.input && ctx.media.length === 0) {
    throw AppError.badRequest('scam check needs a message, screenshot or voice');
  }
  const system = buildScamPrompt(ctx);
  const out = await provider.generateJson({
    system,
    user: ctx.input || 'Check the attached message/screenshot for scams.',
    media: ctx.media,
    schema: scamSchema,
  });
  if (!isScamOutput(out)) throw AppError.upstream('bad scam shape');
  return out;
}
