// @ts-check
import { el } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { t } from '../i18n.js';

/**
 * Lightweight conditions card for Home. Takes a profile and renders
 * weather + AQI + localised tips via /api/conditions.
 *
 * @param {import('../../../src/types.js').WorkerProfile} profile
 * @returns {HTMLElement} card node that fills itself asynchronously
 */
export function renderConditionsCard(profile) {
  const lang = profile.language;
  const bodyHost = el('div', {}, [el('p', { class: 'muted' }, t(lang, 'conditions.loading'))]);
  const node = card({ title: '🌤 ' + t(lang, 'conditions.title'), children: [bodyHost] });

  loadConditions(profile)
    .then((data) => fill(bodyHost, data, lang))
    .catch((e) => {
      bodyHost.replaceChildren(el('p', { class: 'muted' }, /** @type {Error} */ (e).message));
    });

  return node;
}

/**
 * @param {import('../../../src/types.js').WorkerProfile} profile
 */
async function loadConditions(profile) {
  // Prefer live geolocation; fall back to city.
  const coords = await new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 300_000 }
    );
  });
  const q = coords
    ? `lat=${coords.lat}&lng=${coords.lng}`
    : `city=${encodeURIComponent(profile.city)}`;
  const r = await fetch('/api/conditions?' + q);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'conditions failed');
  return data;
}

/**
 * @param {HTMLElement} host
 * @param {any} data
 * @param {string} lang
 */
function fill(host, data, lang) {
  const w = data.weather || {};
  const air = data.air;
  const tips = data.tips || [];
  const headline = [
    typeof w.tempC === 'number' ? Math.round(w.tempC) + '°C' : '',
    w.description || '',
    air && typeof air.aqi === 'number' ? '• AQI ' + air.aqi : '',
  ]
    .filter(Boolean)
    .join(' ');
  const tipsHost = tips.length
    ? el(
        'ul',
        { class: 'list' },
        tips.map((text) => el('li', {}, text))
      )
    : el('p', { class: 'muted' }, t(lang, 'conditions.noTips'));

  host.replaceChildren(el('h3', { style: 'margin-bottom:6px' }, headline), tipsHost);
}
