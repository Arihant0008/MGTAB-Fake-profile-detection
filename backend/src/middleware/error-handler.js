// @ts-check
/**
 * @module backend/middleware/error-handler
 *
 * Global error handler middleware — catches all unhandled errors
 * and returns structured JSON error responses.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/** Custom application error with status code. */
export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @param {Record<string, string[]>} [details]
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Global error handler — must be registered LAST in the middleware chain.
 * Catches both AppError (known) and unexpected errors (500).
 *
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, _req, res, _next) {
  const requestId = uuidv4();

  if (err instanceof AppError) {
    logger.warn({ err, requestId, code: err.code }, err.message);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unexpected error — log full stack, return generic message
  logger.error({ err, requestId }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
