// @ts-check
/**
 * @module backend/utils/config
 *
 * Centralized configuration loaded from environment variables.
 * All config access goes through this module — no raw process.env elsewhere.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Monorepo root: backend/src/utils → 3 levels up */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

// Load .env from monorepo root
dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env.example') });

/**
 * Resolve a path from .env — if relative, resolve against PROJECT_ROOT.
 * @param {string | undefined} envValue
 * @param {string} fallbackRelative - Fallback path relative to PROJECT_ROOT
 * @returns {string}
 */
function resolvePath(envValue, fallbackRelative) {
  const raw = envValue || fallbackRelative;
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(PROJECT_ROOT, raw);
}

function loadConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    pythonPath: process.env.PYTHON_PATH || 'python',
    inferenceScriptPath: resolvePath(
      process.env.INFERENCE_SCRIPT_PATH,
      'inference/inference_v1.py'
    ),
    modelPath: resolvePath(
      process.env.MODEL_PATH,
      'inference/models/mlp_v1.pt'
    ),
    normalizationStatsPath: resolvePath(
      process.env.NORMALIZATION_STATS_PATH,
      'inference/models/normalization_stats.json'
    ),
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    mongodbDbName: process.env.MONGODB_DB_NAME || 'mgtab_detector',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    featureFlags: {
      enableFullGnn: process.env.ENABLE_FULL_GNN === 'true',
      enableMongodb: process.env.ENABLE_MONGODB === 'true',
      enableLabse: process.env.ENABLE_LABSE === 'true',
    },
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

/** Singleton config instance. */
export const config = loadConfig();
