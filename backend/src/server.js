// @ts-check
/**
 * @module backend/server
 *
 * Application entry point.
 * Starts the Express server, initializes the inference process,
 * seeds demo data, and handles graceful shutdown.
 */

import app from './app.js';
import { config } from './utils/config.js';
import logger from './utils/logger.js';
import { inferenceService } from './services/inference.service.js';
import { historyService } from './services/history.service.js';

async function main() {
  logger.info('='.repeat(60));
  logger.info('🤖 MGTAB Detector API — Starting...');
  logger.info('='.repeat(60));
  logger.info({ env: config.nodeEnv, port: config.port }, 'Configuration loaded');

  // 1. Start inference subprocess
  try {
    await inferenceService.start();
    logger.info('✅ Inference service ready');
  } catch (err) {
    logger.warn(
      { err },
      '⚠️  Inference service failed to start. API will run in degraded mode. ' +
      'Run train_mlp_v1.py to generate the model first.'
    );
  }

  // 2. Seed demo data (dev only)
  if (config.nodeEnv === 'development') {
    await historyService.seedDemoData();
  }

  // 3. Start HTTP server
  const server = app.listen(config.port, () => {
    logger.info(`🚀 API server running at http://localhost:${config.port}`);
    logger.info(`📋 Model info: http://localhost:${config.port}/api/v1/model/info`);
    logger.info(`❤️  Health: http://localhost:${config.port}/api/v1/model/health`);
  });

  // 4. Graceful shutdown
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down gracefully...');

    server.close(() => {
      logger.info('HTTP server closed');
    });

    await inferenceService.stop();
    logger.info('All services stopped. Goodbye.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
