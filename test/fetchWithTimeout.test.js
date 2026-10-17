// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchWithTimeout } from '../src/utils/fetchWithTimeout.js';

/** Spin up a one-shot server that stalls `n` ms before responding. */
function stallServer(ms) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
      }, ms);
    });
    srv.listen(0, '127.0.0.1', () => {
      const port = /** @type {any} */ (srv.address()).port;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => srv.close(() => r(undefined))) });
    });
  });
}

test('fetchWithTimeout returns normally when the server replies in time', async () => {
  const { url, close } = /** @type {any} */ (await stallServer(10));
  try {
    const r = await fetchWithTimeout(url, { timeoutMs: 500 });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.deepEqual(body, { ok: true });
  } finally {
    await close();
  }
});

test('fetchWithTimeout aborts after timeoutMs', async () => {
  const { url, close } = /** @type {any} */ (await stallServer(500));
  try {
    await assert.rejects(() => fetchWithTimeout(url, { timeoutMs: 60 }), (err) => {
      // AbortError name OR DOMException code 20 OR plain Error("timeout").
      return err.name === 'AbortError' || /abort|timeout/i.test(err.message);
    });
  } finally {
    await close();
  }
});

test('a pre-aborted user signal short-circuits immediately', async () => {
  const { url, close } = /** @type {any} */ (await stallServer(1000));
  try {
    const ac = new AbortController();
    ac.abort('user');
    await assert.rejects(() => fetchWithTimeout(url, { signal: ac.signal, timeoutMs: 2000 }));
  } finally {
    await close();
  }
});
