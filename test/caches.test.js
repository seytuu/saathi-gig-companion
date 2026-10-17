// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LruCache } from '../src/utils/cache.js';

test('LruCache evicts the oldest entry when full', () => {
  const c = new LruCache({ max: 2, ttlMs: 60_000 });
  c.set('a', 1);
  c.set('b', 2);
  c.set('c', 3);
  assert.equal(c.get('a'), undefined);
  assert.equal(c.get('b'), 2);
  assert.equal(c.get('c'), 3);
});

test('LruCache honours TTL', async () => {
  const c = new LruCache({ max: 10, ttlMs: 10 });
  c.set('a', 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(c.get('a'), undefined);
});

test('LruCache get() refreshes recency', () => {
  const c = new LruCache({ max: 2, ttlMs: 60_000 });
  c.set('a', 1);
  c.set('b', 2);
  // Touch a so b becomes least-recent.
  c.get('a');
  c.set('c', 3);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('c'), 3);
});
