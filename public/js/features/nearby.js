// @ts-check
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { loading } from '../ui/loading.js';
import { errorBox } from '../ui/error.js';

const CATEGORIES = [
  { key: 'toilet', icon: '🚻', label: 'Toilet' },
  { key: 'hospital', icon: '🏥', label: 'Hospital' },
  { key: 'police', icon: '🚔', label: 'Police' },
  { key: 'pharmacy', icon: '💊', label: 'Pharmacy' },
  { key: 'petrol', icon: '⛽', label: 'Petrol' },
  { key: 'ev', icon: '🔌', label: 'EV charging' },
  { key: 'atm', icon: '🏧', label: 'ATM' },
];

/** @param {HTMLElement} panel */
export function renderNearby(panel) {
  const profile = store.get().profile;
  if (!profile) {
    render(panel, errorBox('English', 'Please complete your profile first.'));
    return;
  }
  const lang = profile.language;

  const resultHost = el('div', {});
  const tiles = el(
    'div',
    { class: 'tiles' },
    CATEGORIES.map((c) => {
      const b = el('button', { type: 'button', class: 'tile' }, [
        el('span', { class: 'tile-icon', 'aria-hidden': 'true' }, c.icon),
        el('span', { class: 'tile-label' }, t(lang, 'nearby.' + c.key) || c.label),
      ]);
      b.addEventListener('click', () => fetchAndRender(c.key, resultHost, lang));
      return b;
    })
  );

  render(
    panel,
    card({
      title: t(lang, 'nearby.title'),
      subtitle: t(lang, 'nearby.pickOne'),
      children: [tiles],
    }),
    resultHost
  );
}

/**
 * @param {string} cat
 * @param {HTMLElement} host
 * @param {string} lang
 */
function fetchAndRender(cat, host, lang) {
  render(host, loading(lang));
  if (!('geolocation' in navigator)) {
    render(host, errorBox(lang, t(lang, 'nearby.noGeo')));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const r = await fetch(`/api/nearby?category=${encodeURIComponent(cat)}&lat=${lat}&lng=${lng}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Request failed');
        renderList(host, data, lang, cat, lat, lng);
      } catch (e) {
        render(host, errorBox(lang, /** @type {Error} */ (e).message));
      }
    },
    () => render(host, errorBox(lang, t(lang, 'nearby.needPerm'))),
    { enableHighAccuracy: true, timeout: 10_000 }
  );
}

/** @param {HTMLElement} host @param {any} data @param {string} lang @param {string} cat @param {number} lat @param {number} lng */
function renderList(host, data, lang, cat, lat, lng) {
  const items = data.places || [];
  if (!items.length) {
    const link = el(
      'a',
      { href: data.fallback || `https://www.google.com/maps/search/${cat}/@${lat},${lng},14z`, class: 'btn primary', target: '_blank', rel: 'noopener noreferrer' },
      t(lang, 'nearby.openMaps')
    );
    render(
      host,
      card({ title: t(lang, 'nearby.none'), children: [el('p', { class: 'muted' }, t(lang, 'nearby.openMapsHelp'))], actions: [link] })
    );
    return;
  }
  const cards = items.slice(0, 6).map((p) =>
    card({
      title: p.name,
      subtitle: p.address,
      children: [
        el(
          'p',
          { class: 'muted' },
          [
            typeof p.rating === 'number' ? '⭐ ' + p.rating + '  ' : '',
            p.openNow === true ? '🟢 Open  ' : p.openNow === false ? '🔴 Closed  ' : '',
          ].join('')
        ),
      ],
      actions: [
        el(
          'a',
          {
            href: p.mapsUri || `https://www.google.com/maps/search/${encodeURIComponent(p.name + ' ' + p.address)}`,
            class: 'btn primary',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          t(lang, 'nearby.openMaps')
        ),
      ],
    })
  );
  render(host, ...cards);
}
