// @ts-check
import { store } from '../store.js';
import { applyI18n, t } from '../i18n.js';

/**
 * Open the profile dialog. If no profile exists yet, forces completion.
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
  } else {
    form.name.value = '';
    form.city.value = '';
    form.state.value = '';
  }

  applyI18n(dialog, current?.language || 'English');

  return new Promise((resolve) => {
    const skipBtn = /** @type {HTMLButtonElement|null} */ (
      document.getElementById('onboarding-skip')
    );
    const finish = (profile) => {
      store.setProfile(profile);
      form.removeEventListener('submit', onSubmit);
      skipBtn?.removeEventListener('click', onSkip);
      dialog.close();
      resolve(profile);
    };
    const build = () => {
      const data = new FormData(form);
      return {
        name: String(data.get('name') || '').trim() || 'Saathi',
        workType: /** @type {any} */ (String(data.get('workType') || 'delivery') || 'delivery'),
        platform: String(data.get('platform') || 'Other').trim() || 'Other',
        city: String(data.get('city') || '-').trim() || '-',
        state: String(data.get('state') || '-').trim() || '-',
        language: String(data.get('language') || 'English') || 'English',
      };
    };
    const onSubmit = (e) => {
      e.preventDefault();
      finish(build());
    };
    const onSkip = () => finish(build());
    form.addEventListener('submit', onSubmit);
    skipBtn?.addEventListener('click', onSkip);
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
