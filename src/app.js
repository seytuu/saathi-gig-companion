// @ts-check
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';

import { config } from './config.js';
import { cspDirectives } from './security.js';
import { AppError, errorMiddleware } from './errors.js';
import { logger } from './utils/logger.js';
import { validateAgentRequest } from './validation.js';
import { getMode, listModes } from './modes/index.js';
import { createGeminiProvider } from './ai/gemini.js';
import { nearby } from './routes/nearby.js';
import { conditions } from './routes/conditions.js';
import { capture } from './routes/capture.js';

/**
 * Build the Express app. Pure factory — nothing above the function body
 * does I/O or throws, so importing this module is safe even without env
 * vars set (Vercel inspects the module at build time).
 */
export function buildApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: cspDirectives,
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', config.permissionsPolicy);
    next();
  });

  app.use(express.json({ limit: config.limits.jsonBodyMb }));

  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir, { maxAge: 300_000 }));

  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(AppError.rateLimited()),
  });
  app.use('/api/', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      modes: listModes(),
      model: config.gemini.model,
      geminiKey: config.gemini.apiKey ? 'set' : 'missing',
    });
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      modes: config.modes,
      languages: config.languages,
      workTypes: config.workTypes,
      platforms: config.platforms,
      helplines: config.helplines,
      limits: {
        maxTextChars: config.limits.maxTextChars,
        maxMediaParts: config.limits.maxMediaParts,
        maxMediaBytes: config.limits.maxMediaBytes,
      },
    });
  });

  app.get('/api/nearby', async (req, res, next) => {
    try {
      await nearby(req, res);
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/conditions', async (req, res, next) => {
    try {
      await conditions(req, res);
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/capture', async (req, res, next) => {
    try {
      if (!config.gemini.apiKey) {
        return res.status(503).json({ error: 'Saathi is being set up. Please try again shortly.', code: 'misconfigured' });
      }
      await capture(req, res);
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/agent', async (req, res, next) => {
    try {
      // Validate shape first so bad clients always get 400, regardless of key state.
      const parsed = validateAgentRequest(req.body);
      const mode = getMode(parsed.mode);
      if (!mode) throw AppError.notFound('mode');
      if (!config.gemini.apiKey) {
        logger.warn('agent_misconfigured_503', {});
        return res.status(503).json({ error: 'Saathi is being set up. Please try again shortly.', code: 'misconfigured' });
      }
      logger.info('agent_request', {
        mode: parsed.mode,
        lang: parsed.profile.language,
        mediaCount: parsed.media.length,
      });
      const provider = createGeminiProvider();
      const result = await mode.run(parsed, provider);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // SPA fallback for non-API GETs.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile('index.html', { root: publicDir });
  });

  app.use(errorMiddleware);

  return app;
}

// Default export: a built app. Vercel's Express auto-detection requires a
// default export that is a function (an Express app IS a function).
// api/index.js re-exports this same instance — do not call buildApp() twice.
if (!config.gemini.apiKey) {
  logger.warn('startup_missing_gemini_key', { note: 'Set GEMINI_API_KEY in environment' });
}
const app = buildApp();
export default app;
