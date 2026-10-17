// @ts-check
import { getPublicConfig } from './api.js';
import { inlineConfig } from './config.js';
import { store, didResetOnLoad } from './store.js';
import { applyI18n } from './i18n.js';
import { toast } from './ui/toast.js';
import { el } from './ui/dom.js';
import { initTabs } from './tabs.js';
import { openProfileDialog, renderProfileChip } from './features/profile.js';
import { renderHome } from './features/home.js';
import { mountSos } from './features/sos.js';
import { mountBoloFab, openBolo } from './features/bolo.js';
import { render } from './ui/dom.js';
import { loading } from './ui/loading.js';

/**
 * Lazy feature loader. Only Home, Profile, SOS and Bolo are in the
 * initial bundle; every other tab is fetched on first navigation.
 * @param {string} mode
 */
const featureCache = new Map();
function loadFeature(mode) {
  if (featureCache.has(mode)) return featureCache.get(mode);
  let p;
  switch (mode) {
    case 'grievance':
      p = import('./features/grievance.js').then((m) => m.renderGrievance);
      break;
    case 'schemes':
      p = import('./features/schemes.js').then((m) => m.renderSchemes);
      break;
    case 'document':
      p = import('./features/document.js').then((m) => m.renderDocument);
      break;
    case 'earnings':
      p = import('./features/earnings.js').then((m) => m.renderEarnings);
      break;
    case 'safety':
      p = import('./features/safety.js').then((m) => m.renderSafety);
      break;
    case 'scam':
      p = import('./features/scam.js').then((m) => m.renderScam);
      break;
    case 'nearby':
      p = import('./features/nearby.js').then((m) => m.renderNearby);
      break;
    default:
      p = Promise.resolve(null);
  }
  featureCache.set(mode, p);
  return p;
}

const panel = /** @type {HTMLElement} */ (document.getElementById('panel'));
const tablist = /** @type {HTMLElement} */ (document.querySelector('.bottom-nav'));
const profileBtn = /** @type {HTMLButtonElement} */ (document.getElementById('profile-chip'));
/** @type {{ mode: string, opts?: any }} */
let current = { mode: 'home' };
/** @type {any} */
let publicConfig = null;
let tabs;

(async function boot() {
  try {
    await bootInner();
  } catch (err) {
    renderBootError(err);
  }
})();

async function bootInner() {
  // Paint from the inline config instantly; refresh in the background.
  publicConfig = inlineConfig;
  getPublicConfig()
    .then((fresh) => {
      publicConfig = fresh;
    })
    .catch(() => {
      /* keep inline — never block UI on this */
    });

  if (didResetOnLoad) {
    toast('App updated — your old data was reset. Backup kept.', 4000);
  }

  const lang = store.get().profile?.language || 'English';
  applyI18n(document, lang);
  renderProfileChip();

  tabs = initTabs(tablist, (mode) => navigate(mode));

  profileBtn.addEventListener('click', async () => {
    await openProfileDialog(publicConfig);
    const l = store.get().profile?.language || 'English';
    applyI18n(document, l);
    renderProfileChip();
    rerender();
  });

  if (!store.get().profile) {
    await openProfileDialog(publicConfig);
    const l = store.get().profile?.language || 'English';
    applyI18n(document, l);
    renderProfileChip();
  }

  store.subscribe(() => renderProfileChip());

  // Persistent SOS button + Bolo FAB, mounted once.
  mountSos(() => store.get().profile?.language || 'English');
  mountBoloFab(navigate);

  // ?action= query param routing (SOS, grievance, scam, record) for app shortcuts.
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  if (action === 'sos') {
    document.getElementById('sos-btn')?.click();
  } else if (action === 'record') {
    openBolo(navigate);
  } else if (['grievance', 'scam', 'earnings', 'safety', 'nearby', 'schemes', 'document'].includes(action || '')) {
    navigate(action);
    return;
  }

  tabs.select('home', false);
}

/** Last-resort error boundary. If boot throws, show a friendly card. */
function renderBootError(err) {
  const message = err && err.message ? err.message : 'Unknown error';
  const resetBtn = el('button', { type: 'button', class: 'primary' }, 'Reset app');
  resetBtn.addEventListener('click', () => {
    try {
      store.reset();
    } catch {
      /* ignore */
    }
    location.reload();
  });
  const reloadBtn = el('button', { type: 'button', class: 'ghost' }, 'Reload');
  reloadBtn.addEventListener('click', () => location.reload());
  const node = el('section', { class: 'card' }, [
    el('h2', {}, 'Saathi could not start'),
    el('p', { class: 'muted' }, 'Something went wrong while loading your saved data.'),
    el('pre', { class: 'letter' }, String(message)),
    el('div', { class: 'actions' }, [resetBtn, reloadBtn]),
  ]);
  render(panel, node);
}

/**
 * @param {string} mode
 * @param {any} [opts]
 */
function navigate(mode, opts) {
  current = { mode, opts };
  if (tabs) tabs.select(mode, false, false);
  rerender();
}

async function rerender() {
  const lang = store.get().profile?.language || 'English';
  if (current.mode === 'home' || current.mode === 'default') {
    return renderHome(panel, navigate, publicConfig);
  }
  // Show a spinner while the feature chunk arrives.
  const requestedMode = current.mode;
  render(panel, loading(lang));
  const fn = await loadFeature(requestedMode);
  // Guard against the user navigating away before the chunk resolves.
  if (!fn || current.mode !== requestedMode) return;
  const handoff = current.opts?.handoff;
  switch (current.mode) {
    case 'grievance':
      return fn(panel, { handoff });
    case 'schemes':
      return fn(panel, navigate, handoff);
    case 'document':
      return fn(panel, { handoff });
    case 'earnings':
      return fn(panel, navigate, handoff);
    case 'safety':
      return fn(panel, navigate, publicConfig?.helplines || [], handoff);
    case 'scam':
      return fn(panel, handoff);
    case 'nearby':
      return fn(panel);
    default:
      return renderHome(panel, navigate, publicConfig);
  }
}

window.saathi = { navigate };
