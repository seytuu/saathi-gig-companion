// @ts-check
import app from './src/app.js';
import { config } from './src/config.js';
import { logger } from './src/utils/logger.js';

app.listen(config.port, () => {
  logger.info('server_started', { port: config.port, model: config.gemini.model });
  console.log(`Saathi running on http://localhost:${config.port}`);
});
