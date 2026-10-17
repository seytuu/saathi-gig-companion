// @ts-check
import { agent } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { loading } from '../ui/loading.js';
import { errorBox } from '../ui/error.js';
import { bulletList } from '../ui/list.js';
import { toast } from '../ui/toast.js';
import { letterBlock } from '../ui/letter.js';
import { isMicSupported, startDictation } from '../voice.js';

const SAMPLES = [
  'mujhe koi insurance mil sakta hai kya? swiggy pe kaam karta hu',
  'daily wage worker ke liye koi pension scheme hai?',
];

/**
 * @param {HTMLElement} panel
 * @param {(mode:string, opts?:any) => void} navigate
 */
export function renderSchemes(panel, navigate) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;

  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      placeholder: t(lang, 'schemes.describe'),
      maxlength: '2000',
      'aria-label': t(lang, 'schemes.describe'),
    })
  );

  const runBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'schemes.run'));
  const trySample = el('button', { type: 'button', class: 'ghost' }, t(lang, 'generic.try'));
  const resultHost = el('div', { id: 'schemes-result' });

  const inputCard = card({
    title: t(lang, 'schemes.title'),
    subtitle: t(lang, 'schemes.describe'),
    actions: [
      runBtn,
      trySample,
      ...(isMicSupported() ? [buildMic(textarea, lang)] : []),
    ],
    children: [textarea],
  });

  trySample.addEventListener('click', () => {
    textarea.value = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    textarea.focus();
  });

  runBtn.addEventListener('click', async () => {
    const input = textarea.value.trim();
    runBtn.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    render(resultHost, loading(lang));
    try {
      const result = await agent({ mode: 'schemes', input, profile });
      renderSchemesList(resultHost, result, lang, navigate);
    } catch (err) {
      render(resultHost, errorBox(lang, /** @type {Error} */ (err).message));
    } finally {
      runBtn.disabled = false;
      panel.setAttribute('aria-busy', 'false');
    }
  });

  render(panel, inputCard, resultHost);
}

/**
 * @param {HTMLElement} host
 * @param {{schemes:any[]}} r
 * @param {string} lang
 * @param {(mode:string, opts?:any) => void} navigate
 */
function renderSchemesList(host, r, lang, navigate) {
  const list = r.schemes || [];
  if (!list.length) {
    render(host, card({ children: [el('p', { class: 'muted' }, t(lang, 'schemes.empty'))] }));
    return;
  }
  const cards = list.map((s) => schemeCard(s, lang, navigate));
  render(host, ...cards);
}

/**
 * @param {any} s
 * @param {string} lang
 * @param {(mode:string, opts?:any) => void} navigate
 */
function schemeCard(s, lang, navigate) {
  const saveBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'schemes.save'));
  const applyBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'schemes.apply'));
  const linkBtn = el(
    'a',
    { href: safeUrl(s.official_link), class: 'btn ghost', target: '_blank', rel: 'noopener noreferrer' },
    [el('span', { 'aria-hidden': 'true' }, '🔗'), ' ', t(lang, 'schemes.official')]
  );

  saveBtn.addEventListener('click', () => {
    store.saveScheme(s);
    saveBtn.disabled = true;
    saveBtn.textContent = '✓ ' + t(lang, 'schemes.saved');
    toast(t(lang, 'schemes.saved'));
  });

  applyBtn.addEventListener('click', () => {
    navigate('document', { handoff: { scheme: { name: s.name, documents_needed: s.documents_needed || [] } } });
  });

  return card({
    title: s.name,
    children: [
      el('p', { class: 'muted' }, s.who_can_apply),
      el('h3', {}, t(lang, 'schemes.benefits')),
      el('p', {}, s.benefits),
      el('h3', {}, t(lang, 'schemes.howTo')),
      bulletList(s.how_to_apply_steps || []),
      el('h3', {}, t(lang, 'schemes.docs')),
      bulletList(s.documents_needed || []),
    ],
    actions: [applyBtn, saveBtn, linkBtn, listenBtn(s, lang)],
  });
}

function listenBtn(s, lang) {
  // Build a listenable summary with the shared letter block for consistency.
  const summary =
    `${s.name}. ${s.benefits}. ${t(lang, 'schemes.howTo')}: ` +
    (s.how_to_apply_steps || []).join('. ');
  // We reuse letterBlock's listen button via a hidden letter.
  const container = el('div', {});
  container.appendChild(
    letterBlock({ title: '', body: summary, lang, listenLabel: t(lang, 'generic.listen') })
  );
  // Hide the title/letter visual; keep only the listen button at the end.
  const letterEl = container.querySelector('.letter');
  const title = container.querySelector('h3');
  if (letterEl) letterEl.remove();
  if (title) title.remove();
  return container;
}

/** @param {string} url */
function safeUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {
    /* fall through */
  }
  return 'about:blank';
}

/**
 * @param {HTMLTextAreaElement} target
 * @param {string} lang
 */
function buildMic(target, lang) {
  const btn = el(
    'button',
    { type: 'button', class: 'ghost', 'aria-pressed': 'false' },
    ['🎤 ', t(lang, 'generic.mic')]
  );
  let stop = null;
  btn.addEventListener('click', () => {
    if (stop) {
      stop();
      stop = null;
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '🎤 ' + t(lang, 'generic.mic');
      return;
    }
    stop = startDictation(target, lang, {
      onEnd: () => {
        stop = null;
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = '🎤 ' + t(lang, 'generic.mic');
      },
    });
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = '⏹ Stop';
  });
  return btn;
}
