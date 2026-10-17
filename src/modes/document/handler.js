// @ts-check
import { AppError } from '../../errors.js';
import { buildDocumentPrompt } from './prompt.js';
import { documentSchema, isDocumentOutput } from './schema.js';

/**
 * @param {import('../../types.js').ModeContext} ctx
 * @param {import('../../ai/provider.js').AIProvider} provider
 */
export async function runDocument(ctx, provider) {
  if (ctx.media.length === 0 && !ctx.input) {
    throw AppError.badRequest('document mode needs a photo, PDF or question');
  }
  const system = buildDocumentPrompt(ctx);
  const out = await provider.generateJson({
    system,
    user: ctx.input || 'Explain the attached document for the worker.',
    media: ctx.media,
    schema: documentSchema,
  });
  if (!isDocumentOutput(out)) throw AppError.upstream('bad document shape');
  return out;
}
