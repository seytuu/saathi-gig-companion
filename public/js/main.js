// @ts-check
import { getPublicConfig } from './api.js';
import { store } from './store.js';
import { applyI18n, t } from './i18n.js';
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
import { renderComingSoon } from './features/comingSoon.js';
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
    publicConfig = await getPublicConfig();
  } catch (e) {
    render(panel, errorBox('English', 'Could not load Saathi. ' + /** @type {Error} */ (e).message));
    return;
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
  tabs.select('home', false);
})();

/**
 * @param {string} mode
 * @param {any} [opts]
 */
function navigate(mode, opts) {
  current = { mode, opts };
  if (tabs) tabs.select(mode, false);
  rerender();
}

function rerender() {
  const lang = store.get().profile?.language || 'English';
  switch (current.mode) {
    case 'home':
      return renderHome(panel, navigate);
    case 'grievance':
      return renderGrievance(panel, { handoff: current.opts?.handoff });
    case 'schemes':
      return renderSchemes(panel, navigate);
    case 'document':
      return renderDocument(panel, { handoff: current.opts?.handoff });
    case 'earnings':
      return renderComingSoon(panel, lang, t(lang, 'tabs.earnings'));
    case 'safety':
      return renderComingSoon(panel, lang, t(lang, 'tabs.safety'));
    default:
      return renderHome(panel, navigate);
  }
}

// Expose a tiny API for cross-tab handoffs.
window.saathi = { navigate };
