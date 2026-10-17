// @ts-check
import { logger } from './utils/logger.js';

/**
 * Application error with a safe user-facing message.
 * `message` is for logs only; `userMessage` is what we send to the client.
 */
export class AppError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   * @param {string} [userMessage]
   */
  constructor(code, status, message, userMessage) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.userMessage = userMessage || 'Something went wrong. Please try again.';
  }

  /** @param {string} field */
  static badRequest(field) {
    return new AppError('bad_request', 400, `Invalid request: ${field}`, 'Please check your input and try again.');
  }

  /** @param {string} what */
  static notFound(what) {
    return new AppError('not_found', 404, `Not found: ${what}`, 'That feature is not available.');
  }

  static rateLimited() {
    return new AppError('rate_limited', 429, 'Rate limit exceeded', 'Too many requests. Please wait a moment.');
  }

  /** @param {string} why */
  static upstream(why) {
    return new AppError('upstream_error', 502, `AI provider failed: ${why}`, 'The AI service is busy. Please try again.');
  }

  static timeout() {
    return new AppError('timeout', 504, 'Upstream timeout', 'The AI took too long. Please try again.');
  }

  static misconfigured() {
    return new AppError('misconfigured', 500, 'GEMINI_API_KEY not set', 'The service is not configured. Please contact support.');
  }
}

/**
 * Express error middleware. Sends generic message; logs internals.
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorMiddleware(err, _req, res, _next) {
  if (err instanceof AppError) {
    logger.warn('request_failed', { code: err.code, status: err.status, message: err.message });
    return res.status(err.status).json({ error: err.userMessage, code: err.code });
  }
  // Express body-parser etc. attach .status (e.g. 400 for malformed JSON).
  // Honor the status so clients see the right code; still hide the detail.
  const upstreamStatus = typeof err?.status === 'number' ? err.status : 500;
  logger.error('unhandled_error', { message: err?.message, stack: err?.stack, status: upstreamStatus });
  if (upstreamStatus >= 400 && upstreamStatus < 500) {
    return res.status(upstreamStatus).json({ error: 'Please check your input and try again.', code: 'bad_request' });
  }
  return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'internal' });
}
