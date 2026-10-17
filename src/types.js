// @ts-check

/**
 * @typedef {Object} WorkerProfile
 * @property {string} name
 * @property {'delivery'|'driver'|'daily-wage'|'domestic'|'other'} workType
 * @property {string} platform
 * @property {string} city
 * @property {string} state
 * @property {string} language   // one of config.languages
 */

/**
 * @typedef {Object} MediaPart
 * @property {string} mimeType
 * @property {string} data   // base64, no data: prefix
 */

/**
 * @typedef {Object} AgentRequest
 * @property {string} mode
 * @property {string} input
 * @property {WorkerProfile} profile
 * @property {MediaPart[]} [media]
 * @property {Record<string, unknown>} [context]   // optional handoff context
 */

/**
 * @typedef {Object} ModeContext
 * @property {string} input
 * @property {WorkerProfile} profile
 * @property {MediaPart[]} media
 * @property {Record<string, unknown>} context
 */

/**
 * @typedef {Object} Mode
 * @property {string} name
 * @property {(ctx: ModeContext) => string} buildPrompt
 * @property {object} schema                              // Gemini responseSchema
 * @property {(ctx: ModeContext, provider: import('./ai/provider.js').AIProvider) => Promise<unknown>} run
 */

export {};
