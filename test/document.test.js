// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import documentMode from '../src/modes/document/index.js';
import { INJECTION_GUARD } from '../src/prompts/guards.js';

const profile = {
  name: 'Ravi',
  workType: 'delivery',
  platform: 'Swiggy',
  city: 'Mohali',
  state: 'Punjab',
  language: 'Hinglish',
};

test('document prompt embeds the injection guard and language', () => {
  const prompt = documentMode.buildPrompt({ input: 'what is this?', profile, media: [], context: {} });
  assert.ok(prompt.includes(INJECTION_GUARD));
  assert.ok(prompt.includes(profile.language));
});

test('document handler validates output shape', async () => {
  const good = {
    document_type: 'Platform notice',
    plain_explanation: 'Your ID is blocked.',
    key_points: ['ID blocked', 'No reason'],
    action_needed: ['Appeal'],
    warnings: [],
  };
  const ok = { generateJson: async () => good };
  const r = await documentMode.run(
    { input: 'what is this', profile, media: [{ mimeType: 'image/jpeg', data: 'AA==' }], context: {} },
    ok
  );
  assert.deepEqual(r, good);

  const bad = { generateJson: async () => ({ document_type: 1 }) };
  await assert.rejects(() =>
    documentMode.run(
      { input: 'x', profile, media: [{ mimeType: 'image/jpeg', data: 'AA==' }], context: {} },
      bad
    )
  );
});

test('document handler rejects empty input + empty media', async () => {
  const ok = { generateJson: async () => ({}) };
  await assert.rejects(() => documentMode.run({ input: '', profile, media: [], context: {} }, ok));
});
