// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelJson } from '../src/utils/parseModelJson.js';

test('parses raw JSON', () => {
  assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 });
});

test('strips ``` fences', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseModelJson('```\n{"a":1}\n```'), { a: 1 });
});

test('slices JSON from surrounding prose', () => {
  const raw = 'Here is your answer: {"x":"y","arr":[1,2]} let me know!';
  assert.deepEqual(parseModelJson(raw), { x: 'y', arr: [1, 2] });
});

test('returns null for invalid JSON', () => {
  assert.equal(parseModelJson('not json'), null);
  assert.equal(parseModelJson(''), null);
  assert.equal(parseModelJson('   '), null);
  // @ts-expect-error — testing bad input
  assert.equal(parseModelJson(null), null);
});

test('returns null when missing closing brace', () => {
  assert.equal(parseModelJson('{"a":1'), null);
});
