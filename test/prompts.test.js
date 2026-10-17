// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMode, listModes } from '../src/modes/index.js';
import { INJECTION_GUARD } from '../src/prompts/guards.js';

const profile = {
  name: 'Ravi',
  workType: 'delivery',
  platform: 'Swiggy',
  city: 'Mohali',
  state: 'Punjab',
  language: 'Hinglish',
};

test('every registered mode embeds the shared injection guard', () => {
  const modes = listModes();
  assert.ok(modes.length >= 3, 'at least grievance+schemes+document');
  for (const name of modes) {
    const mode = getMode(name);
    assert.ok(mode, `${name} resolves`);
    const prompt = mode.buildPrompt({ input: 'test', profile, media: [], context: {} });
    assert.ok(prompt.includes(INJECTION_GUARD), `${name} includes injection guard`);
    assert.ok(prompt.includes(profile.language), `${name} includes language`);
  }
});

test('every mode supports simpleMode by producing a different prompt', () => {
  for (const name of listModes()) {
    const mode = getMode(name);
    assert.ok(mode);
    const a = mode.buildPrompt({ input: 'test', profile, media: [], context: {} });
    const b = mode.buildPrompt({ input: 'test', profile: { ...profile, simpleMode: true }, media: [], context: {} });
    assert.notEqual(a, b, `${name} prompt should change in simpleMode`);
  }
});
