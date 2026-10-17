// @ts-check
import { el } from './dom.js';

/**
 * @param {string[]} items
 * @param {{ onChange?: (idx:number, checked:boolean) => void }} [opts]
 */
export function checklist(items, opts = {}) {
  const lis = items.map((text, i) => {
    const box = el('input', { type: 'checkbox' });
    box.addEventListener('change', () =>
      opts.onChange?.(i, /** @type {HTMLInputElement} */ (box).checked)
    );
    const label = el('label', {}, [box, ' ', text]);
    return el('li', {}, [label]);
  });
  return el('ul', { class: 'checklist' }, lis);
}
