// @ts-check
/**
 * @module backend/routes/predict
 *
 * POST /api/v1/predict
 *
 * Accepts 20 profile features + optional tweets, normalizes them,
 * runs inference via the Python subprocess, and returns a structured prediction.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { predictionRequestSchema } from '../schemas/index.js';
import { validate } from '../middleware/validation.js';
import { predictLimiter } from '../middleware/rate-limit.js';
import { inferenceService } from '../services/inference.service.js';
import { historyService } from '../services/history.service.js';
import { normalizePropertyFeatures, buildFeatureVector } from '../utils/normalization.js';
import logger from '../utils/logger.js';

// Feature metadata for human-readable importance output
/** @type {Record<string, string>} */
const FEATURE_DISPLAY_NAMES = {
  profile_use_background_image: 'Uses Background Image',
  default_profile: 'Default Profile',
  verified: 'Verified',
  followers_count: 'Followers Count',
  default_profile_image: 'Default Profile Image',
  listed_count: 'Listed Count',
  statuses_count: 'Statuses Count',
  friends_count: 'Friends Count',
  geo_enabled: 'Geo Enabled',
  favourites_count: 'Favourites Count',
  created_at: 'Account Age (days)',
  screen_name_length: 'Screen Name Length',
  name_length: 'Display Name Length',
  description_length: 'Bio Length',
  followers_friends_ratio: 'Followers/Friends Ratio',
  default_profile_background_color: 'Default Background Color',
  default_profile_sidebar_fill_color: 'Default Sidebar Fill Color',
  default_profile_sidebar_border_color: 'Default Sidebar Border Color',
  has_url: 'Has URL in Profile',
  profile_background_image_url: 'Has Background Image URL',
};

const PROPERTY_FEATURE_NAMES = Object.keys(FEATURE_DISPLAY_NAMES);

const router = Router();

router.post(
  '/',
  predictLimiter,
  validate(predictionRequestSchema),
  async (req, res, next) => {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const { features, tweets } = req.body;

      logger.info({ requestId, hasTweets: !!tweets?.length }, 'Prediction request received');

      // 1. Normalize the 20 property features
      const normalizedProperties = normalizePropertyFeatures(features);

      // 2. Handle tweet embedding (V1: zero vector if no tweets or LaBSE disabled)
      /** @type {number[] | undefined} */
      const tweetEmbedding = undefined;

      // 3. Build complete 788-dim feature vector
      const featureVector = buildFeatureVector(normalizedProperties, tweetEmbedding);

      // 4. Run inference
      if (!inferenceService.ready) {
        res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Inference service is not ready. Please try again shortly.',
          },
          requestId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await inferenceService.predict(featureVector, true);

      if (result.error) {
        res.status(500).json({
          error: {
            code: 'INFERENCE_ERROR',
            message: result.error,
          },
          requestId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 5. Build top features from importance scores
      const topFeatures = result.featureImportance
        .map((importance, idx) => ({
          featureName: PROPERTY_FEATURE_NAMES[idx],
          displayName: FEATURE_DISPLAY_NAMES[PROPERTY_FEATURE_NAMES[idx]],
          importance: Math.abs(importance),
          direction: result.predictedClass === 1 ? 'bot' : 'human',
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5);

      const latencyMs = Date.now() - startTime;

      // 6. Build response
      const response = {
        id: requestId,
        label: result.predictedClass === 1 ? 'bot' : 'human',
        confidence: Math.max(result.probabilities[0], result.probabilities[1]),
        botProbability: result.probabilities[1],
        humanProbability: result.probabilities[0],
        topFeatures,
        modelVersion: '1.0.0',
        usedTweetEmbedding: !!tweets?.length,
        timestamp: new Date().toISOString(),
        latencyMs,
      };

      // 7. Save to history (fire-and-forget)
      historyService
        .savePrediction({ features, tweets }, {
          label: response.label,
          confidence: response.confidence,
          botProbability: response.botProbability,
          humanProbability: response.humanProbability,
          topFeatures: response.topFeatures,
          modelVersion: response.modelVersion,
          usedTweetEmbedding: response.usedTweetEmbedding,
          latencyMs: response.latencyMs,
        })
        .catch((err) => logger.error({ err }, 'Failed to save prediction to history'));

      logger.info(
        { requestId, label: response.label, confidence: response.confidence, latencyMs },
        'Prediction complete'
      );

      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
