// @ts-check
import { config } from '../../config.js';
import { AppError } from '../../errors.js';
import { LruCache } from '../../utils/cache.js';
import { buildSchemesPrompt } from './prompt.js';
import { schemesSchema, isSchemesOutput } from './schema.js';

// Per-instance cache for zero-input scheme matches. Keyed on profile.
const cache = new LruCache({ max: config.cache.maxEntries, ttlMs: config.cache.ttlMs });

/**
 * @param {import('../../types.js').ModeContext} ctx
 * @param {import('../../ai/provider.js').AIProvider} provider
 */
export async function runSchemes(ctx, provider) {
  const key = cacheKey(ctx);
  if (key) {
    const hit = cache.get(key);
    if (hit) return hit;
  }

  const system = buildSchemesPrompt(ctx);
  const out = await provider.generateJson({
    system,
    user: ctx.input || 'Recommend the most useful schemes for this worker.',
    media: ctx.media,
    schema: schemesSchema,
  });
  if (!isSchemesOutput(out)) throw AppError.upstream('bad schemes shape');
  if (key) cache.set(key, out);
  return out;
}

/** Only cache zero-input (profile-only) requests. @param {import('../../types.js').ModeContext} ctx */
function cacheKey(ctx) {
  if (ctx.input || ctx.media.length) return null;
  const p = ctx.profile;
  return `${p.workType}|${p.state}|${p.language}`;
}
