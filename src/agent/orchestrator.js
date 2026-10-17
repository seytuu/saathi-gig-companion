// @ts-check
import { TOOL_DECLS, TOOL_NAMES, executeTool } from './tools.js';
import { INJECTION_GUARD } from '../prompts/guards.js';
import { logger } from '../utils/logger.js';

const MAX_TOOL_CALLS = 2;

// Emergency keywords (English + Hinglish + Hindi). Match before any AI call.
const EMERGENCY_RE =
  /\b(accident|bleeding|khoon|chot(?:\s+aa\s*gayi)?|injured|unconscious|attack|assault|dhamki|threat|rape|molest|chori|robbery|fire|bachao|help me now)\b|मदद|खून|चोट|दुर्घटना|हमला|धमकी/i;

/**
 * Agent orchestrator. Executes up to MAX_TOOL_CALLS tool invocations
 * via Gemini function calling, then produces a short reply + action list.
 *
 * @param {{
 *   transcript: string,
 *   history: {role:string, text:string, toolUsed?:string, resultSummary?:string}[],
 *   profile: any,
 *   media: any[],
 *   provider: import('../ai/provider.js').AIProvider & {generateWithTools?: Function},
 *   geo?: {lat:number, lng:number}|null,
 * }} args
 */
export async function orchestrate({ transcript, history = [], profile, media = [], provider }) {
  // 1) Deterministic emergency short-circuit (no AI). Workers in crisis get
  //    helplines + SOS instantly before any network call.
  if (EMERGENCY_RE.test(transcript || '')) {
    logger.info('agent_emergency_shortcircuit', {});
    return {
      transcript,
      reply: 'This looks urgent. Call 112 now. The helplines are shown below. I\'ve opened Safety for you.',
      toolUsed: null,
      result: null,
      intent: 'safety',
      actions: [
        { kind: 'show_helplines' },
        { kind: 'tel', number: '112' },
        { kind: 'open_tab', mode: 'safety', prefill: transcript },
      ],
      emergency: true,
    };
  }

  const system = buildSystemPrompt(profile);
  const contents = buildContents(history, transcript, media);

  // 2) Tool-use loop. We trust the provider but cap at MAX_TOOL_CALLS so
  //    the model cannot thrash.
  const tools = [{ functionDeclarations: TOOL_DECLS }];
  /** @type {{name:string, result:any, missing?:string, mode:string}|null} */
  let toolExecuted = null;
  let toolCalls = 0;
  let modelText = '';

  while (toolCalls < MAX_TOOL_CALLS) {
    const resp = /** @type {any} */ (await provider.generateWithTools({ system, contents, tools }));
    const parts = resp.parts || [];
    const fc = parts.find((p) => p.functionCall);
    const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('').trim();
    if (text) modelText = text;

    if (!fc) break;
    const fnName = fc.functionCall?.name;
    const fnArgs = fc.functionCall?.args || {};
    if (!TOOL_NAMES.includes(fnName)) {
      logger.warn('agent_unknown_tool', { fnName });
      break;
    }

    toolCalls += 1;
    try {
      const execResult = await executeTool({ name: fnName, args: fnArgs, profile, media, provider });
      toolExecuted = { name: fnName, result: execResult.result, missing: execResult.missing, mode: execResult.mode };
      // Preserve the FULL model turn (including thoughtSignature) — Gemini 3.x
      // requires this when echoing functionCall parts back.
      contents.push({ role: 'model', parts });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: fnName, response: summariseForModel(execResult) } }],
      });
    } catch (err) {
      logger.warn('agent_tool_failed', { fnName, msg: /** @type {Error} */ (err).message });
      contents.push({ role: 'model', parts });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: fnName, response: { error: 'tool_failed' } } }],
      });
    }
  }

  // 3) If we still don't have a reply from the model, ask it for one with a tight prompt.
  if (!modelText) {
    const finishResp = /** @type {any} */ (
      await provider.generateWithTools({ system: system + '\nFinish with a 1–2 sentence reply to the worker. No tools.', contents, tools: [] })
    );
    modelText = (finishResp.parts || [])
      .filter((p) => typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
      .trim();
  }

  const actions = toolExecuted ? buildActions(toolExecuted) : [];

  return {
    transcript,
    reply: modelText || 'Okay.',
    toolUsed: toolExecuted?.name || null,
    result: toolExecuted?.result || null,
    intent: toolExecuted?.mode || 'unknown',
    actions,
    emergency: false,
  };
}

function buildSystemPrompt(profile) {
  return [
    'You are Saathi, a GenAI agent that helps Indian gig and informal workers.',
    'Use the provided tools when they match the worker\'s need. One tool call per turn is usually enough. Never call the same tool twice.',
    INJECTION_GUARD,
    '',
    `Worker profile: ${profile.name}, ${profile.workType} on ${profile.platform}, ${profile.city}/${profile.state}, prefers ${profile.language}.`,
    '',
    `When you reply, write 1–2 SHORT sentences in ${profile.language}. No bullet lists. If you called a tool, briefly tell the worker what you did and what to tap next ("Open earnings to confirm", "Open grievance to send", etc.).`,
  ].join('\n');
}

/** @param {any[]} history @param {string} transcript @param {any[]} media */
function buildContents(history, transcript, media) {
  /** @type {any[]} */
  const contents = [];
  for (const h of history.slice(-6)) {
    const role = h.role === 'assistant' ? 'model' : 'user';
    const parts = [{ text: (h.text || '') + (h.toolUsed ? ` [used ${h.toolUsed}]` : '') + (h.resultSummary ? ` [${h.resultSummary}]` : '') }];
    contents.push({ role, parts });
  }
  const parts = [{ text: transcript || '' }];
  for (const m of media || []) parts.push({ inlineData: { mimeType: m.mimeType, data: m.data } });
  contents.push({ role: 'user', parts });
  return contents;
}

/**
 * Keep tool responses that go back to the model small — one-sentence
 * summaries work better than full JSON for routing follow-ups.
 */
function summariseForModel(exec) {
  const r = exec.result;
  if (!r) return { ok: false, missing: exec.missing || 'unknown' };
  if (exec.mode === 'earnings') {
    const n = Array.isArray(r.entries) ? r.entries.length : 0;
    return { ok: true, summary: `Logged ${n} earnings entry${n === 1 ? '' : 's'}.` };
  }
  if (exec.mode === 'safety') return { ok: true, summary: 'Prepared safety advice.' };
  if (exec.mode === 'schemes') {
    const n = Array.isArray(r.schemes) ? r.schemes.length : 0;
    return { ok: true, summary: `Found ${n} welfare scheme${n === 1 ? '' : 's'}.` };
  }
  if (exec.mode === 'document') return { ok: true, summary: 'Explained the document.' };
  if (exec.mode === 'grievance') return { ok: true, summary: 'Drafted a complaint letter.' };
  if (exec.mode === 'scam') return { ok: true, summary: `Verdict: ${r.verdict || 'unknown'}.` };
  return { ok: true };
}

/** @param {{name:string, mode:string, result:any, missing?:string}} exec */
function buildActions(exec) {
  const actions = [];
  if (exec.missing === 'photo_or_pdf') {
    actions.push({ kind: 'open_tab', mode: 'document', prefill: '' });
    return actions;
  }
  switch (exec.mode) {
    case 'earnings':
      actions.push({ kind: 'review_ledger', entries: exec.result?.entries || [] });
      actions.push({ kind: 'open_tab', mode: 'earnings' });
      break;
    case 'safety':
      actions.push({ kind: 'open_tab', mode: 'safety' });
      actions.push({ kind: 'show_helplines' });
      break;
    case 'schemes':
      actions.push({ kind: 'open_tab', mode: 'schemes' });
      break;
    case 'grievance':
      actions.push({ kind: 'copy_letter' });
      actions.push({ kind: 'share' });
      actions.push({ kind: 'open_tab', mode: 'grievance' });
      break;
    case 'scam':
      actions.push({ kind: 'show_helplines' });
      actions.push({ kind: 'open_tab', mode: 'scam' });
      break;
    case 'document':
      actions.push({ kind: 'open_tab', mode: 'document' });
      break;
    default:
      break;
  }
  return actions;
}
