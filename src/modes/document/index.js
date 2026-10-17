// @ts-check
import { buildDocumentPrompt } from './prompt.js';
import { documentSchema } from './schema.js';
import { runDocument } from './handler.js';

/** @type {import('../../types.js').Mode} */
export default {
  name: 'document',
  buildPrompt: buildDocumentPrompt,
  schema: documentSchema,
  run: runDocument,
};
