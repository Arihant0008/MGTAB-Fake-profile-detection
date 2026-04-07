// @ts-check
/**
 * @module backend/routes/history
 *
 * GET /api/v1/history      — paginated prediction history
 * GET /api/v1/history/:id  — single prediction by ID
 */

import { Router } from 'express';
import { historyQuerySchema } from '../schemas/index.js';
import { validate } from '../middleware/validation.js';
import { historyService } from '../services/history.service.js';

const router = Router();

/**
 * GET /api/v1/history
 * Returns paginated prediction history.
 */
router.get(
  '/',
  validate(historyQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.validatedQuery;

      const result = await historyService.getHistory(page, pageSize);

      res.json({
        entries: result.entries,
        total: result.total,
        page,
        pageSize,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/history/:id
 * Returns a single prediction by ID.
 */
router.get(
  '/:id',
  async (req, res, next) => {
    try {
      const entry = await historyService.getById(req.params.id);

      if (!entry) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Prediction ${req.params.id} not found`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json(entry);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
