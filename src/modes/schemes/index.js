// @ts-check
import { buildSchemesPrompt } from './prompt.js';
import { schemesSchema } from './schema.js';
import { runSchemes } from './handler.js';

/** @type {import('../../types.js').Mode} */
export default {
  name: 'schemes',
  buildPrompt: buildSchemesPrompt,
  schema: schemesSchema,
  run: runSchemes,
};
