// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dir, '..', 'public', 'js', 'i18n');

const PLACEHOLDER_RE = /\{[^}]+\}/g;
const EMOJI_RE =
  /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|‍/gu;

function fingerprint(s, re) {
  return (String(s).match(re) || []).sort().join('|');
}

async function loadPack(code) {
  const mod = await import(join(PACK_DIR, `${code}.js`));
  return /** @type {Record<string,string>} */ (mod.default);
}

async function discoverPacks() {
  const files = await readdir(PACK_DIR);
  return files.filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
}

test('every discovered pack has the same keys as en and matching placeholders/emoji', async () => {
  const en = await loadPack('en');
  const enKeys = Object.keys(en).sort();
  const packs = (await discoverPacks()).filter((p) => p !== 'en');
  assert.ok(packs.length >= 1, 'at least one translated pack exists');

  for (const code of packs) {
    const pack = await loadPack(code);
    const keys = Object.keys(pack).sort();
    assert.deepEqual(keys, enKeys, `pack ${code} should have identical keys to en`);
    for (const k of enKeys) {
      assert.equal(
        fingerprint(en[k], PLACEHOLDER_RE),
        fingerprint(pack[k], PLACEHOLDER_RE),
        `placeholders differ for ${code}.${k}`
      );
      assert.equal(
        fingerprint(en[k], EMOJI_RE),
        fingerprint(pack[k], EMOJI_RE),
        `emoji differ for ${code}.${k}`
      );
      assert.ok(pack[k].trim().length > 0, `${code}.${k} is empty`);
    }
  }
});

test('en and hi exist and have identical keys', async () => {
  const en = await loadPack('en');
  const hi = await loadPack('hi');
  assert.deepEqual(Object.keys(hi).sort(), Object.keys(en).sort());
});
