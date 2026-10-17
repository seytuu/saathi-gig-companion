// @ts-check
import { el } from '../ui/dom.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { speak, stopSpeaking } from '../voice.js';
import { toast } from '../ui/toast.js';
import { card } from '../ui/card.js';
import { bulletList } from '../ui/list.js';
import { letterBlock } from '../ui/letter.js';
import { blobToBase64 } from '../media.js';

const SUPPORTED_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

/**
 * Open the Bolo agent overlay. Chat-style: previous turns persist, each
 * assistant reply can carry an action list the user can tap.
 *
 * @param {(mode:string, opts?:any) => void} navigate
 */
export function openBolo(navigate) {
  const profile = store.get().profile;
  const lang = profile?.language || 'English';

  const overlay = el('div', { class: 'bolo-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bolo' });
  const closeBtn = el('button', { type: 'button', class: 'bolo-close', 'aria-label': 'Close' }, '✕');
  const title = el('h2', { class: 'bolo-title' }, t(lang, 'bolo.title'));
  const sub = el('p', { class: 'bolo-sub muted' }, t(lang, 'bolo.sub'));

  const chat = el('div', { class: 'bolo-chat', 'aria-live': 'polite' });

  const timer = el('div', { class: 'bolo-timer' }, '');
  const micBtn = el('button', { type: 'button', class: 'bolo-mic', 'aria-label': t(lang, 'bolo.record') }, '🎤');
  const stopBtn = el('button', { type: 'button', class: 'danger' }, t(lang, 'bolo.stop'));
  stopBtn.hidden = true;

  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      class: 'bolo-text',
      placeholder: t(lang, 'bolo.typePlaceholder'),
      maxlength: '2000',
      'aria-label': t(lang, 'bolo.typePlaceholder'),
      rows: '2',
    })
  );
  const sendBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'bolo.send'));

  overlay.append(
    closeBtn,
    title,
    sub,
    chat,
    el('div', { class: 'bolo-mic-row' }, [timer, micBtn, stopBtn]),
    el('div', { class: 'bolo-input-row' }, [textarea, sendBtn])
  );
  document.body.appendChild(overlay);

  // Focus trap + Esc.
  const previouslyFocused = document.activeElement;
  textarea.focus();
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (e.key === 'Tab') {
      const focusables = /** @type {HTMLElement[]} */ (
        Array.from(overlay.querySelectorAll('button, textarea, [href]')).filter(
          (n) => !(/** @type {any} */ (n)).hidden
        )
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  overlay.addEventListener('keydown', onKey);

  /** @type {MediaRecorder|null} */
  let recorder = null;
  /** @type {Blob[]} */
  let chunks = [];
  let startedAt = 0;
  let timerHandle = 0;
  let recordingMime = 'audio/webm';
  /** @type {{role:string, text:string, toolUsed?:string, resultSummary?:string}[]} */
  const history = [];

  const close = () => {
    stopSpeaking();
    if (timerHandle) clearInterval(timerHandle);
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    overlay.removeEventListener('keydown', onKey);
    overlay.remove();
    /** @type {HTMLElement|null} */ (previouslyFocused instanceof HTMLElement ? previouslyFocused : null)?.focus();
  };
  closeBtn.addEventListener('click', close);

  function pushUserBubble(text) {
    chat.appendChild(el('div', { class: 'bubble user' }, text));
    chat.scrollTop = chat.scrollHeight;
    history.push({ role: 'user', text });
  }

  function pushAssistantBubble(data) {
    const kids = [el('p', {}, data.reply || '')];
    if (data.emergency) {
      kids.push(
        el(
          'a',
          { href: 'tel:112', class: 'btn danger', 'aria-label': 'Call 112' },
          '📞 112 — Emergency'
        )
      );
    }
    const resultCard = renderResult(data, lang);
    if (resultCard) kids.push(resultCard);

    const actionsRow = buildActions(data, lang, navigate, close);
    if (actionsRow) kids.push(actionsRow);

    chat.appendChild(el('div', { class: 'bubble assistant' }, kids));
    chat.scrollTop = chat.scrollHeight;
    history.push({
      role: 'assistant',
      text: data.reply || '',
      toolUsed: data.toolUsed || undefined,
      resultSummary: data.toolUsed ? `${data.toolUsed} done` : undefined,
    });
    if (data.reply) speak(data.reply, lang);
  }

  function pushLoading() {
    const node = el('div', { class: 'bubble assistant loading' }, [
      el('div', { class: 'spinner' }),
      el('span', {}, t(lang, 'generic.loading')),
    ]);
    chat.appendChild(node);
    chat.scrollTop = chat.scrollHeight;
    return node;
  }

  function pushError(msg) {
    chat.appendChild(el('div', { class: 'bubble assistant error' }, msg));
    chat.scrollTop = chat.scrollHeight;
  }

  async function send(payload, userBubbleText) {
    if (userBubbleText) pushUserBubble(userBubbleText);
    const loading = pushLoading();
    try {
      const r = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, profile, history: history.slice(-6) }),
      });
      const data = await r.json();
      loading.remove();
      if (!r.ok) throw new Error(data.error || 'Capture failed');
      pushAssistantBubble(data);
    } catch (err) {
      loading.remove();
      pushError(/** @type {Error} */ (err).message);
    }
  }

  sendBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = '';
    await send({ text }, text);
  });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  micBtn.addEventListener('click', async () => {
    if (recorder && recorder.state === 'recording') return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast(t(lang, 'bolo.noMic'));
      textarea.focus();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingMime = pickMime();
      recorder = new MediaRecorder(stream, recordingMime ? { mimeType: recordingMime } : undefined);
      chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerHandle) clearInterval(timerHandle);
        micBtn.hidden = false;
        stopBtn.hidden = true;
        timer.textContent = '';
        if (chunks.length) {
          const blob = new Blob(chunks, { type: recordingMime || 'audio/webm' });
          if (blob.size > 1_500_000) {
            pushError(t(lang, 'bolo.tooLong'));
            return;
          }
          const audio = await blobToBase64(blob);
          await send({ audio, mimeType: blob.type || recordingMime || 'audio/webm' }, '🎤 voice note');
        }
      };
      recorder.start();
      startedAt = Date.now();
      micBtn.hidden = true;
      stopBtn.hidden = false;
      timer.textContent = '0.0 / 30s';
      timerHandle = window.setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        timer.textContent = `${elapsed.toFixed(1)} / 30s`;
        if (elapsed >= 30) {
          try {
            recorder?.stop();
          } catch {
            /* ignore */
          }
        }
      }, 100);
    } catch (err) {
      toast(/** @type {Error} */ (err).message || 'mic denied');
      textarea.focus();
    }
  });

  stopBtn.addEventListener('click', () => {
    try {
      recorder?.stop();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Render the result card for the current tool using the same ui/ components
 * as the full tabs — just inline inside a chat bubble.
 */
function renderResult(data, lang) {
  const r = data.result;
  if (!r || data.emergency) return null;
  switch (data.intent) {
    case 'earnings':
      if (!Array.isArray(r.entries) || !r.entries.length) return null;
      return card({
        title: '💰 ' + (r.entries.length === 1 ? 'Entry' : `${r.entries.length} entries`),
        children: r.entries.slice(0, 2).map((e) =>
          el('div', { class: 'item' }, [
            el('div', { class: 'item-label' }, `${e.date} • ${e.platform} • ₹${e.net}`),
            el('div', { class: 'muted' }, e.notes || ''),
          ])
        ),
      });
    case 'safety':
      return card({
        title: '🛟 ' + (r.title || t(lang, 'tabs.safety')),
        children: [bulletList((r.do_now || []).slice(0, 3))],
      });
    case 'schemes': {
      const list = Array.isArray(r.schemes) ? r.schemes.slice(0, 2) : [];
      if (!list.length) return null;
      return card({
        title: '🪪 ' + t(lang, 'tabs.schemes'),
        children: list.map((s) => el('div', { class: 'item' }, [el('div', { class: 'item-label' }, s.name), el('div', { class: 'muted' }, s.benefits || '')])),
      });
    }
    case 'grievance':
      return card({
        title: '✉️ ' + (r.subject || t(lang, 'tabs.grievance')),
        children: [
          letterBlock({
            title: '',
            body: r.local_language_letter || r.english_letter || '',
            lang,
            listenLabel: t(lang, 'generic.listen'),
          }),
        ],
      });
    case 'scam':
      return card({
        title: r.verdict === 'scam' ? '🚫 Scam' : r.verdict === 'suspicious' ? '⚠ Suspicious' : '✅ Safe',
        children: [bulletList((r.reasons || []).slice(0, 3))],
      });
    case 'document':
      return card({
        title: '📄 ' + (r.document_type || t(lang, 'tabs.document')),
        children: [el('p', {}, r.plain_explanation || '')],
      });
    default:
      return null;
  }
}

/**
 * Render tappable action buttons. Every real-world action requires an
 * explicit tap — never auto-save.
 */
function buildActions(data, lang, navigate, close) {
  const actions = data.actions || [];
  if (!actions.length) return null;
  const buttons = [];

  const seen = new Set();
  for (const a of actions) {
    const key = `${a.kind}:${a.mode || a.number || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (a.kind === 'open_tab') {
      const b = el('button', { type: 'button', class: 'secondary' }, `${labelForMode(a.mode, lang)} →`);
      b.addEventListener('click', () => {
        const prefill = typeof a.prefill === 'string' ? a.prefill : data.transcript || '';
        close();
        navigate(a.mode, { handoff: { prefill } });
      });
      buttons.push(b);
    } else if (a.kind === 'tel') {
      buttons.push(
        el(
          'a',
          { href: 'tel:' + a.number, class: 'btn danger' },
          `📞 ${a.number}`
        )
      );
    } else if (a.kind === 'copy_letter' && data.result?.english_letter) {
      const b = el('button', { type: 'button', class: 'ghost' }, '📋 Copy');
      b.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(
            `${data.result.subject}\n\n${data.result.english_letter}\n\n${data.result.local_language_letter || ''}`
          );
          toast('Copied');
        } catch {
          toast('Copy failed');
        }
      });
      buttons.push(b);
    } else if (a.kind === 'share') {
      const b = el('button', { type: 'button', class: 'ghost' }, '↗ Share');
      b.addEventListener('click', async () => {
        const text = data.result?.english_letter || data.reply || '';
        if (navigator.share) {
          try {
            await navigator.share({ title: 'Saathi', text });
          } catch {
            /* user cancelled */
          }
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        }
      });
      buttons.push(b);
    } else if (a.kind === 'show_helplines') {
      buttons.push(
        el('a', { href: 'tel:112', class: 'btn danger' }, '📞 112'),
        el('a', { href: 'tel:108', class: 'btn secondary' }, '📞 108')
      );
    } else if (a.kind === 'review_ledger' && Array.isArray(a.entries) && a.entries.length) {
      const b = el('button', { type: 'button', class: 'primary' }, '✓ ' + t(lang, 'earnings.save'));
      b.addEventListener('click', () => {
        store.addLedger(a.entries, { source: 'bolo', model: 'gemini-3.8-flash' });
        toast(t(lang, 'earnings.saved'));
        b.disabled = true;
      });
      buttons.push(b);
    }
  }

  if (!buttons.length) return null;
  return el('div', { class: 'actions bolo-actions' }, buttons);
}

/** @param {string} mode @param {string} lang */
function labelForMode(mode, lang) {
  const map = {
    earnings: t(lang, 'tabs.earnings'),
    safety: t(lang, 'tabs.safety'),
    schemes: t(lang, 'tabs.schemes'),
    document: t(lang, 'tabs.document'),
    grievance: t(lang, 'tabs.grievance'),
    scam: t(lang, 'scam.title'),
  };
  return map[mode] || mode;
}

function pickMime() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  for (const m of SUPPORTED_MIMES) if (MediaRecorder.isTypeSupported(m)) return m;
  return '';
}

/**
 * Add a floating "Bolo" FAB that opens the overlay.
 * @param {(mode:string, opts?:any) => void} navigate
 */
export function mountBoloFab(navigate) {
  const btn = el(
    'button',
    { type: 'button', id: 'bolo-fab', class: 'bolo-fab', 'aria-label': 'Bolo — speak to Saathi' },
    '🎤'
  );
  btn.addEventListener('click', () => openBolo(navigate));
  document.body.appendChild(btn);
}
