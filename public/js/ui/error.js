// @ts-check
import { el } from './dom.js';
import { t } from '../i18n.js';

/** @param {string} lang @param {string} [msg] */
export function errorBox(lang, msg) {
  return el('div', { class: 'error', role: 'alert' }, msg || t(lang, 'generic.error'));
}
