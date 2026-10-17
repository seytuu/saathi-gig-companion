// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cspDirectives, serializeCsp } from '../src/security.js';
import { config } from '../src/config.js';

/**
 * Vercel's static layer serves /public without going through Express — so
 * helmet's CSP never reaches index.html on Vercel. We mirror the CSP into
 * vercel.json manually. This test keeps the two sources in sync.
 */
test('vercel.json CSP header equals serialized cspDirectives', () => {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const root = vercel.headers.find((h) => h.source === '/(.*)');
  assert.ok(root, 'vercel.json has a /(.*) headers rule');
  const csp = root.headers.find((h) => h.key === 'Content-Security-Policy');
  assert.ok(csp, 'root rule has a CSP header');
  assert.equal(csp.value, serializeCsp(), 'CSP header matches src/security.js');
});

test('vercel.json Permissions-Policy equals config', () => {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const root = vercel.headers.find((h) => h.source === '/(.*)');
  const pp = root.headers.find((h) => h.key === 'Permissions-Policy');
  assert.ok(pp, 'root rule has a Permissions-Policy header');
  assert.equal(pp.value, config.permissionsPolicy);
});

test('Permissions-Policy allows camera, mic and geolocation', () => {
  const pp = config.permissionsPolicy;
  assert.match(pp, /microphone=\(self\)/);
  assert.match(pp, /camera=\(self\)/);
  assert.match(pp, /geolocation=\(self\)/);
});

test('CSP connect-src stays locked to self (third-party APIs must be proxied)', () => {
  assert.deepEqual(cspDirectives.connectSrc, ["'self'"]);
});
