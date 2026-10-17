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
import { isMicSupported, startDictation } from '../voice.js';

const CATEGORIES = [
  { key: 'accident', icon: '🚑', label: 'Accident' },
  { key: 'unsafe_drop', icon: '🌙', label: 'Late-night / unsafe drop' },
  { key: 'harassment', icon: '🛑', label: 'Harassment' },
  { key: 'weather', icon: '🌧', label: 'Heat / rain / pollution' },
  { key: 'breakdown', icon: '🔧', label: 'Vehicle breakdown / theft' },
  { key: 'customer', icon: '😠', label: 'Hostile customer' },
  { key: 'police_stop', icon: '🚔', label: 'Police stop / challan' },
];

/**
 * @param {HTMLElement} panel
 * @param {(mode:string, opts?:any) => void} navigate
 * @param {any[]} helplines
 */
export function renderSafety(panel, navigate, helplines) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;

  let category = 'general';
  const chipHost = el('div', { class: 'chips' });

  const chips = CATEGORIES.map((c) => {
    const btn = el(
      'button',
      { type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-cat': c.key },
      [el('span', { 'aria-hidden': 'true' }, c.icon), ' ', c.label]
    );
    btn.addEventListener('click', () => {
      category = c.key;
      chipHost.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
    });
    return btn;
  });
  chips.forEach((c) => chipHost.appendChild(c));

  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      placeholder: t(lang, 'safety.describe'),
      maxlength: '2000',
      'aria-label': t(lang, 'safety.describe'),
    })
  );
  const runBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'safety.run'));
  const resultHost = el('div', { id: 'safety-result' });

  const micBtn = isMicSupported() ? buildMic(textarea, lang) : null;

  runBtn.addEventListener('click', async () => {
    const input = textarea.value.trim();
    runBtn.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    render(resultHost, loading(lang));
    try {
      const result = await agent({
        mode: 'safety',
        input,
        profile,
        context: { category },
      });
      renderResult(resultHost, result, lang, navigate);
    } catch (err) {
      render(resultHost, errorBox(lang, /** @type {Error} */ (err).message));
    } finally {
      runBtn.disabled = false;
      panel.setAttribute('aria-busy', 'false');
    }
  });

  const inputCard = card({
    title: t(lang, 'safety.title'),
    subtitle: t(lang, 'safety.pickCategory'),
    children: [chipHost, textarea],
    actions: [runBtn, ...(micBtn ? [micBtn] : [])],
  });

  const helplineCard = helplinesCard(helplines, lang);

  render(panel, inputCard, resultHost, helplineCard);
}

/**
 * @param {HTMLElement} host
 * @param {any} r
 * @param {string} lang
 * @param {(mode:string, opts?:any) => void} navigate
 */
function renderResult(host, r, lang, navigate) {
  const complainBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'safety.complain'));
  complainBtn.addEventListener('click', () => {
    navigate('grievance', {
      handoff: {
        safety_summary: r.title,
        do_now: r.do_now,
        evidence_to_keep: r.evidence_to_keep,
      },
    });
  });

  render(
    host,
    card({ title: r.title, children: [el('p', { class: 'muted' }, t(lang, 'safety.doNow'))] }),
    card({ title: t(lang, 'safety.doNow'), children: [bulletList(r.do_now || [])] }),
    card({ title: t(lang, 'safety.doNot'), children: [bulletList(r.do_not || [])] }),
    card({ title: t(lang, 'safety.evidence'), children: [bulletList(r.evidence_to_keep || [])] }),
    card({ title: t(lang, 'safety.reportTo'), children: [bulletList(r.report_to || [])] }),
    card({
      children: [
        letterBlock({
          title: '',
          body: `${r.title}. ${(r.do_now || []).join('. ')}`,
          lang,
          listenLabel: t(lang, 'generic.listen'),
        }),
      ],
    }),
    card({ children: [el('div', { class: 'actions' }, [complainBtn])] })
  );
}

/**
 * @param {any[]} helplines
 * @param {string} lang
 */
export function helplinesCard(helplines, lang) {
  const items = helplines.map((h) => {
    const a = el(
      'a',
      {
        href: 'tel:' + h.number,
        class: 'btn secondary',
        style: 'min-width:140px;justify-content:space-between',
        'aria-label': `${h.label} ${h.number}`,
      },
      [el('span', {}, h.label), el('strong', {}, h.number)]
    );
    return a;
  });
  return card({
    title: t(lang, 'safety.helplines'),
    subtitle: t(lang, 'safety.helplinesHelp'),
    children: [el('div', { class: 'actions', style: 'gap:8px' }, items)],
  });
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
