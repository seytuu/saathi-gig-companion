// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../public/js/store.js';

// store.js uses localStorage at module scope. Stub it before import.
// Node 20+ has no localStorage, so provide a tiny one here before import.
// (We import migrate above; its module ran safeLoad() which guards errors.)

test('migrate(null) returns fresh state', () => {
  const s = migrate(null);
  assert.equal(s.version, 1);
  assert.equal(s.profile, null);
  assert.deepEqual(s.ledger, []);
  assert.deepEqual(s.schemes, []);
});

test('migrate(garbage) returns fresh state', () => {
  const s = migrate('not an object');
  assert.deepEqual(s.ledger, []);
});

test('migrate(v0 payload with missing fields) fills defaults', () => {
  const s = migrate({ profile: { name: 'Ravi' } });
  assert.equal(s.profile?.name, 'Ravi');
  assert.ok(Array.isArray(s.ledger));
  assert.ok(Array.isArray(s.grievances));
  assert.equal(s.version, 1);
});

test('migrate rejects wrong-type fields and replaces with defaults', () => {
  // Someone's old v0 data has ledger as a string — must not break .filter() later
  const s = migrate({ version: 0, ledger: 'oops', grievances: null });
  assert.deepEqual(s.ledger, []);
  assert.deepEqual(s.grievances, []);
});

test('migrate preserves arrays and bumps version', () => {
  const s = migrate({ version: 0, ledger: [{ a: 1 }], schemes: [{ b: 2 }] });
  assert.deepEqual(s.ledger, [{ a: 1 }]);
  assert.deepEqual(s.schemes, [{ b: 2 }]);
  assert.equal(s.version, 1);
});
