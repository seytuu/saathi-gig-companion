// @ts-check
import { AppError } from '../../errors.js';
import { buildGrievancePrompt } from './prompt.js';
import { grievanceSchema, isGrievanceOutput } from './schema.js';

/**
 * @param {import('../../types.js').ModeContext} ctx
 * @param {import('../../ai/provider.js').AIProvider} provider
 */
export async function runGrievance(ctx, provider) {
  const system = buildGrievancePrompt(ctx);
  const userText =
    ctx.input ||
    'The worker did not type a message; use only the attached context/evidence to draft the letter.';
  const out = await provider.generateJson({
    system,
    user: userText,
    media: ctx.media,
    schema: grievanceSchema,
  });
  if (!isGrievanceOutput(out)) throw AppError.upstream('bad grievance shape');
  return out;
}
