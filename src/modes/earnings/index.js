// @ts-check
import { buildEarningsPrompt } from './prompt.js';
import { earningsSchema } from './schema.js';
import { runEarnings } from './handler.js';

/** @type {import('../../types.js').Mode} */
export default {
  name: 'earnings',
  buildPrompt: buildEarningsPrompt,
  schema: earningsSchema,
  run: runEarnings,
};
