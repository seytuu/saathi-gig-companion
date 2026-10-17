// @ts-check
import { el } from './dom.js';

/**
 * @param {{title?:string, subtitle?:string, actions?:HTMLElement[], children:(Node|string)[]}} opts
 */
export function card({ title, subtitle, actions, children }) {
  const kids = [];
  if (title) kids.push(el('h2', {}, title));
  if (subtitle) kids.push(el('p', { class: 'muted' }, subtitle));
  for (const c of children) kids.push(c);
  if (actions && actions.length) kids.push(el('div', { class: 'actions' }, actions));
  return el('section', { class: 'card' }, kids);
}
