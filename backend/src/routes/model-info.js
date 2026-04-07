// @ts-check
/**
 * @module backend/routes/model-info
 *
 * GET /api/v1/model/info  — model metadata and capabilities
 * GET /api/v1/model/health — health check for all services
 */

import { Router } from 'express';
import { inferenceService } from '../services/inference.service.js';
import { config } from '../utils/config.js';

const router = Router();

const startTime = Date.now();

/**
 * GET /api/v1/model/info
 * Returns metadata about the loaded model and system capabilities.
 */
router.get('/info', (_req, res) => {
  res.json({
    name: 'MGTAB Detector MLP V1',
    version: '1.0.0',
    type: 'MLP',
    featureCount: 788,
    numPropertyFeatures: 20,
    embeddingDim: 768,
    trainingDataset: 'MGTAB',
    architecture: '788 → 256 → 128 → 2',
    description:
      'Feature-only MLP classifier trained on MGTAB dataset. ' +
      'Phase 2 will upgrade to full RGCN with graph structure.',
    capabilities: {
      featureOnlyInference: true,
      graphInference: config.featureFlags.enableFullGnn,
      tweetEmbedding: config.featureFlags.enableLabse,
      twitterApiFetch: false,
    },
  });
});

/**
 * GET /api/v1/model/health
 * Health check endpoint for monitoring and load balancers.
 */
router.get('/health', (_req, res) => {
  const isInferenceReady = inferenceService.ready;

  const status = isInferenceReady ? 'healthy' : 'degraded';
  const httpStatus = isInferenceReady ? 200 : 503;

  res.status(httpStatus).json({
    status,
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services: {
      api: 'up',
      inference: isInferenceReady ? 'up' : 'down',
      database: config.featureFlags.enableMongodb ? 'up' : 'disabled',
    },
  });
});

export default router;
