// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDate } from '../src/utils/dates.js';

// Fixed "now" that is Oct 17 2026 noon UTC → Oct 17 2026 17:30 Kolkata.
const now = new Date('2026-10-17T12:00:00Z');

test('ISO date passes through unchanged', () => {
  assert.equal(normalizeDate('2026-10-17', now), '2026-10-17');
});

test('today / aaj → ISO today in Kolkata', () => {
  assert.equal(normalizeDate('today', now), '2026-10-17');
  assert.equal(normalizeDate('aaj', now), '2026-10-17');
  assert.equal(normalizeDate('AAJ ka kaam', now), '2026-10-17');
});

test('yesterday / kal → ISO yesterday', () => {
  assert.equal(normalizeDate('yesterday', now), '2026-10-16');
  assert.equal(normalizeDate('kal', now), '2026-10-16');
  assert.equal(normalizeDate('kal ka incentive', now), '2026-10-16');
});

test('parso → two days ago', () => {
  assert.equal(normalizeDate('parso', now), '2026-10-15');
});

test('DD-MM-YYYY and DD/MM/YY parse correctly', () => {
  assert.equal(normalizeDate('16-10-2026', now), '2026-10-16');
  assert.equal(normalizeDate('16/10/26', now), '2026-10-16');
});

test('garbage falls back to today', () => {
  assert.equal(normalizeDate('qwerty', now), '2026-10-17');
  assert.equal(normalizeDate('', now), '2026-10-17');
});
