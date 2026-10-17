// @ts-check
import { getPublicConfig } from './api.js';
import { store } from './store.js';
import { applyI18n, t } from './i18n.js';
import { initTabs } from './tabs.js';
import { openProfileDialog, renderProfileChip } from './features/profile.js';
import { renderGrievance } from './features/grievance.js';
import { renderHome } from './features/home.js';
import { renderComingSoon } from './features/comingSoon.js';
import { errorBox } from './ui/error.js';
import { render } from './ui/dom.js';

const panel = /** @type {HTMLElement} */ (document.getElementById('panel'));
const tablist = /** @type {HTMLElement} */ (document.querySelector('.tabs'));
const chip = /** @type {HTMLButtonElement} */ (document.getElementById('profile-chip'));

/** @type {{ mode: string, opts?: any }} */
let current = { mode: 'home' };
/** @type {any} */
let publicConfig = null;

(async function boot() {
  try {
    publicConfig = await getPublicConfig();
  } catch (e) {
    render(panel, errorBox('English', 'Could not load Saathi. ' + /** @type {Error} */ (e).message));
    return;
  }

  // Translate shell with the saved language (if any).
  const lang = store.get().profile?.language || 'English';
  applyI18n(document, lang);
  renderProfileChip();

  const tabs = initTabs(tablist, (mode) => navigate(mode));

  chip.addEventListener('click', async () => {
    await openProfileDialog(publicConfig);
    const l = store.get().profile?.language || 'English';
    applyI18n(document, l);
    renderProfileChip();
    rerender();
  });

  // Force onboarding on first launch.
  if (!store.get().profile) {
    await openProfileDialog(publicConfig);
    const l = store.get().profile?.language || 'English';
    applyI18n(document, l);
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
  rerender();
}

function rerender() {
  const lang = store.get().profile?.language || 'English';
  switch (current.mode) {
    case 'home':
      return renderHome(panel, navigate);
    case 'grievance':
      return renderGrievance(panel, { handoff: current.opts?.handoff });
    case 'earnings':
      return renderComingSoon(panel, lang, t(lang, 'tabs.earnings'));
    case 'safety':
      return renderComingSoon(panel, lang, t(lang, 'tabs.safety'));
    case 'schemes':
      return renderComingSoon(panel, lang, t(lang, 'tabs.schemes'));
    case 'document':
      return renderComingSoon(panel, lang, t(lang, 'tabs.document'));
    default:
      return renderHome(panel, navigate);
  }
}

// Expose a tiny API for feature-to-feature handoffs across tabs.
window.saathi = {
  navigate,
};
