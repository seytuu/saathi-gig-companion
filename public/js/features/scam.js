// @ts-check
import { agent } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { loading } from '../ui/loading.js';
import { errorBox } from '../ui/error.js';
import { bulletList } from '../ui/list.js';
import { letterBlock } from '../ui/letter.js';
import { compressImage } from '../media.js';

const SAMPLES = [
  'Dear user, your Swiggy KYC expired. Click https://bit.ly/kyc-fix within 24 hours or your account will be blocked.',
  'Sir mujhe part-time job chahiye, 500 fee bhejo for registration — training ke baad 25000/month.',
];

/**
 * @param {HTMLElement} panel
 */
export function renderScam(panel) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;

  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      placeholder: t(lang, 'scam.placeholder'),
      maxlength: '2000',
      'aria-label': t(lang, 'scam.placeholder'),
    })
  );

  const fileInput = /** @type {HTMLInputElement} */ (
    el('input', { type: 'file', accept: 'image/*', 'aria-label': t(lang, 'scam.pickFile') })
  );
  const filePrev = el('div', { class: 'muted' });
  /** @type {{mimeType:string, data:string}|null} */
  let part = null;
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    part = null;
    if (!f) {
      filePrev.textContent = '';
      return;
    }
    try {
      part = await compressImage(f);
      filePrev.textContent = `${f.name} (${Math.round(part.data.length / 1024)} KB)`;
    } catch (e) {
      filePrev.textContent = /** @type {Error} */ (e).message;
    }
  });

  const runBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'scam.run'));
  const trySample = el('button', { type: 'button', class: 'ghost' }, t(lang, 'generic.try'));
  const pasteBtn = el('button', { type: 'button', class: 'ghost' }, t(lang, 'scam.paste'));
  const resultHost = el('div', {});

  trySample.addEventListener('click', () => {
    textarea.value = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  });
  pasteBtn.addEventListener('click', async () => {
    try {
      textarea.value = await navigator.clipboard.readText();
    } catch {
      /* ignored */
    }
  });

  runBtn.addEventListener('click', async () => {
    const input = textarea.value.trim();
    if (!input && !part) {
      render(resultHost, errorBox(lang, t(lang, 'scam.needInput')));
      return;
    }
    runBtn.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    render(resultHost, loading(lang));
    try {
      const result = await agent({ mode: 'scam', input, profile, media: part ? [part] : [] });
      renderResult(resultHost, result, lang);
    } catch (err) {
      render(resultHost, errorBox(lang, /** @type {Error} */ (err).message));
    } finally {
      runBtn.disabled = false;
      panel.setAttribute('aria-busy', 'false');
    }
  });

  render(
    panel,
    card({
      title: t(lang, 'scam.title'),
      subtitle: t(lang, 'scam.describe'),
      children: [
        textarea,
        el('label', {}, [el('span', {}, t(lang, 'scam.pickFile')), fileInput, filePrev]),
      ],
      actions: [runBtn, trySample, pasteBtn],
    }),
    resultHost
  );
}

/** @param {HTMLElement} host @param {any} r @param {string} lang */
function renderResult(host, r, lang) {
  const verdictClass =
    r.verdict === 'scam' ? 'notice-danger' : r.verdict === 'suspicious' ? 'notice' : 'notice-ok';
  const verdictLabel =
    r.verdict === 'scam'
      ? t(lang, 'scam.verdictScam')
      : r.verdict === 'suspicious'
        ? t(lang, 'scam.verdictSuspicious')
        : t(lang, 'scam.verdictSafe');
  const cyberCta = el(
    'div',
    { class: 'actions' },
    [
      el(
        'a',
        { href: 'tel:1930', class: 'btn danger' },
        [el('span', {}, '📞 '), ' 1930 ', t(lang, 'scam.cyberHelp')]
      ),
      el(
        'a',
        {
          href: 'https://cybercrime.gov.in',
          class: 'btn secondary',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'cybercrime.gov.in'
      ),
    ]
  );
  render(
    host,
    card({
      children: [
        el('div', { class: verdictClass, role: 'alert' }, verdictLabel),
        el(
          'div',
          {},
          [
            letterBlock({
              title: '',
              body: (r.reasons || []).join('. '),
              lang,
              listenLabel: t(lang, 'generic.listen'),
            }),
          ]
        ),
      ],
    }),
    card({ title: t(lang, 'scam.reasons'), children: [bulletList(r.reasons || [])] }),
    card({ title: t(lang, 'scam.whatToDo'), children: [bulletList(r.what_to_do || [])] }),
    card({ title: t(lang, 'scam.report'), children: [cyberCta] })
  );
}
