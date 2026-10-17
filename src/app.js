// @ts-check
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config.js';
import { cspDirectives } from './security.js';
import { AppError, errorMiddleware } from './errors.js';
import { logger } from './utils/logger.js';
import { validateAgentRequest } from './validation.js';
import { getMode, listModes } from './modes/index.js';
import { createGeminiProvider } from './ai/gemini.js';

const provider = createGeminiProvider();

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
  app.use(express.static('public', { maxAge: 300_000 }));

  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(AppError.rateLimited()),
  });
  app.use('/api/', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, modes: listModes(), model: config.gemini.model });
  });

  app.get('/api/config', (_req, res) => {
    // Public, non-secret config for the client.
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

  app.post('/api/agent', async (req, res, next) => {
    try {
      const parsed = validateAgentRequest(req.body);
      const mode = getMode(parsed.mode);
      if (!mode) throw AppError.notFound('mode');
      logger.info('agent_request', { mode: parsed.mode, lang: parsed.profile.language, mediaCount: parsed.media.length });
      const result = await mode.run(parsed, provider);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // SPA fallback for non-API GET: serve index.html.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile('index.html', { root: 'public' });
  });

  app.use(errorMiddleware);

  return app;
}
