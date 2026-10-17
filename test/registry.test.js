// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMode, listModes } from '../src/modes/index.js';

test('registry exposes grievance for M1', () => {
  assert.ok(listModes().includes('grievance'));
  const m = getMode('grievance');
  assert.equal(m?.name, 'grievance');
  assert.equal(typeof m?.run, 'function');
  assert.equal(typeof m?.buildPrompt, 'function');
  assert.ok(m?.schema);
});

test('registry returns undefined for unknown mode', () => {
  assert.equal(getMode('unknown'), undefined);
});
