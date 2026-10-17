// @ts-check
// Generate static i18n packs for Saathi using Gemini.
//
// Usage:
//   GEMINI_API_KEY=... node --env-file-if-exists=.env scripts/gen-i18n.mjs
//
// Reads public/js/i18n/en.js as the source of truth and writes
// public/js/i18n/{pa,ta,te,bn,mr,hinglish}.js. Static output — no runtime
// AI calls for UI labels.
//
// Hinglish = Hindi written in Latin script.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dir, '..', 'public', 'js', 'i18n');

const TARGETS = [
  { code: 'pa', label: 'Punjabi (Gurmukhi script)', notes: 'Native Gurmukhi script.' },
  { code: 'ta', label: 'Tamil (Tamil script)', notes: 'Native Tamil script.' },
  { code: 'te', label: 'Telugu (Telugu script)', notes: 'Native Telugu script.' },
  { code: 'bn', label: 'Bengali (Bengali script)', notes: 'Native Bengali script.' },
  { code: 'mr', label: 'Marathi (Devanagari)', notes: 'Marathi written in Devanagari.' },
  {
    code: 'hinglish',
    label: 'Hinglish (Hindi written in Latin script, roman)',
    notes:
      'Hindi content in Latin letters, as working-class Indians type on WhatsApp. Example: "aaj kam", "shikayat likho". Keep English technical words (SMS, UPI, PDF) in English.',
  },
];

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PLACEHOLDER_RE = /\{[^}]+\}/g;
const EMOJI_RE =
  /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|‍/gu;

/** @param {string} s */
function placeholderFingerprint(s) {
  return (s.match(PLACEHOLDER_RE) || []).sort().join('|');
}
/** @param {string} s */
function emojiFingerprint(s) {
  return (s.match(EMOJI_RE) || []).sort().join('|');
}

async function loadEnglishPack() {
  const mod = await import(join(PACK_DIR, 'en.js'));
  return /** @type {Record<string,string>} */ (mod.default);
}

/**
 * @param {Record<string,string>} enPack
 * @param {typeof TARGETS[number]} target
 */
async function translatePack(enPack, target) {
  const schema = {
    type: 'object',
    properties: Object.fromEntries(Object.keys(enPack).map((k) => [k, { type: 'string' }])),
    required: Object.keys(enPack),
  };

  const system = [
    'You are translating short UI labels for Saathi, an app used by Indian gig and informal workers.',
    'Audience: delivery partners, drivers, daily-wage, often low-literacy, on budget phones.',
    `Translate every value from English into ${target.label}.`,
    target.notes,
    'HARD RULES — the output must round-trip verbatim through our validator:',
    '- Return the SAME keys as the input. Do not add/remove/rename a single key.',
    '- Keep every {placeholder} unchanged (same spelling, same braces).',
    '- Keep every emoji unchanged (same code point, same order).',
    '- Keep technical identifiers unchanged: SMS, UPI, PDF, OTP, UPI PIN, Aadhaar, Swiggy, Zomato, PM-JAY, e-Shram, 1930, 112, 108.',
    '- Short, simple sentences. Match the terseness of the English originals.',
    '- No new punctuation flourishes.',
  ].join('\n');

  const userPayload = JSON.stringify(enPack);

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userPayload }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.2,
    },
  };

  let data;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Gemini ${r.status}: ${t.slice(0, 300)}`);
      }
      data = await r.json();
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  if (lastErr) throw lastErr;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}';
  const parsed = JSON.parse(text);
  return /** @type {Record<string,string>} */ (parsed);
}

/**
 * @param {Record<string,string>} enPack
 * @param {Record<string,string>} outPack
 * @param {string} label
 */
function validatePack(enPack, outPack, label) {
  const problems = [];
  const enKeys = Object.keys(enPack);
  const outKeys = new Set(Object.keys(outPack));

  for (const k of enKeys) {
    if (!outKeys.has(k)) {
      problems.push(`missing key: ${k}`);
      continue;
    }
    const v = outPack[k];
    if (typeof v !== 'string' || !v.trim()) {
      problems.push(`empty/non-string value: ${k}`);
      continue;
    }
    const pIn = placeholderFingerprint(enPack[k]);
    const pOut = placeholderFingerprint(v);
    if (pIn !== pOut) problems.push(`placeholders differ in ${k}: "${pIn}" vs "${pOut}"`);
    const eIn = emojiFingerprint(enPack[k]);
    const eOut = emojiFingerprint(v);
    if (eIn !== eOut) problems.push(`emoji differ in ${k}: "${eIn}" vs "${eOut}"`);
  }
  for (const k of outKeys) {
    if (!enPack[k]) problems.push(`unexpected extra key: ${k}`);
  }

  if (problems.length) {
    console.error(`[${label}] validation failed with ${problems.length} issue(s):`);
    for (const p of problems.slice(0, 10)) console.error('  ' + p);
    if (problems.length > 10) console.error(`  …and ${problems.length - 10} more`);
    return false;
  }
  return true;
}

/**
 * @param {string} code
 * @param {Record<string,string>} pack
 */
async function writePack(code, pack) {
  const keyOrder = /** @type {string[]} */ (Object.keys(pack));
  const lines = [
    '// @ts-check',
    '// Generated by scripts/gen-i18n.mjs — do not hand-edit.',
    `// Source: public/js/i18n/en.js, translated via Gemini (${MODEL}).`,
    'export default {',
  ];
  for (const k of keyOrder) {
    const v = pack[k].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`  '${k}': '${v}',`);
  }
  lines.push('};', '');
  await writeFile(join(PACK_DIR, `${code}.js`), lines.join('\n'), 'utf8');
}

async function main() {
  const en = await loadEnglishPack();
  console.log(`English pack: ${Object.keys(en).length} keys`);

  // Enforce canonical ordering by using en key order throughout.
  const orderedKeys = Object.keys(en);
  const orderedEn = Object.fromEntries(orderedKeys.map((k) => [k, en[k]]));

  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const list = only.length ? TARGETS.filter((t) => only.includes(t.code)) : TARGETS;

  for (const target of list) {
    process.stdout.write(`→ ${target.code} … `);
    try {
      const raw = await translatePack(orderedEn, target);
      // Reorder to match en pack.
      const ordered = Object.fromEntries(orderedKeys.map((k) => [k, raw[k]]));
      if (!validatePack(orderedEn, ordered, target.code)) {
        console.error(`skipping ${target.code}`);
        continue;
      }
      await writePack(target.code, ordered);
      console.log('ok');
    } catch (err) {
      console.error('failed:', /** @type {Error} */ (err).message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
