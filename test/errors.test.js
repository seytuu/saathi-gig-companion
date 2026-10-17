// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, errorMiddleware } from '../src/errors.js';

function mockRes() {
  let status = 200;
  let body;
  return {
    status(s) {
      status = s;
      return this;
    },
    json(b) {
      body = b;
      return this;
    },
    get code() {
      return status;
    },
    get body() {
      return body;
    },
  };
}

test('AppError factories set user-safe messages', () => {
  const e = AppError.badRequest('mode');
  assert.equal(e.status, 400);
  assert.equal(e.code, 'bad_request');
  assert.ok(e.userMessage && !e.userMessage.includes('mode'), 'does not leak field name');
});

test('errorMiddleware returns userMessage for AppError', () => {
  const res = mockRes();
  errorMiddleware(AppError.notFound('mode'), /** @type {any} */ ({}), /** @type {any} */ (res), () => {});
  assert.equal(res.code, 404);
  assert.equal(res.body.code, 'not_found');
  assert.ok(!/mode/.test(res.body.error), 'does not leak field name');
});

test('errorMiddleware hides internals for generic Error', () => {
  const res = mockRes();
  errorMiddleware(new Error('db password: hunter2'), /** @type {any} */ ({}), /** @type {any} */ (res), () => {});
  assert.equal(res.code, 500);
  assert.ok(!/hunter2/.test(JSON.stringify(res.body)));
});
