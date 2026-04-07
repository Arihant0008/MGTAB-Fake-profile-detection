// @ts-check
/**
 * @module backend/utils/logger
 *
 * Structured logger using Pino.
 * All application logging routes through this module.
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: 'mgtab-backend',
    version: '1.0.0',
  },
});

export default logger;
