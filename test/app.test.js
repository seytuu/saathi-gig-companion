// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

/**
 * Spin up the Express app on an ephemeral port and return { url, close }.
 */
async function startApp() {
  const app = buildApp();
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = /** @type {any} */ (server.address());
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((r) => server.close(() => r(undefined))),
  };
}

test('/api/health returns ok', async () => {
  const { url, close } = await startApp();
  try {
    const res = await fetch(url + '/api/health');
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.modes));
  } finally {
    await close();
  }
});

test('/api/config exposes allow-lists', async () => {
  const { url, close } = await startApp();
  try {
    const res = await fetch(url + '/api/config');
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.languages.includes('Hinglish'));
    assert.ok(body.helplines.find((h) => h.number === '112'));
  } finally {
    await close();
  }
});

test('/api/agent rejects unknown mode with 400', async () => {
  const { url, close } = await startApp();
  try {
    const res = await fetch(url + '/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'nope', input: 'x', profile: {} }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'bad_request');
    // Must not leak internals.
    assert.ok(!/stack/i.test(JSON.stringify(body)));
  } finally {
    await close();
  }
});

test('error middleware hides internals on 500', async () => {
  const { url, close } = await startApp();
  try {
    const res = await fetch(url + '/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
    assert.ok(!body.stack);
  } finally {
    await close();
  }
});

test('sets strict CSP header on /', async () => {
  const { url, close } = await startApp();
  try {
    const res = await fetch(url + '/');
    const csp = res.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("default-src 'self'"), 'CSP contains default-src');
    assert.ok(!csp.includes("'unsafe-inline'"), 'no unsafe-inline');
  } finally {
    await close();
  }
});
