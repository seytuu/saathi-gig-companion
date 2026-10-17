// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('src/app.js default export is a function (Express app) and import does not throw without env', async () => {
  // Clear env so we exercise the "no API key" path at module scope.
  delete process.env.GEMINI_API_KEY;
  const mod = await import('../src/app.js');
  assert.equal(typeof mod.default, 'function', 'default export is callable (express app)');
  // Express apps also behave as a function with .listen etc.
  assert.equal(typeof mod.default.listen, 'function', 'has listen()');
  assert.equal(typeof mod.default.use, 'function', 'has use()');
});
