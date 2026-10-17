// @ts-check
import { getPublicConfig } from './api.js';
import { store, didResetOnLoad } from './store.js';
import { applyI18n } from './i18n.js';
import { toast } from './ui/toast.js';
import { el } from './ui/dom.js';
import { initTabs } from './tabs.js';
import {
  openProfileDialog,
  renderProfileChip,
  toggleSimpleMode,
  applySimpleModeAttr,
} from './features/profile.js';
import { renderGrievance } from './features/grievance.js';
import { renderHome } from './features/home.js';
import { renderSchemes } from './features/schemes.js';
import { renderDocument } from './features/document.js';
import { renderEarnings } from './features/earnings.js';
import { renderSafety } from './features/safety.js';
import { renderScam } from './features/scam.js';
import { renderNearby } from './features/nearby.js';
import { mountSos } from './features/sos.js';
import { errorBox } from './ui/error.js';
import { render } from './ui/dom.js';

const panel = /** @type {HTMLElement} */ (document.getElementById('panel'));
const tablist = /** @type {HTMLElement} */ (document.querySelector('.bottom-nav'));
const profileBtn = /** @type {HTMLButtonElement} */ (document.getElementById('profile-chip'));
const simpleBtn = /** @type {HTMLButtonElement} */ (document.getElementById('simple-chip'));

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
  try {
    publicConfig = await getPublicConfig();
  } catch (e) {
    render(panel, errorBox('English', 'Could not load Saathi. ' + /** @type {Error} */ (e).message));
    return;
  }

  if (didResetOnLoad) {
    toast('App updated — your old data was reset. Backup kept.', 4000);
  }

  const lang = store.get().profile?.language || 'English';
  applyI18n(document, lang);
  applySimpleModeAttr();
  renderProfileChip();

  tabs = initTabs(tablist, (mode) => navigate(mode));

  profileBtn.addEventListener('click', async () => {
    await openProfileDialog(publicConfig);
    const l = store.get().profile?.language || 'English';
    applyI18n(document, l);
    applySimpleModeAttr();
    renderProfileChip();
    rerender();
  });

  simpleBtn.addEventListener('click', () => {
    toggleSimpleMode();
    applySimpleModeAttr();
    renderProfileChip();
    rerender();
  });

  if (!store.get().profile) {
    await openProfileDialog(publicConfig);
    const l = store.get().profile?.language || 'English';
    applyI18n(document, l);
    applySimpleModeAttr();
    renderProfileChip();
  }

  store.subscribe(() => renderProfileChip());

  // Persistent SOS button, mounted once.
  mountSos(() => store.get().profile?.language || 'English');

  // ?action= query param routing (SOS, grievance, scam) for app shortcuts.
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  if (action === 'sos') {
    document.getElementById('sos-btn')?.click();
  } else if (['grievance', 'scam', 'earnings', 'safety', 'nearby'].includes(action || '')) {
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

function rerender() {
  switch (current.mode) {
    case 'home':
      return renderHome(panel, navigate, publicConfig);
    case 'grievance':
      return renderGrievance(panel, { handoff: current.opts?.handoff });
    case 'schemes':
      return renderSchemes(panel, navigate);
    case 'document':
      return renderDocument(panel, { handoff: current.opts?.handoff });
    case 'earnings':
      return renderEarnings(panel, navigate);
    case 'safety':
      return renderSafety(panel, navigate, publicConfig?.helplines || []);
    case 'scam':
      return renderScam(panel);
    case 'nearby':
      return renderNearby(panel);
    default:
      return renderHome(panel, navigate, publicConfig);
  }
}

window.saathi = { navigate };
