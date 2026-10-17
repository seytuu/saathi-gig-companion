// @ts-check
import { el } from './dom.js';

/** @param {string[]} items */
export function bulletList(items) {
  return el(
    'ul',
    { class: 'list' },
    items.map((i) => el('li', {}, i))
  );
}
