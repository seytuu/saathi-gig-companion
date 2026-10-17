// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractNumbers,
  checkEarningsEntry,
  confidenceFromIssues,
  BOUNDS,
} from '../public/js/utils/crossCheck.js';

test('extractNumbers finds amounts and counts, strips commas/₹', () => {
  assert.deepEqual(extractNumbers('aaj 14 order kiye, ₹1,200 aaye, petrol 180'), [14, 1200, 180]);
});

test('checkEarningsEntry: arithmetic correct → no issues', () => {
  const r = checkEarningsEntry({
    date: '2026-10-16',
    orders: 14,
    gross: 920,
    incentives: 0,
    deductions: 0,
    expenses: 180,
    net: 740,
  });
  assert.ok(r.ok, JSON.stringify(r.issues));
});

test('checkEarningsEntry: net mismatch flagged', () => {
  const r = checkEarningsEntry({
    orders: 14,
    gross: 920,
    incentives: 0,
    deductions: 0,
    expenses: 180,
    net: 1000,
  });
  assert.ok(r.issues.includes('net_mismatch'));
});

test('checkEarningsEntry: bounds flag oversized values', () => {
  const r = checkEarningsEntry({ orders: 999, gross: 100, net: 100 });
  assert.ok(r.issues.includes('orders_out_of_range'));
});

test('checkEarningsEntry: future dates flagged', () => {
  const r = checkEarningsEntry({ date: '2099-01-01', orders: 1, gross: 100, net: 100 });
  assert.ok(r.issues.includes('future_date'));
});

test('checkEarningsEntry: raw-text cross-check — gross missing from input', () => {
  const r = checkEarningsEntry(
    { orders: 10, gross: 500, incentives: 0, deductions: 0, expenses: 0, net: 500 },
    'aaj 10 order kiye'
  );
  assert.ok(r.issues.includes('gross_not_in_text'));
});

test('confidenceFromIssues scales down and clamps', () => {
  assert.equal(confidenceFromIssues([]), 0.9);
  assert.equal(confidenceFromIssues(['a']), 0.75);
  assert.equal(confidenceFromIssues(['a', 'b', 'c', 'd', 'e', 'f', 'g']), 0);
});

test('thresholds are what we expect (review vs auto-confirm)', () => {
  assert.ok(BOUNDS.confirmThreshold < BOUNDS.autoConfirmThreshold);
});
