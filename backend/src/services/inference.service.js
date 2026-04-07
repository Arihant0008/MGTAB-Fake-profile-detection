// @ts-check
/**
 * @module backend/services/inference
 *
 * Manages the Python inference subprocess lifecycle.
 *
 * Architecture:
 * - Spawns inference_v1.py as a long-lived child process
 * - Communicates via newline-delimited JSON over stdin/stdout
 * - The Python process loads the model ONCE at startup
 * - Each prediction is a JSON line → stdin, JSON line ← stdout
 * - This avoids the ~2s cold-start penalty of loading PyTorch per request
 *
 * Future: In Phase 2+, this can be swapped for HTTP calls to a
 * dedicated FastAPI/Triton inference service with zero API changes.
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { config } from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * @typedef {Object} InferenceResult
 * @property {number} predictedClass - 0=human, 1=bot
 * @property {[number, number]} probabilities - [p_human, p_bot]
 * @property {number[]} featureImportance - 20 values for property features
 * @property {number} inferenceTimeMs
 * @property {string} [error]
 */

class InferenceService extends EventEmitter {
  constructor() {
    super();
    /** @type {import('child_process').ChildProcess | null} */
    this.process = null;
    this._isReady = false;
    /** @type {Array<{ resolve: Function, reject: Function, timeout: ReturnType<typeof setTimeout> }>} */
    this.requestQueue = [];
    this.buffer = '';
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.requestTimeoutMs = 30_000;
  }

  /**
   * Start the Python inference subprocess.
   * Returns a promise that resolves when the process signals readiness.
   * @returns {Promise<void>}
   */
  async start() {
    return new Promise((resolve, reject) => {
      logger.info(
        { script: config.inferenceScriptPath, python: config.pythonPath },
        'Starting inference process...'
      );

      this.process = spawn(config.pythonPath, [config.inferenceScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          MODEL_PATH: config.modelPath,
          PYTHONUNBUFFERED: '1',
        },
      });

      // Handle stdout (inference responses)
      this.process.stdout?.on('data', (data) => {
        this.buffer += data.toString();
        this._processBuffer();
      });

      // Handle stderr (logging from Python)
      this.process.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          logger.info({ source: 'python' }, message);
        }
      });

      // Handle process exit
      this.process.on('close', (code) => {
        logger.warn({ code }, 'Inference process exited');
        this._isReady = false;
        this.process = null;

        // Reject all pending requests
        for (const pending of this.requestQueue) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Inference process terminated'));
        }
        this.requestQueue = [];

        // Auto-restart if within limit
        if (this.restartCount < this.maxRestarts) {
          this.restartCount++;
          logger.info({ attempt: this.restartCount }, 'Auto-restarting inference process...');
          setTimeout(() => this.start(), 2000);
        }
      });

      this.process.on('error', (err) => {
        logger.error({ err }, 'Failed to start inference process');
        reject(err);
      });

      // Wait for ready signal or timeout
      const startTimeout = setTimeout(() => {
        if (!this._isReady) {
          reject(new Error('Inference process startup timeout (30s)'));
        }
      }, 30_000);

      // The process buffer handler will detect the ready signal
      const readyCheck = setInterval(() => {
        if (this._isReady) {
          clearInterval(readyCheck);
          clearTimeout(startTimeout);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Process the stdout buffer for complete JSON lines.
   * @private
   */
  _processBuffer() {
    const lines = this.buffer.split('\n');
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const data = JSON.parse(trimmed);

        // Check for ready signal
        if (data.status === 'ready') {
          this._isReady = true;
          this.restartCount = 0;
          logger.info({ model: data.model }, 'Inference process ready');
          this.emit('ready');
          continue;
        }

        // Regular inference response — resolve the first pending request
        const pending = this.requestQueue.shift();
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(data);
        } else {
          logger.warn('Received inference response with no pending request');
        }
      } catch (err) {
        logger.error({ line: trimmed, err }, 'Failed to parse inference output');
      }
    }
  }

  /**
   * Send a prediction request to the inference process.
   *
   * @param {number[]} features - Normalized 788-dim feature vector.
   * @param {boolean} [computeImportance=true] - Whether to compute feature importance.
   * @returns {Promise<InferenceResult>} Inference result with prediction and importance scores.
   */
  async predict(features, computeImportance = true) {
    if (!this._isReady || !this.process) {
      throw new Error('Inference service not ready');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.requestQueue.findIndex((r) => r.resolve === resolve);
        if (idx !== -1) this.requestQueue.splice(idx, 1);
        reject(new Error('Inference request timeout'));
      }, this.requestTimeoutMs);

      this.requestQueue.push({ resolve, reject, timeout });

      const input = JSON.stringify({ features, computeImportance }) + '\n';
      this.process?.stdin?.write(input);
    });
  }

  /** Check if the inference service is ready. */
  get ready() {
    return this._isReady;
  }

  /** Gracefully shut down the inference process. */
  async stop() {
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill('SIGTERM');
      this.process = null;
      this._isReady = false;
      logger.info('Inference process stopped');
    }
  }
}

/** Singleton inference service instance. */
export const inferenceService = new InferenceService();
