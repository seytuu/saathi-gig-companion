// @ts-check

/**
 * Tiny DOM helper. Keeps all text as textContent so AI output cannot
 * inject HTML. Element and attribute names are developer-controlled.
 *
 * Usage: el('div', { class: 'card' }, [ el('h2', {}, 'Title'), 'body' ])
 *
 * @param {string} tag
 * @param {Record<string, string|boolean|number|((e:Event)=>void)>} [attrs]
 * @param {(Node|string|null|undefined|false|(Node|string|null|undefined|false)[])} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
      continue;
    }
    if (k === 'class') node.className = String(v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, String(v));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Replace all children of root with the given nodes. */
export function render(root, ...nodes) {
  root.replaceChildren(...nodes);
}
