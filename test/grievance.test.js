// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import grievance from '../src/modes/grievance/index.js';
import { INJECTION_GUARD } from '../src/modes/grievance/prompt.js';

const profile = {
  name: 'Ravi',
  workType: 'delivery',
  platform: 'Swiggy',
  city: 'Mohali',
  state: 'Punjab',
  language: 'Hinglish',
};

test('grievance prompt includes language, profile and injection guard', () => {
  const prompt = grievance.buildPrompt({ input: 'blocked ID', profile, media: [], context: {} });
  assert.ok(prompt.includes(profile.language), 'includes language');
  assert.ok(prompt.includes(profile.platform), 'includes platform');
  assert.ok(prompt.includes(profile.name), 'includes name');
  assert.ok(prompt.includes(INJECTION_GUARD), 'includes injection guard');
  // Must warn against sensitive IDs.
  assert.ok(/Aadhaar/i.test(prompt), 'warns about Aadhaar');
});

test('grievance handler validates provider output shape', async () => {
  const good = {
    subject: 'ID blocked without reason',
    english_letter: 'Dear sir, …',
    local_language_letter: 'Namaste sir, …',
    where_to_submit: ['Swiggy support'],
    evidence_list: ['Screenshot of block'],
  };
  const okProvider = { generateJson: async () => good };
  const r = await grievance.run(
    { input: 'help', profile, media: [], context: {} },
    okProvider
  );
  assert.deepEqual(r, good);

  const badProvider = { generateJson: async () => ({ subject: 'x' }) };
  await assert.rejects(() =>
    grievance.run({ input: 'help', profile, media: [], context: {} }, badProvider)
  );
});

test('grievance mode exports expected shape', () => {
  assert.equal(grievance.name, 'grievance');
  assert.equal(typeof grievance.buildPrompt, 'function');
  assert.equal(typeof grievance.run, 'function');
  assert.equal(grievance.schema.type, 'object');
  assert.ok(grievance.schema.required.includes('subject'));
});
