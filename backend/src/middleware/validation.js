// @ts-check
/**
 * @module backend/middleware/validation
 *
 * Zod-powered request validation middleware factory.
 * Validates body, query, or params against a Zod schema and returns
 * structured error responses on validation failure.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Creates an Express middleware that validates the specified request property
 * against a Zod schema. On success, replaces the raw value with the parsed
 * (coerced + defaulted) value. On failure, returns a 400 with structured errors.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} [target='body'] - Which request property to validate
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      /** @type {Record<string, string[]>} */
      const details = {};

      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        },
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Replace with parsed (coerced) value.
    // Express 5 makes req.query read-only, so for query params
    // we store parsed values under req.validatedQuery instead.
    if (target === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[target] = result.data;
    }
    next();
  };
}
