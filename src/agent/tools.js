// @ts-check
import { getMode } from '../modes/index.js';

/**
 * Tool declarations for Gemini function calling. Each tool is a thin
 * wrapper that calls an EXISTING mode handler via the registry — zero
 * duplicated logic.
 */
export const TOOL_DECLS = [
  {
    name: 'log_earnings',
    description:
      "Extract today's earnings from the worker's words into a ledger. Use when they talk about orders, money earned, incentives, deductions or petrol.",
    parameters: {
      type: 'object',
      properties: { text: { type: 'string', description: "Worker's words about earnings." } },
      required: ['text'],
    },
  },
  {
    name: 'safety_help',
    description:
      'Advise on a safety situation (accident, injury, harassment, late-night drop, breakdown, hostile customer, police stop).',
    parameters: {
      type: 'object',
      properties: {
        situation: { type: 'string', description: 'One of: accident, unsafe_drop, harassment, weather, breakdown, customer, police_stop, general.' },
        text: { type: 'string', description: 'What happened, in the worker\'s own words.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'find_schemes',
    description: "Match the worker's profile to Indian welfare schemes (e-Shram, PM-JAY, PMSBY, PMJJBY, PM-SYM, state platform-worker Acts, NREGA).",
    parameters: {
      type: 'object',
      properties: { need: { type: 'string', description: "Short description of what help the worker needs (optional)." } },
    },
  },
  {
    name: 'explain_document',
    description: 'Explain a document, notice or form in plain language. Only usable if the worker attached a photo/PDF.',
    parameters: {
      type: 'object',
      properties: { question: { type: 'string', description: "Worker's question about the paper." } },
    },
  },
  {
    name: 'draft_grievance',
    description: 'Draft a short, professional complaint letter in English + the profile language.',
    parameters: {
      type: 'object',
      properties: {
        issue: { type: 'string', description: 'The complaint, in the worker\'s own words.' },
        evidence: { type: 'string', description: 'Optional short evidence summary (dates, IDs, screenshots).' },
      },
      required: ['issue'],
    },
  },
  {
    name: 'check_scam',
    description: 'Classify a message/link as scam, suspicious or safe. Hard-coded helpline 1930 shown by the UI.',
    parameters: {
      type: 'object',
      properties: { message: { type: 'string', description: 'The message or link the worker received.' } },
      required: ['message'],
    },
  },
];

export const TOOL_NAMES = TOOL_DECLS.map((t) => t.name);

/**
 * Execute a tool call by name. Delegates to the existing mode handler via
 * the registry — no logic duplicated.
 *
 * @param {{name: string, args: any, profile: any, media: any[], provider: import('../ai/provider.js').AIProvider}} args
 */
export async function executeTool({ name, args, profile, media, provider }) {
  const ctx = (input, context = {}) => ({ input, profile, media: media || [], context });

  switch (name) {
    case 'log_earnings': {
      const mode = getMode('earnings');
      if (!mode) throw new Error('earnings mode unavailable');
      return { mode: 'earnings', result: await mode.run(ctx(args?.text || ''), provider) };
    }
    case 'safety_help': {
      const mode = getMode('safety');
      if (!mode) throw new Error('safety mode unavailable');
      return {
        mode: 'safety',
        result: await mode.run(ctx(args?.text || '', { category: args?.situation || 'general' }), provider),
      };
    }
    case 'find_schemes': {
      const mode = getMode('schemes');
      if (!mode) throw new Error('schemes mode unavailable');
      return { mode: 'schemes', result: await mode.run(ctx(args?.need || ''), provider) };
    }
    case 'explain_document': {
      const mode = getMode('document');
      if (!mode) throw new Error('document mode unavailable');
      if ((media || []).length === 0) {
        return { mode: 'document', result: null, missing: 'photo_or_pdf' };
      }
      return { mode: 'document', result: await mode.run(ctx(args?.question || ''), provider) };
    }
    case 'draft_grievance': {
      const mode = getMode('grievance');
      if (!mode) throw new Error('grievance mode unavailable');
      const context = args?.evidence ? { evidence: args.evidence } : {};
      return { mode: 'grievance', result: await mode.run(ctx(args?.issue || '', context), provider) };
    }
    case 'check_scam': {
      const mode = getMode('scam');
      if (!mode) throw new Error('scam mode unavailable');
      return { mode: 'scam', result: await mode.run(ctx(args?.message || ''), provider) };
    }
    default:
      throw new Error('unknown tool: ' + name);
  }
}
