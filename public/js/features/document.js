// @ts-check
import { agent } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { loading } from '../ui/loading.js';
import { errorBox } from '../ui/error.js';
import { bulletList } from '../ui/list.js';
import { checklist } from '../ui/checklist.js';
import { toast } from '../ui/toast.js';
import { letterBlock } from '../ui/letter.js';
import { compressImage, pdfToPart } from '../media.js';

/**
 * @param {HTMLElement} panel
 * @param {{ handoff?: { scheme?: { name:string, documents_needed:string[] } } }} [opts]
 */
export function renderDocument(panel, opts = {}) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;
  const scheme = opts.handoff?.scheme;

  const fileInput = /** @type {HTMLInputElement} */ (
    el('input', { type: 'file', accept: 'image/*,application/pdf', 'aria-label': t(lang, 'document.pickFile') })
  );
  const previewHost = el('div', { class: 'muted', style: 'margin-top:8px' });
  const questionArea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      placeholder: t(lang, 'document.question'),
      maxlength: '2000',
      'aria-label': t(lang, 'document.question'),
    })
  );
  const runBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'document.run'));
  const resultHost = el('div', { id: 'document-result' });

  /** @type {{mimeType:string, data:string}|null} */
  let currentPart = null;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    currentPart = null;
    if (!file) {
      previewHost.textContent = '';
      return;
    }
    previewHost.textContent = `${file.name} • ${Math.round(file.size / 1024)} KB`;
    try {
      if (file.type === 'application/pdf') {
        if (file.size > 3_000_000) throw new Error(t(lang, 'document.pdfTooLarge'));
        currentPart = await pdfToPart(file);
      } else if (file.type.startsWith('image/')) {
        currentPart = await compressImage(file);
        previewHost.textContent += ` → compressed to ~${Math.round(currentPart.data.length / 1024)} KB`;
      } else {
        throw new Error('Only images and PDFs are supported.');
      }
    } catch (e) {
      currentPart = null;
      previewHost.textContent = /** @type {Error} */ (e).message;
    }
  });

  const inputCard = card({
    title: scheme ? `${t(lang, 'document.title')} — ${scheme.name}` : t(lang, 'document.title'),
    subtitle: t(lang, 'document.describe'),
    children: [
      el('label', {}, [el('span', {}, t(lang, 'document.pickFile')), fileInput, previewHost]),
      el('label', {}, [el('span', {}, t(lang, 'document.question')), questionArea]),
    ],
    actions: [runBtn],
  });

  runBtn.addEventListener('click', async () => {
    const input = questionArea.value.trim();
    if (!currentPart && !input) {
      render(resultHost, errorBox(lang, t(lang, 'document.pickFile')));
      return;
    }
    runBtn.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    render(resultHost, loading(lang));
    try {
      const result = await agent({
        mode: 'document',
        input,
        profile,
        media: currentPart ? [currentPart] : [],
      });
      renderResult(resultHost, result, lang, scheme);
    } catch (err) {
      render(resultHost, errorBox(lang, /** @type {Error} */ (err).message));
    } finally {
      runBtn.disabled = false;
      panel.setAttribute('aria-busy', 'false');
    }
  });

  const children = [];
  if (scheme) children.push(renderSchemeChecklist(scheme, lang));
  children.push(inputCard, resultHost);
  render(panel, ...children);
}

/** @param {{ name:string, documents_needed:string[] }} scheme @param {string} lang */
function renderSchemeChecklist(scheme, lang) {
  return card({
    title: `${t(lang, 'document.checklistFor')} ${scheme.name}`,
    subtitle: t(lang, 'document.checklistHelp'),
    children: [checklist(scheme.documents_needed || [])],
  });
}

/**
 * @param {HTMLElement} host
 * @param {any} r
 * @param {string} lang
 * @param {{name:string, documents_needed:string[]} | undefined} scheme
 */
function renderResult(host, r, lang, scheme) {
  const saveBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'document.save'));
  saveBtn.addEventListener('click', () => {
    store.addDocument({ ...r, scheme: scheme?.name });
    saveBtn.disabled = true;
    saveBtn.textContent = '✓';
    toast(t(lang, 'document.saved'));
  });

  const warningsCard =
    (r.warnings || []).length > 0
      ? card({
          title: t(lang, 'document.warnings'),
          children: [bulletList(r.warnings)],
        })
      : null;

  const kind = card({
    title: r.document_type || t(lang, 'document.unknown'),
    children: [
      letterBlock({
        title: t(lang, 'document.explain'),
        body: r.plain_explanation || '',
        lang,
        listenLabel: t(lang, 'generic.listen'),
      }),
    ],
  });

  const key = card({ title: t(lang, 'document.keyPoints'), children: [bulletList(r.key_points || [])] });
  const act = card({ title: t(lang, 'document.actions'), children: [bulletList(r.action_needed || [])] });

  const kids = [kind, key, act];
  if (warningsCard) kids.push(warningsCard);
  kids.push(card({ children: [el('div', { class: 'actions' }, [saveBtn])] }));

  render(host, ...kids);
}
