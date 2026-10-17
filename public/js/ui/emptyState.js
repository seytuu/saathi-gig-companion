// @ts-check
import { el } from './dom.js';

/** @param {string} msg */
export function emptyState(msg) {
  return el('div', { class: 'empty' }, msg);
}
