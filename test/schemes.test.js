// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import schemes from '../src/modes/schemes/index.js';
import { INJECTION_GUARD } from '../src/prompts/guards.js';

const profile = {
  name: 'Ravi',
  workType: 'delivery',
  platform: 'Swiggy',
  city: 'Mohali',
  state: 'Punjab',
  language: 'Hinglish',
};

test('schemes prompt includes language, profile, injection guard and real schemes', () => {
  const prompt = schemes.buildPrompt({ input: '', profile, media: [], context: {} });
  assert.ok(prompt.includes(profile.language));
  assert.ok(prompt.includes(profile.platform));
  assert.ok(prompt.includes(INJECTION_GUARD));
  assert.ok(/e-Shram/i.test(prompt));
  assert.ok(/PM-?JAY/i.test(prompt));
  assert.ok(/PMSBY/i.test(prompt));
});

test('schemes prompt switches wording in Simple Mode', () => {
  const normal = schemes.buildPrompt({ input: '', profile, media: [], context: {} });
  const simple = schemes.buildPrompt({
    input: '',
    profile: { ...profile, simpleMode: true },
    media: [],
    context: {},
  });
  assert.ok(/SIMPLE MODE IS ON/.test(simple));
  assert.ok(!/SIMPLE MODE IS ON/.test(normal));
});

test('schemes handler rejects bad shape', async () => {
  const badProvider = { generateJson: async () => ({ schemes: 'wat' }) };
  await assert.rejects(() =>
    schemes.run({ input: '', profile, media: [], context: {} }, badProvider)
  );
});

test('schemes handler caches zero-input calls per profile', async () => {
  let calls = 0;
  const provider = {
    generateJson: async () => {
      calls++;
      return {
        schemes: [
          {
            name: 'e-Shram',
            who_can_apply: 'Unorganised workers',
            benefits: 'Worker ID + welfare benefits',
            how_to_apply_steps: ['Go to eshram.gov.in'],
            documents_needed: ['Aadhaar linked phone', 'Bank account'],
            official_link: 'https://eshram.gov.in',
          },
        ],
      };
    },
  };
  const ctx = { input: '', profile, media: [], context: {} };
  const a = await schemes.run(ctx, provider);
  const b = await schemes.run(ctx, provider);
  assert.equal(calls, 1, 'second call hits cache');
  assert.deepEqual(a, b);
});
