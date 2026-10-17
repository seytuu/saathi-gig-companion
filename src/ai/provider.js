// @ts-check

/**
 * Generic AI provider interface. Modes depend on this, never on a specific
 * SDK. Swap `gemini.js` for another implementation without touching modes.
 *
 * @typedef {Object} GenerateJsonArgs
 * @property {string} system
 * @property {string} user
 * @property {import('../types.js').MediaPart[]} [media]
 * @property {object} schema
 *
 * @typedef {Object} AIProvider
 * @property {(args: GenerateJsonArgs) => Promise<unknown>} generateJson
 */

export {};
