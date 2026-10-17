// @ts-check
import { agent } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { loading } from '../ui/loading.js';
import { errorBox } from '../ui/error.js';
import { toast } from '../ui/toast.js';
import { compressImage, pdfToPart } from '../media.js';
import { isMicSupported, startDictation } from '../voice.js';
import { checkEarningsEntry, confidenceFromIssues, BOUNDS } from '../utils/crossCheck.js';

const SAMPLES = {
  text: 'aaj 14 order kiye, 920 aaye, petrol 180 ka dalwaya',
  sms: 'Rs.920.00 credited to A/c XX1234 by NEFT-QUICKDROP LOGISTICS on 16-10-26',
  missing: 'kal ka incentive 250 nahi aaya, 12 order pure kiye the',
};

/**
 * @param {HTMLElement} panel
 * @param {(mode:string, opts?:any) => void} navigate
 */
export function renderEarnings(panel, navigate) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;

  const textarea = /** @type {HTMLTextAreaElement} */ (
    el('textarea', {
      placeholder: t(lang, 'earnings.placeholder'),
      maxlength: '2000',
      'aria-label': t(lang, 'earnings.placeholder'),
    })
  );

  const fileInput = /** @type {HTMLInputElement} */ (
    el('input', {
      type: 'file',
      accept: 'image/*,application/pdf',
      multiple: true,
      'aria-label': t(lang, 'earnings.pickFile'),
    })
  );
  const filePreview = el('div', { class: 'muted', style: 'margin-top:6px;font-size:0.9em' });

  /** @type {{mimeType:string, data:string}[]} */
  let currentParts = [];

  fileInput.addEventListener('change', async () => {
    currentParts = [];
    const files = Array.from(fileInput.files || []);
    const labels = [];
    for (const f of files) {
      try {
        if (f.type === 'application/pdf') {
          if (f.size > 3_000_000) throw new Error('PDF too large (max 3 MB)');
          currentParts.push(await pdfToPart(f));
        } else if (f.type.startsWith('image/')) {
          currentParts.push(await compressImage(f));
        }
        labels.push(f.name);
      } catch (e) {
        labels.push(`${f.name} — ${/** @type {Error} */ (e).message}`);
      }
    }
    filePreview.textContent = labels.join(' • ');
  });

  const runBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'earnings.run'));
  const sampleText = el('button', { type: 'button', class: 'ghost' }, t(lang, 'earnings.sampleText'));
  const sampleSms = el('button', { type: 'button', class: 'ghost' }, t(lang, 'earnings.sampleSms'));
  const sampleMissing = el('button', { type: 'button', class: 'ghost' }, t(lang, 'earnings.sampleMissing'));
  const resultHost = el('div', { id: 'earnings-result' });

  sampleText.addEventListener('click', () => {
    textarea.value = SAMPLES.text;
    textarea.focus();
  });
  sampleSms.addEventListener('click', () => {
    textarea.value = SAMPLES.sms;
    textarea.focus();
  });
  sampleMissing.addEventListener('click', () => {
    textarea.value = SAMPLES.missing;
    textarea.focus();
  });

  const micBtn = isMicSupported() ? buildMic(textarea, lang) : null;

  const inputCard = card({
    title: t(lang, 'earnings.title'),
    subtitle: t(lang, 'earnings.describe'),
    children: [
      el('label', {}, [el('span', {}, t(lang, 'earnings.textLabel')), textarea]),
      el('label', {}, [
        el('span', {}, t(lang, 'earnings.pickFile')),
        fileInput,
        filePreview,
      ]),
      el('div', { class: 'actions' }, [runBtn, ...(micBtn ? [micBtn] : [])]),
      el('div', { class: 'actions' }, [sampleText, sampleSms, sampleMissing]),
    ],
  });

  runBtn.addEventListener('click', async () => {
    const input = textarea.value.trim();
    if (!input && currentParts.length === 0) {
      render(resultHost, errorBox(lang, t(lang, 'earnings.needInput')));
      return;
    }
    runBtn.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    render(resultHost, loading(lang));
    try {
      const result = await agent({ mode: 'earnings', input, profile, media: currentParts });
      // Pattern: AI suggests, worker confirms. Don't auto-append — show
      // review cards with Save/Discard per entry.
      renderReview(resultHost, result, lang, navigate, {
        source: currentParts.length ? (currentParts[0].mimeType === 'application/pdf' ? 'pdf' : 'screenshot') : 'text',
        rawInput: input,
        model: 'gemini-3.8-flash',
      });
    } catch (err) {
      render(resultHost, errorBox(lang, /** @type {Error} */ (err).message));
    } finally {
      runBtn.disabled = false;
      panel.setAttribute('aria-busy', 'false');
    }
  });

  const ledgerCard = renderLedger(lang, navigate);
  render(panel, inputCard, resultHost, ledgerCard);
}

/**
 * Review pattern: AI suggests, worker confirms. Each entry gets Save /
 * Discard; low-confidence entries highlight fields to double-check.
 *
 * @param {HTMLElement} host
 * @param {{entries:any[], tip:string}} r
 * @param {string} lang
 * @param {(mode:string, opts?:any) => void} navigate
 * @param {{source:string, rawInput:string, model:string}} provenance
 */
function renderReview(host, r, lang, navigate, provenance) {
  const kids = [];
  if (r.tip) {
    kids.push(card({ title: '💡 ' + t(lang, 'earnings.tip'), children: [el('p', {}, r.tip)] }));
  }

  if (!r.entries?.length) {
    kids.push(card({ children: [el('p', { class: 'muted' }, t(lang, 'earnings.empty'))] }));
  } else {
    kids.push(
      card({
        children: [
          el('p', { class: 'muted' }, t(lang, 'earnings.reviewHelp')),
        ],
      })
    );
    for (const entry of r.entries) {
      kids.push(reviewCard(entry, lang, navigate, provenance));
    }
  }

  kids.push(renderLedger(lang, navigate));
  render(host, ...kids);
}

/**
 * @param {any} entry
 * @param {string} lang
 * @param {(mode:string, opts?:any) => void} navigate
 * @param {{source:string, rawInput:string, model:string}} provenance
 */
function reviewCard(entry, lang, navigate, provenance) {
  const check = checkEarningsEntry(entry, provenance.rawInput);
  const confidence = confidenceFromIssues(check.issues);
  const low = confidence < BOUNDS.confirmThreshold;

  // Editable fields
  /** @type {Record<string, HTMLInputElement>} */
  const fields = {};
  const fieldDefs = [
    { k: 'date', label: t(lang, 'earnings.col.date'), type: 'text', inputmode: 'text' },
    { k: 'platform', label: t(lang, 'earnings.col.platform'), type: 'text', inputmode: 'text' },
    { k: 'orders', label: t(lang, 'earnings.col.orders'), type: 'number', inputmode: 'numeric' },
    { k: 'gross', label: t(lang, 'earnings.col.gross'), type: 'number', inputmode: 'decimal' },
    { k: 'incentives', label: t(lang, 'earnings.col.incentives'), type: 'number', inputmode: 'decimal' },
    { k: 'deductions', label: t(lang, 'earnings.col.deductions'), type: 'number', inputmode: 'decimal' },
    { k: 'expenses', label: t(lang, 'earnings.col.expenses'), type: 'number', inputmode: 'decimal' },
    { k: 'net', label: t(lang, 'earnings.col.net'), type: 'number', inputmode: 'decimal' },
  ];

  const flagged = flaggedKeys(check.issues);
  const grid = el(
    'div',
    { class: 'kv' },
    fieldDefs.map((f) => {
      const inp = /** @type {HTMLInputElement} */ (
        el('input', {
          type: f.type,
          inputmode: f.inputmode,
          value: String(entry[f.k] ?? ''),
          'aria-label': f.label,
        })
      );
      fields[f.k] = inp;
      const row = el('div', { class: 'kv-row' + (flagged.has(f.k) ? ' kv-flag' : '') }, [
        el('div', { class: 'kv-k' }, f.label),
        el('div', { class: 'kv-v' }, [inp]),
      ]);
      return row;
    })
  );

  const notesInput = /** @type {HTMLInputElement} */ (
    el('input', { type: 'text', value: entry.notes || '', 'aria-label': 'Notes' })
  );

  const confBar = el('div', { class: 'confbar ' + (low ? 'low' : 'ok') }, [
    el('span', {}, `${t(lang, 'earnings.confidence')}: ${Math.round(confidence * 100)}%`),
    ...(check.issues.length
      ? [el('span', { class: 'muted' }, ' • ' + check.issues.map((i) => flagLabel(i, lang)).join(', '))]
      : []),
  ]);

  const saveBtn = el('button', { type: 'button', class: 'primary' }, t(lang, 'earnings.save'));
  const discardBtn = el('button', { type: 'button', class: 'ghost' }, t(lang, 'earnings.discard'));
  const disputeBtn = el('button', { type: 'button', class: 'secondary' }, t(lang, 'earnings.dispute'));

  const card$ = card({
    title: `${entry.date} • ${entry.platform}`,
    children: [
      low
        ? el('div', { class: 'notice' }, '⚠ ' + t(lang, 'earnings.pleaseCheck'))
        : null,
      confBar,
      grid,
      el('label', {}, [el('span', {}, 'Notes'), notesInput]),
      entry.flag ? el('div', { class: 'notice' }, '⚠ ' + entry.flag) : null,
    ].filter(Boolean),
    actions: [saveBtn, discardBtn, disputeBtn],
  });

  const collect = () => {
    const next = { ...entry };
    for (const [k, inp] of Object.entries(fields)) {
      const raw = inp.value;
      const def = fieldDefs.find((f) => f.k === k);
      next[k] = def?.type === 'number' ? Number(raw) || 0 : raw;
    }
    next.notes = notesInput.value;
    return next;
  };

  saveBtn.addEventListener('click', () => {
    const final = collect();
    const edited = JSON.stringify(final) !== JSON.stringify(entry);
    store.addLedger([{ ...final, status: edited ? 'user_edited' : 'user_confirmed' }], provenance);
    saveBtn.disabled = true;
    saveBtn.textContent = '✓ ' + t(lang, 'earnings.saved');
    toast(t(lang, 'earnings.saved'));
  });
  discardBtn.addEventListener('click', () => {
    card$.remove();
    toast(t(lang, 'earnings.discarded'));
  });
  disputeBtn.addEventListener('click', () => {
    const current = collect();
    navigate('grievance', {
      handoff: {
        date: current.date,
        platform: current.platform,
        orders: current.orders,
        amount_issue: {
          gross: current.gross,
          incentives: current.incentives,
          deductions: current.deductions,
          expenses: current.expenses,
          net: current.net,
        },
        reason: entry.flag || current.notes || 'Earnings dispute',
      },
    });
  });

  return card$;
}

/** @param {string[]} issues */
function flaggedKeys(issues) {
  const s = new Set();
  for (const i of issues) {
    if (i.startsWith('orders_')) s.add('orders');
    if (i.startsWith('gross_')) s.add('gross');
    if (i === 'net_mismatch') s.add('net');
    if (i.startsWith('expenses_')) s.add('expenses');
    if (i === 'future_date') s.add('date');
  }
  return s;
}

/** @param {string} issue @param {string} lang */
function flagLabel(issue, lang) {
  const map = {
    net_mismatch: t(lang, 'earnings.flag.netMismatch'),
    future_date: t(lang, 'earnings.flag.futureDate'),
    gross_not_in_text: t(lang, 'earnings.flag.grossNotInText'),
    orders_out_of_range: t(lang, 'earnings.flag.ordersRange'),
  };
  return map[issue] || issue;
}

/**
/** @param {string} k @param {string} v @param {boolean} [strong] */
function kv(k, v, strong) {
  return el('div', { class: 'kv-row' }, [
    el('div', { class: 'kv-k' }, k),
    el('div', { class: 'kv-v' + (strong ? ' kv-strong' : '') }, v),
  ]);
}

/** @param {number|undefined} n */
function inr(n) {
  const v = Number.isFinite(n) ? Number(n) : 0;
  return '₹' + v.toLocaleString('en-IN');
}

/**
 * @param {string} lang
 * @param {(mode:string, opts?:any) => void} _navigate
 */
function renderLedger(lang, _navigate) {
  const ledger = store.get().ledger;
  if (!ledger.length) {
    return card({
      title: t(lang, 'earnings.ledgerTitle'),
      children: [el('p', { class: 'muted' }, t(lang, 'earnings.ledgerEmpty'))],
    });
  }
  const week = weekTotals(ledger);
  return card({
    title: t(lang, 'earnings.ledgerTitle'),
    subtitle: t(lang, 'earnings.weekSoFar'),
    children: [
      el('div', { class: 'kv' }, [
        kv(t(lang, 'earnings.col.orders'), String(week.orders)),
        kv(t(lang, 'earnings.col.gross'), inr(week.gross)),
        kv(t(lang, 'earnings.col.expenses'), inr(week.expenses)),
        kv(t(lang, 'earnings.col.net'), inr(week.net), true),
      ]),
    ],
  });
}

/** @param {any[]} ledger */
function weekTotals(ledger) {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const since = start.getTime();
  let orders = 0;
  let gross = 0;
  let expenses = 0;
  let net = 0;
  for (const e of ledger) {
    const d = parseDate(e.date);
    if (d && d < since) continue;
    orders += Number(e.orders) || 0;
    gross += Number(e.gross) || 0;
    expenses += Number(e.expenses) || 0;
    net += Number(e.net) || 0;
  }
  return { orders, gross, expenses, net };
}

/** @param {string} s */
function parseDate(s) {
  if (!s) return 0;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  }
  // "today" / "yesterday" / unknown → treat as recent (keep in week totals)
  return Date.now();
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
