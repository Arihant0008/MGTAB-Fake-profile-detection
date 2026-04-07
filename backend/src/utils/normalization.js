// @ts-check
/**
 * @module backend/utils/normalization
 *
 * Feature normalization logic — MUST match the Python implementation exactly.
 * Applies log1p + MinMax transforms using precomputed training statistics.
 *
 * This is intentionally duplicated from the Python side to allow the backend
 * to normalize features before sending to inference. Both implementations
 * must produce identical outputs for the same inputs.
 */

import fs from 'fs';
import { config } from './config.js';
import logger from './logger.js';

// ============================================================
// Feature Constants (must match shared/constants.js)
// ============================================================

const PROPERTY_FEATURE_NAMES = [
  'profile_use_background_image',
  'default_profile',
  'verified',
  'followers_count',
  'default_profile_image',
  'listed_count',
  'statuses_count',
  'friends_count',
  'geo_enabled',
  'favourites_count',
  'created_at',
  'screen_name_length',
  'name_length',
  'description_length',
  'followers_friends_ratio',
  'default_profile_background_color',
  'default_profile_sidebar_fill_color',
  'default_profile_sidebar_border_color',
  'has_url',
  'profile_background_image_url',
];

const LOG_TRANSFORM_FEATURES = new Set([
  'followers_count',
  'listed_count',
  'statuses_count',
  'friends_count',
  'favourites_count',
  'followers_friends_ratio',
]);

const BOOLEAN_FEATURES = new Set([
  'profile_use_background_image',
  'default_profile',
  'verified',
  'default_profile_image',
  'geo_enabled',
  'default_profile_background_color',
  'default_profile_sidebar_fill_color',
  'default_profile_sidebar_border_color',
  'has_url',
  'profile_background_image_url',
]);

// ============================================================
// Stats Loading
// ============================================================

/** @type {object | null} */
let cachedStats = null;

/**
 * Load normalization stats from disk (with caching).
 * Falls back to default ranges if file is missing.
 *
 * @returns {{ propertyFeatures: Record<string, { min: number, max: number, mean: number, std: number }>, trainingSize: number, computedAt: string }}
 */
export function loadNormalizationStats() {
  if (cachedStats) return cachedStats;

  try {
    const raw = fs.readFileSync(config.normalizationStatsPath, 'utf-8');
    cachedStats = JSON.parse(raw);
    logger.info(
      { path: config.normalizationStatsPath, trainingSize: cachedStats.trainingSize },
      'Loaded normalization stats'
    );
    return cachedStats;
  } catch (err) {
    logger.warn(
      { err, path: config.normalizationStatsPath },
      'Normalization stats not found — using fallback defaults. Run train_mlp_v1.py first.'
    );
    // Fallback: assume [0, 1] range for everything
    const fallback = {
      propertyFeatures: {},
      trainingSize: 0,
      computedAt: new Date().toISOString(),
    };
    for (const name of PROPERTY_FEATURE_NAMES) {
      fallback.propertyFeatures[name] = { min: 0, max: 1, mean: 0.5, std: 0.5 };
    }
    cachedStats = fallback;
    return cachedStats;
  }
}

// ============================================================
// Normalization Functions
// ============================================================

/**
 * Normalize a single feature value.
 * Applies the exact same transforms as the Python training pipeline.
 *
 * @param {number} value - Raw feature value
 * @param {string} featureName - Feature key name
 * @param {object} stats - Full normalization stats object
 * @returns {number} Normalized value in [0, 1]
 */
function normalizeSingleFeature(value, featureName, stats) {
  // Boolean features: simply cast to 0 or 1
  if (BOOLEAN_FEATURES.has(featureName)) {
    return value ? 1.0 : 0.0;
  }

  let transformedValue = value;

  // Apply log1p for count-based features
  if (LOG_TRANSFORM_FEATURES.has(featureName)) {
    transformedValue = Math.log1p(transformedValue);
  }

  // MinMax scaling
  const featStats = stats.propertyFeatures[featureName];
  if (!featStats) {
    logger.warn({ featureName }, 'Missing normalization stats for feature');
    return 0.0;
  }

  const range = featStats.max - featStats.min;
  if (range < 1e-10) return 0.0;

  const normalized = (transformedValue - featStats.min) / range;
  // Clamp to [0, 1]
  return Math.max(0.0, Math.min(1.0, normalized));
}

/**
 * Normalize all 20 property features into an ordered array.
 *
 * @param {Record<string, number | boolean>} rawFeatures - Object with feature names as keys and raw values.
 * @returns {number[]} Array of 20 normalized values in PROPERTY_FEATURE_NAMES order.
 */
export function normalizePropertyFeatures(rawFeatures) {
  const stats = loadNormalizationStats();
  const normalized = [];

  for (const name of PROPERTY_FEATURE_NAMES) {
    const rawValue = typeof rawFeatures[name] === 'boolean'
      ? (rawFeatures[name] ? 1.0 : 0.0)
      : (rawFeatures[name] ?? 0.0);
    normalized.push(normalizeSingleFeature(rawValue, name, stats));
  }

  return normalized;
}

/**
 * Build the complete 788-dim feature vector.
 *
 * @param {number[]} normalizedPropertyFeatures - 20 normalized property features.
 * @param {number[]} [tweetEmbedding] - Optional 768-dim LaBSE embedding.
 * @returns {number[]} Complete 788-dim feature vector.
 */
export function buildFeatureVector(normalizedPropertyFeatures, tweetEmbedding) {
  const embedding = tweetEmbedding ?? new Array(768).fill(0);

  if (embedding.length !== 768) {
    throw new Error(`Expected 768-dim embedding, got ${embedding.length}`);
  }

  return [...normalizedPropertyFeatures, ...embedding];
}
