// @ts-check
import { el, render } from '../ui/dom.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { speak, stopSpeaking } from '../voice.js';
import { toast } from '../ui/toast.js';

const SUPPORTED_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

/**
 * Open the Bolo overlay. User can speak (MediaRecorder) or type.
 * On submit, POST /api/capture and navigate to the resulting intent.
 *
 * @param {(mode:string, opts?:any) => void} navigate
 */
export function openBolo(navigate) {
  const profile = store.get().profile;
  const lang = profile?.language || 'English';

  const overlay = el('div', { class: 'bolo-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bolo voice capture' });
  const closeBtn = el(
    'button',
    { type: 'button', class: 'bolo-close', 'aria-label': 'Close' },
    '✕'
  );
  const title = el('h2', { class: 'bolo-title' }, t(lang, 'bolo.title'));
  const sub = el('p', { class: 'bolo-sub muted' }, t(lang, 'bolo.sub'));

  const timer = el('div', { class: 'bolo-timer', 'aria-live': 'polite' }, '0.0 / 30s');
  const recordBtn = el(
    'button',
    { type: 'button', class: 'bolo-mic', 'aria-label': t(lang, 'bolo.record') },
    '🎤'
  );
  const stopBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'bolo.stop'));
  const cancelBtn = el('button', { type: 'button', class: 'ghost' }, t(lang, 'bolo.cancel'));
  stopBtn.hidden = true;

  const orDivider = el('div', { class: 'bolo-or', 'aria-hidden': 'true' }, t(lang, 'bolo.or'));
  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      class: 'bolo-text',
      placeholder: t(lang, 'bolo.typePlaceholder'),
      maxlength: '2000',
      'aria-label': t(lang, 'bolo.typePlaceholder'),
      rows: '3',
    })
  );
  const sendBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'bolo.send'));

  const resultHost = el('div', { class: 'bolo-result', 'aria-live': 'polite' });

  overlay.append(
    closeBtn,
    title,
    sub,
    timer,
    recordBtn,
    el('div', { class: 'actions', style: 'justify-content:center' }, [stopBtn, cancelBtn]),
    orDivider,
    textarea,
    el('div', { class: 'actions', style: 'justify-content:center' }, [sendBtn]),
    resultHost
  );
  document.body.appendChild(overlay);

  // Focus trap: focus the first focusable; Esc closes.
  const previouslyFocused = document.activeElement;
  recordBtn.focus();
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (e.key === 'Tab') {
      const focusables = overlay.querySelectorAll('button, textarea, [href]');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        /** @type {HTMLElement} */ (last).focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        /** @type {HTMLElement} */ (first).focus();
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

  const stopTimer = () => {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = 0;
    }
  };

  const close = () => {
    stopSpeaking();
    stopTimer();
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
  cancelBtn.addEventListener('click', close);

  recordBtn.addEventListener('click', async () => {
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
        stopTimer();
        recordBtn.hidden = false;
        stopBtn.hidden = true;
        timer.textContent = '…';
        if (chunks.length) {
          const blob = new Blob(chunks, { type: recordingMime || 'audio/webm' });
          await sendAudio(blob);
        }
      };
      recorder.start();
      startedAt = Date.now();
      recordBtn.hidden = true;
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

  sendBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) return;
    await sendRequest({ text });
  });

  /** @param {Blob} blob */
  async function sendAudio(blob) {
    if (blob.size > 1_500_000) {
      renderError(t(lang, 'bolo.tooLong'));
      return;
    }
    renderLoading();
    const audio = await blobToBase64(blob);
    await sendRequest({ audio, mimeType: /** @type {string} */ (blob.type || recordingMime || 'audio/webm') });
  }

  /** @param {{text?:string, audio?:string, mimeType?:string}} payload */
  async function sendRequest(payload) {
    renderLoading();
    try {
      const r = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, profile }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Capture failed');
      renderResult(data);
    } catch (err) {
      renderError(/** @type {Error} */ (err).message);
    }
  }

  function renderLoading() {
    render(
      resultHost,
      el('div', { class: 'loading' }, [el('div', { class: 'spinner' }), el('span', {}, t(lang, 'generic.loading'))])
    );
  }

  /** @param {string} msg */
  function renderError(msg) {
    render(resultHost, el('div', { class: 'error' }, msg || 'Error'));
  }

  /** @param {any} data */
  function renderResult(data) {
    const transcriptBlock = el('div', { class: 'bolo-transcript' }, [
      el('div', { class: 'muted' }, t(lang, 'bolo.youSaid')),
      el('p', {}, data.transcript || '—'),
    ]);
    const replyBlock = el('div', { class: 'bolo-reply' }, [
      el('div', { class: 'muted' }, 'Saathi'),
      el('p', {}, data.reply || ''),
    ]);
    const intentLabel = labelForIntent(data.intent, lang);
    const continueBtn = el(
      'button',
      { type: 'button', class: 'primary' },
      t(lang, 'bolo.continue') + ' → ' + intentLabel
    );
    continueBtn.addEventListener('click', () => {
      const prefill = data.prefill || data.transcript || '';
      close();
      if (data.intent === 'unknown' || !data.intent) {
        toast(t(lang, 'bolo.notUnderstood'));
        return;
      }
      navigate(data.intent, { handoff: { prefill, transcript: data.transcript } });
    });
    const retryBtn = el('button', { type: 'button', class: 'ghost' }, t(lang, 'bolo.retry'));
    retryBtn.addEventListener('click', () => {
      resultHost.replaceChildren();
      textarea.value = '';
      stopSpeaking();
      recordBtn.focus();
    });

    render(resultHost, transcriptBlock, replyBlock, el('div', { class: 'actions', style: 'justify-content:center' }, [continueBtn, retryBtn]));

    // Auto read aloud.
    if (data.reply) speak(data.reply, lang);
  }
}

function pickMime() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  for (const m of SUPPORTED_MIMES) if (MediaRecorder.isTypeSupported(m)) return m;
  return '';
}

/** @param {Blob} blob */
async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  // Chunk to avoid stack overflow on large payloads.
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, /** @type {any} */ (bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

/** @param {string} intent @param {string} lang */
function labelForIntent(intent, lang) {
  const map = {
    earnings: t(lang, 'tabs.earnings'),
    safety: t(lang, 'tabs.safety'),
    schemes: t(lang, 'tabs.schemes'),
    document: t(lang, 'tabs.document'),
    grievance: t(lang, 'tabs.grievance'),
    scam: t(lang, 'scam.title'),
    unknown: '?',
  };
  return map[intent] || intent;
}

/**
 * Add a floating "Bolo" FAB that opens the overlay.
 * @param {(mode:string, opts?:any) => void} navigate
 */
export function mountBoloFab(navigate) {
  const btn = el(
    'button',
    {
      type: 'button',
      id: 'bolo-fab',
      class: 'bolo-fab',
      'aria-label': 'Bolo — speak to Saathi',
    },
    '🎤'
  );
  btn.addEventListener('click', () => openBolo(navigate));
  document.body.appendChild(btn);
}
