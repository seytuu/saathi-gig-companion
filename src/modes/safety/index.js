// @ts-check
import { buildSafetyPrompt } from './prompt.js';
import { safetySchema } from './schema.js';
import { runSafety } from './handler.js';

/** @type {import('../../types.js').Mode} */
export default {
  name: 'safety',
  buildPrompt: buildSafetyPrompt,
  schema: safetySchema,
  run: runSafety,
};
