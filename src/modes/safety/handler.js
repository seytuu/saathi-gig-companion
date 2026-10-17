// @ts-check
import { AppError } from '../../errors.js';
import { buildSafetyPrompt } from './prompt.js';
import { safetySchema, isSafetyOutput } from './schema.js';

/**
 * @param {import('../../types.js').ModeContext} ctx
 * @param {import('../../ai/provider.js').AIProvider} provider
 */
export async function runSafety(ctx, provider) {
  const system = buildSafetyPrompt(ctx);
  const out = await provider.generateJson({
    system,
    user: ctx.input || 'Advise based on the given category.',
    media: ctx.media,
    schema: safetySchema,
  });
  if (!isSafetyOutput(out)) throw AppError.upstream('bad safety shape');
  return out;
}
