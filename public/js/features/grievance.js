// @ts-check
import { agent } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { loading } from '../ui/loading.js';
import { errorBox } from '../ui/error.js';
import { letterBlock } from '../ui/letter.js';
import { bulletList } from '../ui/list.js';
import { isMicSupported, startDictation } from '../voice.js';

const SAMPLES = [
  'mera ID 3 din se block hai, koi reason nahi bataya, support pe koi jawab nahi',
  'customer ne jhooth bola order nahi mila, mere paise kaat liye',
];

/**
 * @param {HTMLElement} panel
 * @param {{ handoff?: Record<string, unknown> }} [opts]
 */
export function renderGrievance(panel, opts = {}) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;

  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      id: 'grievance-input',
      placeholder: t(lang, 'grievance.describe'),
      maxlength: '2000',
      'aria-label': t(lang, 'grievance.describe'),
    })
  );

  const prefill = opts.handoff;
  if (prefill && typeof prefill === 'object') {
    // Bolo path sends a human-readable prefill string; feature handoffs send
    // structured evidence. Handle both.
    if (typeof prefill.prefill === 'string' && prefill.prefill) {
      textarea.value = prefill.prefill;
    } else {
      textarea.value = `[Evidence] ${JSON.stringify(prefill, null, 2)}\n\n`;
    }
  }

  const runBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'grievance.run'));
  const trySample = el('button', { type: 'button', class: 'ghost' }, t(lang, 'generic.try'));
  const micBtn = isMicSupported()
    ? el('button', {
        type: 'button',
        class: 'ghost',
        'aria-label': t(lang, 'generic.mic'),
      }, ['🎤 ', t(lang, 'generic.mic')])
    : null;

  trySample.addEventListener('click', () => {
    const next = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    textarea.value = next;
    textarea.focus();
  });

  if (micBtn) {
    let stop = null;
    micBtn.addEventListener('click', () => {
      if (stop) {
        stop();
        stop = null;
        micBtn.textContent = `🎤 ${t(lang, 'generic.mic')}`;
        return;
      }
      stop = startDictation(textarea, lang, {
        onEnd: () => {
          stop = null;
          micBtn.textContent = `🎤 ${t(lang, 'generic.mic')}`;
        },
        onError: () => {
          stop = null;
          micBtn.textContent = `🎤 ${t(lang, 'generic.mic')}`;
        },
      });
      micBtn.textContent = '⏹ Stop';
    });
  }

  const resultHost = el('div', { id: 'grievance-result' });

  const inputCard = card({
    title: t(lang, 'grievance.title'),
    subtitle: t(lang, 'grievance.describe'),
    actions: [runBtn, trySample, ...(micBtn ? [micBtn] : [])],
    children: [textarea],
  });

  render(panel, inputCard, resultHost);

  runBtn.addEventListener('click', async () => {
    const input = textarea.value.trim();
    if (!input && !prefill) {
      render(resultHost, errorBox(lang, t(lang, 'grievance.describe')));
      return;
    }
    runBtn.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    render(resultHost, loading(lang));
    try {
      const result = await agent({
        mode: 'grievance',
        input,
        profile,
        context: prefill || {},
      });
      renderResult(resultHost, result, lang);
    } catch (err) {
      render(resultHost, errorBox(lang, /** @type {Error} */ (err).message));
    } finally {
      runBtn.disabled = false;
      panel.setAttribute('aria-busy', 'false');
    }
  });
}

/**
 * @param {HTMLElement} host
 * @param {any} r
 * @param {string} lang
 */
function renderResult(host, r, lang) {
  const copyBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'grievance.copy'));
  const downloadBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'grievance.download'));
  const shareBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'grievance.share'));
  const saveBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'grievance.save'));

  const fullText = `${r.subject}\n\n--- English ---\n${r.english_letter}\n\n--- ${lang} ---\n${r.local_language_letter}`;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      copyBtn.textContent = '✓';
      setTimeout(() => (copyBtn.textContent = t(lang, 'grievance.copy')), 1500);
    } catch {
      copyBtn.textContent = '✗';
    }
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grievance-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  shareBtn.addEventListener('click', async () => {
    const payload = { title: r.subject, text: fullText };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        const url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        window.open(url, '_blank', 'noopener');
      }
    } catch {
      /* user cancelled */
    }
  });

  saveBtn.addEventListener('click', () => {
    const saved = store.addGrievance({
      subject: r.subject,
      english_letter: r.english_letter,
      local_language_letter: r.local_language_letter,
      where_to_submit: r.where_to_submit || [],
      evidence_list: r.evidence_list || [],
    });
    saveBtn.disabled = true;
    saveBtn.textContent = `✓ ${saved.id.slice(0, 6)}`;
  });

  const subject = card({
    title: t(lang, 'grievance.subject'),
    children: [el('p', {}, r.subject || '—')],
  });

  const english = card({
    children: [
      letterBlock({
        title: t(lang, 'grievance.english'),
        body: r.english_letter || '',
        lang: 'English',
        listenLabel: t('English', 'generic.listen'),
      }),
    ],
  });

  const local = card({
    children: [
      letterBlock({
        title: t(lang, 'grievance.local'),
        body: r.local_language_letter || '',
        lang,
        listenLabel: t(lang, 'generic.listen'),
      }),
    ],
  });

  const where = card({
    title: t(lang, 'grievance.where'),
    children: [bulletList(r.where_to_submit || [])],
  });

  const evidence = card({
    title: t(lang, 'grievance.evidence'),
    children: [bulletList(r.evidence_list || [])],
  });

  const actions = card({
    children: [el('div', { class: 'actions' }, [copyBtn, downloadBtn, shareBtn, saveBtn])],
  });

  render(host, subject, english, local, where, evidence, actions);
}
