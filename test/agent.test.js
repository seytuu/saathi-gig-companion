// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orchestrate } from '../src/agent/orchestrator.js';
import { TOOL_NAMES } from '../src/agent/tools.js';

const profile = {
  name: 'Ravi',
  workType: 'delivery',
  platform: 'Swiggy',
  city: 'Mohali',
  state: 'Punjab',
  language: 'Hinglish',
};

/**
 * Build a mock provider that scripts a sequence of function-call / text
 * responses. generateWithTools pops the next scripted response.
 * @param {{parts:any[]}[]} script
 */
function mockProvider(script) {
  const copy = [...script];
  const toolRunsSeen = [];
  return {
    toolRunsSeen,
    generateJson: async () => ({}),
    generateWithTools: async ({ contents }) => {
      // Record every functionResponse turn so tests can inspect history flow.
      const last = contents[contents.length - 1];
      const fr = last?.parts?.[0]?.functionResponse;
      if (fr) toolRunsSeen.push(fr.name);
      if (!copy.length) return { parts: [{ text: 'ok' }] };
      return copy.shift();
    },
    // Mode handlers also receive this provider when agent executes tools.
    // Modes themselves call generateJson, which we stub to return a plausible
    // object for each mode.
  };
}

/** Mode handlers call provider.generateJson — swap it to return canned data per schema. */
function withJsonReturns(provider, perSchemaReturn) {
  provider.generateJson = async ({ schema }) => {
    const sig = (schema?.required || []).join(',');
    return perSchemaReturn[sig] || {};
  };
  return provider;
}

const EARNINGS_SIG = 'entries,tip';
const SAFETY_SIG = 'title,do_now,do_not,evidence_to_keep,report_to';
const GRIEVANCE_SIG = 'subject,english_letter,local_language_letter,where_to_submit,evidence_list';

test('TOOL_NAMES covers every mode in registry we need to route to', () => {
  for (const name of ['log_earnings', 'safety_help', 'find_schemes', 'draft_grievance', 'check_scam', 'explain_document']) {
    assert.ok(TOOL_NAMES.includes(name), `missing tool: ${name}`);
  }
});

test('emergency keyword short-circuits before any AI call', async () => {
  const provider = mockProvider([]);
  const out = await orchestrate({
    transcript: 'bike accident ho gaya, khoon aa raha hai',
    history: [],
    profile,
    media: [],
    provider,
  });
  assert.equal(out.emergency, true);
  assert.equal(out.intent, 'safety');
  assert.ok(out.actions.some((a) => a.kind === 'tel' && a.number === '112'));
  assert.ok(out.actions.some((a) => a.kind === 'show_helplines'));
});

test('tool→handler mapping: log_earnings routes to earnings mode', async () => {
  const provider = withJsonReturns(
    mockProvider([
      { parts: [{ functionCall: { name: 'log_earnings', args: { text: 'aaj 14 order 920' } } }] },
      { parts: [{ text: 'Done, open earnings to confirm.' }] },
    ]),
    { [EARNINGS_SIG]: { entries: [{ date: 'today', platform: 'Swiggy', orders: 14, gross: 920, incentives: 0, deductions: 0, expenses: 0, net: 920, notes: '' }], tip: 'Track fuel too.' } }
  );
  const out = await orchestrate({
    transcript: 'aaj 14 order 920 kamaye',
    history: [],
    profile,
    media: [],
    provider,
  });
  assert.equal(out.toolUsed, 'log_earnings');
  assert.equal(out.intent, 'earnings');
  assert.ok(out.actions.some((a) => a.kind === 'review_ledger'));
  assert.ok(out.actions.some((a) => a.kind === 'open_tab' && a.mode === 'earnings'));
  assert.match(out.reply, /earnings|open/i);
});

test('max 2 tool calls: even if model keeps asking, orchestrator stops after 2', async () => {
  const provider = withJsonReturns(
    mockProvider([
      { parts: [{ functionCall: { name: 'log_earnings', args: { text: 'x' } } }] },
      { parts: [{ functionCall: { name: 'log_earnings', args: { text: 'y' } } }] },
      { parts: [{ functionCall: { name: 'log_earnings', args: { text: 'z' } } }] }, // ignored
      { parts: [{ text: 'done' }] },
    ]),
    { [EARNINGS_SIG]: { entries: [], tip: '' } }
  );
  const out = await orchestrate({
    transcript: 'anything',
    history: [],
    profile,
    media: [],
    provider,
  });
  // Only 2 tool-response turns should have been fed back.
  assert.equal(provider.toolRunsSeen.length, 2);
  assert.equal(out.toolUsed, 'log_earnings');
});

test('follow-up history is passed through to the provider', async () => {
  let seenHistory = null;
  const provider = withJsonReturns(
    {
      generateJson: async () => ({ subject: 's', english_letter: 'e', local_language_letter: 'l', where_to_submit: [], evidence_list: [] }),
      generateWithTools: async ({ contents }) => {
        if (seenHistory === null) seenHistory = contents.map((c) => ({ role: c.role, text: c.parts?.[0]?.text })).slice(0, 2);
        return { parts: [{ functionCall: { name: 'draft_grievance', args: { issue: 'id blocked' } } }] };
      },
    },
    { [GRIEVANCE_SIG]: { subject: 's', english_letter: 'e', local_language_letter: 'l', where_to_submit: [], evidence_list: [] } }
  );
  // Second script turn: final text, no tool call.
  const originalGen = provider.generateWithTools;
  let turns = 0;
  provider.generateWithTools = async (args) => {
    turns++;
    if (turns === 1) return originalGen(args);
    return { parts: [{ text: 'Draft ready.' }] };
  };

  await orchestrate({
    transcript: 'isko shikayat banao',
    history: [
      { role: 'user', text: 'mera id block ho gaya 3 din se' },
      { role: 'assistant', text: 'That sounds frustrating.', toolUsed: null },
    ],
    profile,
    media: [],
    provider,
  });

  assert.ok(seenHistory, 'provider saw history');
  // First item in contents is the first history message, not the current transcript.
  assert.equal(seenHistory[0].role, 'user');
  assert.match(seenHistory[0].text, /id block/);
});

test('safety tool fills category + action list', async () => {
  const provider = withJsonReturns(
    mockProvider([
      { parts: [{ functionCall: { name: 'safety_help', args: { situation: 'accident', text: 'girr gaya' } } }] },
      { parts: [{ text: 'Call 108.' }] },
    ]),
    {
      [SAFETY_SIG]: {
        title: 'After an accident',
        do_now: ['Call 108'],
        do_not: ['Hide bruise'],
        evidence_to_keep: ['Photos'],
        report_to: ['Platform support'],
      },
    }
  );
  const out = await orchestrate({
    transcript: 'bike se gir gaya',
    history: [],
    profile,
    media: [],
    provider,
  });
  // Note: not caught by regex (girr), so no short-circuit — tests tool path.
  assert.equal(out.toolUsed, 'safety_help');
  assert.equal(out.intent, 'safety');
  assert.ok(out.actions.some((a) => a.kind === 'show_helplines'));
});
