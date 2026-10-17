// @ts-check
import { store } from '../store.js';
import { applyI18n, t } from '../i18n.js';

/**
 * Open the profile dialog. If no profile exists yet, forces completion.
 * Resolves with the saved profile.
 *
 * @param {{ workTypes:string[], platforms:string[], languages:string[] }} config
 * @returns {Promise<import('../../../src/types.js').WorkerProfile>}
 */
export function openProfileDialog(config) {
  const dialog = /** @type {HTMLDialogElement} */ (document.getElementById('onboarding'));
  const form = /** @type {HTMLFormElement} */ (document.getElementById('onboarding-form'));
  const current = store.get().profile;

  fillSelect(form.workType, config.workTypes, current?.workType);
  fillSelect(form.platform, config.platforms, current?.platform);
  fillSelect(form.language, config.languages, current?.language || 'Hinglish');

  if (current) {
    form.name.value = current.name;
    form.city.value = current.city;
    form.state.value = current.state;
  }

  // Re-apply i18n with the active language (if we have one yet).
  applyI18n(dialog, current?.language || 'English');

  return new Promise((resolve) => {
    const onSubmit = (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const profile = {
        name: String(data.get('name') || '').trim(),
        workType: /** @type {any} */ (String(data.get('workType') || '')),
        platform: String(data.get('platform') || '').trim(),
        city: String(data.get('city') || '').trim(),
        state: String(data.get('state') || '').trim(),
        language: String(data.get('language') || 'English'),
      };
      if (!profile.name || !profile.city || !profile.state) return;
      store.setProfile(profile);
      form.removeEventListener('submit', onSubmit);
      dialog.close();
      resolve(profile);
    };
    form.addEventListener('submit', onSubmit);
    dialog.showModal();
  });
}

export function renderProfileChip() {
  const chip = /** @type {HTMLButtonElement} */ (document.getElementById('profile-chip'));
  const p = store.get().profile;
  if (!p) {
    chip.hidden = true;
    return;
  }
  chip.hidden = false;
  chip.setAttribute('aria-label', t(p.language, 'profile.edit'));
  chip.textContent = `${p.name} • ${labelFor(p.workType)} • ${p.language}`;
}

function labelFor(workType) {
  switch (workType) {
    case 'delivery':
      return 'Delivery';
    case 'driver':
      return 'Driver';
    case 'daily-wage':
      return 'Daily wage';
    case 'domestic':
      return 'Domestic';
    default:
      return 'Worker';
  }
}

/**
 * @param {HTMLSelectElement} select
 * @param {string[]} options
 * @param {string} [selected]
 */
function fillSelect(select, options, selected) {
  select.replaceChildren();
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === selected) o.selected = true;
    select.appendChild(o);
  }
}
