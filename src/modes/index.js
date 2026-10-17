// @ts-check
import grievance from './grievance/index.js';
import schemes from './schemes/index.js';
import documentMode from './document/index.js';

/**
 * Mode registry. Adding a new feature = one folder + one line here.
 * @type {Map<string, import('../types.js').Mode>}
 */
const registry = new Map();

for (const mode of [grievance, schemes, documentMode]) {
  registry.set(mode.name, mode);
}

/** @param {string} name */
export function getMode(name) {
  return registry.get(name);
}

export function listModes() {
  return [...registry.keys()];
}
