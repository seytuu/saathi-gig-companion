// @ts-check
import { buildGrievancePrompt } from './prompt.js';
import { grievanceSchema } from './schema.js';
import { runGrievance } from './handler.js';

/** @type {import('../../types.js').Mode} */
export default {
  name: 'grievance',
  buildPrompt: buildGrievancePrompt,
  schema: grievanceSchema,
  run: runGrievance,
};
