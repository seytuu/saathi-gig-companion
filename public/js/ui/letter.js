// @ts-check
import { el } from './dom.js';
import { speak } from '../voice.js';

/**
 * @param {{ title:string, body:string, lang:string, listenLabel:string }} opts
 */
export function letterBlock({ title, body, lang, listenLabel }) {
  const listenBtn = el(
    'button',
    { type: 'button', class: 'ghost', 'aria-label': listenLabel },
    [el('span', { 'aria-hidden': 'true' }, '🔊'), ' ', listenLabel]
  );
  listenBtn.addEventListener('click', () => speak(body, lang));

  return el('div', {}, [
    el('h3', {}, title),
    el('div', { class: 'letter' }, body),
    el('div', { class: 'actions' }, [listenBtn]),
  ]);
}
