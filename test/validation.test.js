// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAgentRequest, validateProfile, validateMedia } from '../src/validation.js';
import { AppError } from '../src/errors.js';

const goodProfile = {
  name: 'Ravi',
  workType: 'delivery',
  platform: 'Swiggy',
  city: 'Mohali',
  state: 'Punjab',
  language: 'Hinglish',
};

test('validateProfile accepts a valid profile', () => {
  assert.deepEqual(validateProfile(goodProfile), goodProfile);
});

test('validateProfile silently drops a stale simpleMode field from old clients', () => {
  const r = validateProfile({ ...goodProfile, simpleMode: true });
  assert.equal(/** @type {any} */ (r).simpleMode, undefined);
});

test('validateProfile rejects unknown language', () => {
  assert.throws(() => validateProfile({ ...goodProfile, language: 'Klingon' }), AppError);
});

test('validateProfile rejects unknown workType', () => {
  assert.throws(() => validateProfile({ ...goodProfile, workType: 'ninja' }), AppError);
});

test('validateProfile rejects missing field', () => {
  const p = { ...goodProfile };
  delete p.city;
  assert.throws(() => validateProfile(p), AppError);
});

test('validateProfile rejects long name', () => {
  assert.throws(() => validateProfile({ ...goodProfile, name: 'a'.repeat(200) }), AppError);
});

test('validateAgentRequest rejects unknown mode', () => {
  assert.throws(
    () => validateAgentRequest({ mode: 'wat', input: 'hi', profile: goodProfile }),
    AppError
  );
});

test('validateAgentRequest allows profile-only request (modes enforce their own minimums)', () => {
  const r = validateAgentRequest({ mode: 'schemes', input: '', profile: goodProfile });
  assert.equal(r.input, '');
  assert.deepEqual(r.media, []);
});

test('validateAgentRequest accepts a valid request', () => {
  const r = validateAgentRequest({
    mode: 'grievance',
    input: 'help',
    profile: goodProfile,
  });
  assert.equal(r.mode, 'grievance');
  assert.equal(r.input, 'help');
  assert.deepEqual(r.media, []);
});

test('validateMedia rejects disallowed mime', () => {
  assert.throws(
    () => validateMedia([{ mimeType: 'application/zip', data: 'AA==' }]),
    AppError
  );
});

test('validateMedia rejects invalid base64', () => {
  assert.throws(
    () => validateMedia([{ mimeType: 'image/jpeg', data: 'not base64!!!' }]),
    AppError
  );
});

test('validateMedia accepts jpeg', () => {
  const r = validateMedia([{ mimeType: 'image/jpeg', data: 'AA==' }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].mimeType, 'image/jpeg');
});

test('validateMedia rejects too-large payload', () => {
  // 4MB base64 >> 3.5MB limit
  const big = 'A'.repeat(6_000_000);
  assert.throws(() => validateMedia([{ mimeType: 'image/jpeg', data: big }]), AppError);
});
