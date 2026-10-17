// @ts-check

/**
 * Versioned localStorage store for the worker record. All features
 * read/write through here; every action can append to the timeline.
 *
 * Shape:
 *   { version, profile?, ledger[], schemes[], documents[], grievances[], timeline[] }
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

/** @param {any} raw @returns {State} */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return fresh();
  if (raw.version === CURRENT_VERSION) return { ...fresh(), ...raw };
  // Future migrations go here, e.g. v1 → v2.
  return { ...fresh(), ...raw, version: CURRENT_VERSION };
}

/** @type {State} */
let state;
try {
  state = migrate(JSON.parse(localStorage.getItem(KEY) || 'null'));
} catch {
  state = fresh();
}

/** @type {Set<(s: State) => void>} */
const subs = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('store persist failed', e);
  }
  subs.forEach((fn) => fn(state));
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
  /** @returns {string} serialised state JSON */
  exportJson() {
    return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  },
  /**
   * Restore from a validated JSON payload.
   * @param {string} json
   * @returns {boolean}
   */
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
  /** @param {any} scheme */
  saveScheme(scheme) {
    state = { ...state, schemes: [...state.schemes, { ...scheme, savedAt: Date.now() }] };
    this.log({ kind: 'scheme_saved', name: scheme.name });
  },
  /** @param {any} doc */
  addDocument(doc) {
    state = { ...state, documents: [...state.documents, { ...doc, addedAt: Date.now() }] };
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
  reset() {
    state = fresh();
    persist();
  },
};

function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return 'g_' + Math.random().toString(36).slice(2, 10);
  }
}
