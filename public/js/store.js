// @ts-check

/**
 * Versioned localStorage store for the worker record. All features
 * read/write through here; every action can append to the timeline.
 *
 * Load is bulletproof: any parse/migration failure backs the raw blob up
 * to `saathi_backup_<ts>` and starts fresh, so returning users never see
 * a blank screen when the schema moves forward.
 */

const KEY = 'saathi.v1';
const CURRENT_VERSION = 1;

/** @typedef {{ version:number, profile:import('../../src/types.js').WorkerProfile|null, ledger:any[], schemes:any[], documents:any[], grievances:any[], timeline:any[] }} State */

/** @returns {State} */
function fresh() {
  return {
    version: CURRENT_VERSION,
    profile: null,
    ledger: [],
    schemes: [],
    documents: [],
    grievances: [],
    timeline: [],
  };
}

/**
 * Migrate an arbitrary raw payload to the current State shape. Enforces
 * every top-level field so code downstream never sees unexpected types.
 * @param {any} raw
 * @returns {State}
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return fresh();
  const base = fresh();
  const next = { ...base };
  if (typeof raw.profile === 'object' && raw.profile !== null) {
    next.profile = /** @type {any} */ (raw.profile);
  }
  for (const k of ['ledger', 'schemes', 'documents', 'grievances', 'timeline']) {
    next[k] = Array.isArray(raw[k]) ? raw[k] : base[k];
  }
  next.version = CURRENT_VERSION;
  return next;
}

/**
 * Try to load state; on any failure back up the raw blob and reset.
 * @returns {{state: State, reset: boolean}}
 */
function safeLoad() {
  // When imported from Node (tests), there's no localStorage.
  if (typeof localStorage === 'undefined') return { state: fresh(), reset: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: fresh(), reset: false };
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    // Only treat as "reset" if version mismatched or shape fundamentally bad.
    const needsReset = !parsed || typeof parsed !== 'object' || parsed.version !== CURRENT_VERSION;
    if (needsReset) {
      try {
        localStorage.setItem('saathi_backup_' + Date.now(), raw);
      } catch {
        /* storage full or forbidden — give up on backup */
      }
    }
    return { state: migrated, reset: needsReset };
  } catch (err) {
    try {
      const raw = localStorage.getItem(KEY) || '';
      if (raw) localStorage.setItem('saathi_backup_' + Date.now(), raw);
    } catch {
      /* ignore */
    }
    console.warn('store: load failed, resetting', err);
    return { state: fresh(), reset: true };
  }
}

const loaded = safeLoad();
/** @type {State} */
let state = loaded.state;
/** True if we had to drop stale data on load — UI shows a toast. */
export const didResetOnLoad = loaded.reset;

/** @type {Set<(s: State) => void>} */
const subs = new Set();

const CAPS = Object.freeze({ ledger: 1000, grievances: 200, documents: 100, timeline: 200 });
const PERSIST_DEBOUNCE_MS = 300;

function enforceCaps(s) {
  // Cap newest-first by convention (ledger/grievances/documents are
  // appended; timeline is prepended). Slice preserves recency.
  return {
    ...s,
    ledger: s.ledger.length > CAPS.ledger ? s.ledger.slice(-CAPS.ledger) : s.ledger,
    grievances: s.grievances.length > CAPS.grievances ? s.grievances.slice(-CAPS.grievances) : s.grievances,
    documents: s.documents.length > CAPS.documents ? s.documents.slice(-CAPS.documents) : s.documents,
    timeline: s.timeline.length > CAPS.timeline ? s.timeline.slice(0, CAPS.timeline) : s.timeline,
  };
}

let pendingPersist = 0;
function doPersist() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('store persist failed', e);
    }
  }
  pendingPersist = 0;
}

function persist() {
  state = enforceCaps(state);
  subs.forEach((fn) => fn(state));
  if (typeof localStorage === 'undefined') return;
  if (pendingPersist) return;
  pendingPersist = /** @type {any} */ (setTimeout(doPersist, PERSIST_DEBOUNCE_MS));
}

/** Flush any debounced write immediately — on visibilitychange / pagehide. */
export function flushStore() {
  if (pendingPersist) {
    clearTimeout(pendingPersist);
    pendingPersist = 0;
    doPersist();
  }
}

if (typeof document !== 'undefined') {
  const flushOnLeave = () => flushStore();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnLeave();
  });
  window.addEventListener('pagehide', flushOnLeave);
  window.addEventListener('beforeunload', flushOnLeave);
}

export const store = {
  /** @returns {State} */
  get() {
    return state;
  },
  /** @param {(s: State) => void} fn */
  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  /** @param {Partial<State>} patch */
  set(patch) {
    state = { ...state, ...patch };
    persist();
  },
  /** @param {import('../../src/types.js').WorkerProfile} profile */
  setProfile(profile) {
    state = { ...state, profile };
    this.log({ kind: 'profile_saved' });
  },
  /**
   * @param {any[]} entries
   * @param {{source?:string, rawInput?:string, model?:string, transcript?:string}} [provenance]
   */
  addLedger(entries, provenance = {}) {
    const stamped = entries.map((e) => ({
      ...e,
      id: cryptoId(),
      status: e.status || 'user_confirmed',
      createdAt: Date.now(),
      provenance,
    }));
    state = { ...state, ledger: [...state.ledger, ...stamped] };
    this.log({ kind: 'ledger_added', count: entries.length });
    return stamped;
  },
  /**
   * @param {string} id
   * @param {any} patch
   */
  updateLedgerEntry(id, patch) {
    state = {
      ...state,
      ledger: state.ledger.map((e) =>
        e.id === id
          ? { ...e, ...patch, status: 'user_edited', originalValue: e.originalValue || { ...e } }
          : e
      ),
    };
    persist();
  },
  /** @param {string} id */
  removeLedgerEntry(id) {
    state = { ...state, ledger: state.ledger.filter((e) => e.id !== id) };
    persist();
  },
  /** @param {any} scheme */
  saveScheme(scheme) {
    state = { ...state, schemes: [...state.schemes, { ...scheme, savedAt: Date.now() }] };
    this.log({ kind: 'scheme_saved', name: scheme.name });
  },
  /**
   * Save a document's extracted result. Never store the raw file (base64
   * image/PDF) — only the AI result + a short metadata record.
   * @param {any} doc
   */
  addDocument(doc) {
    const clean = { ...doc };
    // Belt-and-braces: strip any inline binary a caller might include.
    delete clean.data;
    delete clean.base64;
    delete clean.mediaBase64;
    state = { ...state, documents: [...state.documents, { ...clean, addedAt: Date.now() }] };
    this.log({ kind: 'document_added' });
  },
  /** @param {any} g */
  addGrievance(g) {
    const entry = { id: cryptoId(), status: 'open', createdAt: Date.now(), ...g };
    state = { ...state, grievances: [...state.grievances, entry] };
    this.log({ kind: 'grievance_created', subject: entry.subject });
    return entry;
  },
  /**
   * @param {string} id
   * @param {Partial<{status:string}>} patch
   */
  updateGrievance(id, patch) {
    state = {
      ...state,
      grievances: state.grievances.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    };
    this.log({ kind: 'grievance_updated', id });
  },
  /** @param {{kind:string, [k:string]: unknown}} event */
  log(event) {
    state = {
      ...state,
      timeline: [{ at: Date.now(), ...event }, ...state.timeline].slice(0, 200),
    };
    persist();
  },
  /** @returns {string} serialised state JSON */
  exportJson() {
    return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  },
  /** @param {string} json @returns {boolean} */
  importJson(json) {
    try {
      const raw = JSON.parse(json);
      if (!raw || typeof raw !== 'object') return false;
      state = migrate(raw);
      persist();
      return true;
    } catch {
      return false;
    }
  },
  /** Nuke every saathi key — used by the error-boundary "Reset app". */
  reset() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k === KEY || k.startsWith('saathi'))) localStorage.removeItem(k);
    }
    state = fresh();
    subs.forEach((fn) => fn(state));
  },
};

function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return 'g_' + Math.random().toString(36).slice(2, 10);
  }
}
