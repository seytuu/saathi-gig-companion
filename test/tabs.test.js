// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initTabs } from '../public/js/tabs.js';

/**
 * Build a minimal tablist stub that tabs.js can walk without a real DOM.
 * Each "tab" exposes dataset + setAttribute + focus + tabIndex.
 * @param {string[]} modes
 */
function stubTablist(modes) {
  const tabs = modes.map((mode) => {
    /** @type {Record<string, any>} */
    const t = {
      dataset: { mode },
      tabIndex: -1,
      _attrs: /** @type {Record<string,string>} */ ({}),
      setAttribute(k, v) {
        this._attrs[k] = v;
      },
      getAttribute(k) {
        return this._attrs[k];
      },
      focus() {
        t._focused = (t._focused || 0) + 1;
      },
    };
    return t;
  });
  const list = {
    tabs,
    querySelectorAll() {
      return tabs;
    },
    addEventListener() {
      /* unused in these tests */
    },
  };
  return /** @type {any} */ (list);
}

test('select(mode) notifies onSelect exactly once', () => {
  const list = stubTablist(['home', 'earnings', 'safety']);
  let calls = 0;
  let last;
  const api = initTabs(list, (m) => {
    calls++;
    last = m;
  });
  api.select('safety', false);
  assert.equal(calls, 1);
  assert.equal(last, 'safety');
  // Visual state updated too.
  assert.equal(list.tabs[2].getAttribute('aria-selected'), 'true');
  assert.equal(list.tabs[0].getAttribute('aria-selected'), 'false');
});

test('select(mode, focus=false, notify=false) does NOT call onSelect (prevents recursion)', () => {
  const list = stubTablist(['home', 'earnings', 'safety']);
  let calls = 0;
  const api = initTabs(list, () => {
    calls++;
  });
  // UI-only update: no onSelect, so navigate()→tabs.select()→onSelect cannot loop.
  api.select('safety', false, false);
  assert.equal(calls, 0, 'notify=false must suppress onSelect');
  assert.equal(list.tabs[2].getAttribute('aria-selected'), 'true', 'UI still updated');
});

test('repeated select with notify=false stays silent; a notifying select then fires once', () => {
  const list = stubTablist(['home', 'earnings', 'safety']);
  let calls = 0;
  const api = initTabs(list, () => {
    calls++;
  });
  api.select('earnings', false, false);
  api.select('safety', false, false);
  api.select('home', false, false);
  assert.equal(calls, 0);
  api.select('earnings', false);
  assert.equal(calls, 1);
});
