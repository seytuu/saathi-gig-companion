// @ts-check
import { el } from './dom.js';

let currentTimer = 0;

/** @param {string} msg @param {number} [ms] */
export function toast(msg, ms = 2200) {
  const old = document.getElementById('saathi-toast');
  if (old) old.remove();
  const node = el('div', { id: 'saathi-toast', class: 'toast', role: 'status' }, msg);
  document.body.appendChild(node);
  if (currentTimer) clearTimeout(currentTimer);
  currentTimer = window.setTimeout(() => node.remove(), ms);
}
