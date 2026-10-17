// @ts-check
import { el } from './dom.js';
import { t } from '../i18n.js';

/** @param {string} lang @param {string} [label] */
export function loading(lang, label) {
  return el('div', { class: 'loading', role: 'status' }, [
    el('div', { class: 'spinner' }),
    el('span', {}, label || t(lang, 'generic.loading')),
  ]);
}
