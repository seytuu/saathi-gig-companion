// @ts-check
import { buildScamPrompt } from './prompt.js';
import { scamSchema } from './schema.js';
import { runScam } from './handler.js';

/** @type {import('../../types.js').Mode} */
export default {
  name: 'scam',
  buildPrompt: buildScamPrompt,
  schema: scamSchema,
  run: runScam,
};
