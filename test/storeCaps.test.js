// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../public/js/store.js';

test('addLedger caps at 1000 entries (newest kept)', () => {
  store.reset();
  const entries = Array.from({ length: 1200 }, (_, i) => ({ date: '2026-10-17', platform: 'X', orders: i, gross: 0, net: 0 }));
  store.addLedger(entries);
  const kept = store.get().ledger;
  assert.equal(kept.length, 1000);
  // Should keep the newest.
  assert.equal(kept.at(-1).orders, 1199);
});

test('timeline capped at 200', () => {
  store.reset();
  for (let i = 0; i < 300; i++) store.log({ kind: 'test', i });
  assert.equal(store.get().timeline.length, 200);
  assert.equal(store.get().timeline[0].i, 299, 'newest first');
});

test('addDocument strips raw base64 payloads', () => {
  store.reset();
  store.addDocument({
    document_type: 'notice',
    plain_explanation: 'x',
    key_points: [],
    action_needed: [],
    warnings: [],
    data: 'AAAA'.repeat(1000),
    base64: 'xxx',
    mediaBase64: 'yyy',
  });
  const d = store.get().documents[0];
  assert.equal(d.data, undefined);
  assert.equal(d.base64, undefined);
  assert.equal(d.mediaBase64, undefined);
  assert.equal(d.document_type, 'notice');
});
