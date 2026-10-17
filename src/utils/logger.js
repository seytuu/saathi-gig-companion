// @ts-check

/**
 * Minimal structured logger. In production, writes single-line JSON so Vercel
 * logs stay parseable; in dev, pretty prints.
 */
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

/**
 * @param {'info'|'warn'|'error'} level
 * @param {string} event
 * @param {Record<string, unknown>} [meta]
 */
function emit(level, event, meta) {
  const payload = { level, event, ts: new Date().toISOString(), ...meta };
  const line = isDev ? `[${level}] ${event} ${meta ? JSON.stringify(meta) : ''}` : JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event, meta) => emit('info', event, meta),
  warn: (event, meta) => emit('warn', event, meta),
  error: (event, meta) => emit('error', event, meta),
};
