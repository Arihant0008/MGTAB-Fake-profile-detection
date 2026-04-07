// @ts-check
/**
 * @module backend/middleware/rate-limit
 *
 * Rate limiting configuration for API endpoints.
 * Uses express-rate-limit with configurable windows and limits.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../utils/config.js';

/**
 * General API rate limiter.
 * Applies to all /api/* routes.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Please try again after ${Math.round(config.rateLimitWindowMs / 60000)} minutes.`,
    },
    timestamp: new Date().toISOString(),
  },
});

/**
 * Stricter rate limiter for the /predict endpoint.
 * Inference is CPU-intensive, so we limit more aggressively.
 */
export const predictLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30,          // 30 predictions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many prediction requests. Maximum 30 per minute.',
    },
    timestamp: new Date().toISOString(),
  },
});
