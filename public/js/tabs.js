// @ts-check

/**
 * ARIA tablist with arrow-key navigation. Calls onSelect(mode) when a
 * tab is activated.
 *
 * @param {HTMLElement} tablist
 * @param {(mode: string) => void} onSelect
 */
export function initTabs(tablist, onSelect) {
  const tabs = /** @type {HTMLButtonElement[]} */ (
    Array.from(tablist.querySelectorAll('[role="tab"]'))
  );

  function select(mode, focus = true) {
    for (const t of tabs) {
      const match = t.dataset.mode === mode;
      t.setAttribute('aria-selected', match ? 'true' : 'false');
      t.tabIndex = match ? 0 : -1;
      if (match && focus) t.focus();
    }
    onSelect(mode);
  }

  tablist.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target).closest('[role="tab"]');
    if (target instanceof HTMLButtonElement && target.dataset.mode) select(target.dataset.mode, false);
  });

  tablist.addEventListener('keydown', (e) => {
    const idx = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    select(tabs[next].dataset.mode || 'home', true);
  });

  return { select };
}
