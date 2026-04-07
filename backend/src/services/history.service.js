// @ts-check
/**
 * @module backend/services/history
 *
 * Prediction history service with pluggable storage adapters.
 *
 * V1: In-memory storage with configurable max size.
 * V2+: MongoDB adapter (same interface, zero code changes in routes).
 *
 * The adapter pattern allows swapping storage backends without
 * touching any route or controller logic.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// ============================================================
// In-Memory Adapter (V1)
// ============================================================

class InMemoryHistoryAdapter {
  /**
   * @param {number} [maxEntries=1000]
   */
  constructor(maxEntries = 1000) {
    /** @type {Array<object>} */
    this.entries = [];
    this.maxEntries = maxEntries;
  }

  /** @param {object} entry */
  async save(entry) {
    this.entries.unshift(entry); // newest first
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }

  /**
   * @param {number} page
   * @param {number} pageSize
   * @returns {Promise<{ entries: object[], total: number }>}
   */
  async findAll(page, pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      entries: this.entries.slice(start, end),
      total: this.entries.length,
    };
  }

  /**
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async findById(id) {
    return this.entries.find((e) => e.id === id) || null;
  }

  async clear() {
    this.entries = [];
  }
}

// ============================================================
// History Service
// ============================================================

class HistoryService {
  /**
   * @param {object} [adapter]
   */
  constructor(adapter) {
    this.adapter = adapter || new InMemoryHistoryAdapter();
    logger.info('History service initialized (in-memory adapter)');
  }

  /**
   * Save a prediction result to history.
   *
   * @param {{ features: Record<string, unknown>, tweets?: string[] }} request
   * @param {{ label: string, confidence: number, botProbability: number, humanProbability: number, topFeatures: object[], modelVersion: string, usedTweetEmbedding: boolean, latencyMs: number }} response
   * @returns {Promise<string>} The generated history entry ID.
   */
  async savePrediction(request, response) {
    const id = uuidv4();
    const entry = {
      id,
      request,
      response,
      createdAt: new Date().toISOString(),
    };

    await this.adapter.save(entry);
    logger.debug({ id }, 'Prediction saved to history');
    return id;
  }

  /**
   * Get paginated history.
   * @param {number} [page=1]
   * @param {number} [pageSize=20]
   */
  async getHistory(page = 1, pageSize = 20) {
    return this.adapter.findAll(page, pageSize);
  }

  /**
   * Get a single history entry by ID.
   * @param {string} id
   */
  async getById(id) {
    return this.adapter.findById(id);
  }

  /**
   * Swap the storage adapter (e.g., switch to MongoDB).
   * @param {object} adapter
   */
  setAdapter(adapter) {
    this.adapter = adapter;
    logger.info('History adapter changed');
  }

  /**
   * Seed demo data for development.
   */
  async seedDemoData() {
    const demoEntries = [
      {
        request: {
          features: {
            profile_use_background_image: true,
            default_profile: false,
            verified: false,
            followers_count: 1523,
            default_profile_image: false,
            listed_count: 42,
            statuses_count: 12450,
            friends_count: 890,
            geo_enabled: true,
            favourites_count: 5600,
            created_at: 3650,
            screen_name_length: 12,
            name_length: 15,
            description_length: 120,
            followers_friends_ratio: 1.71,
            default_profile_background_color: false,
            default_profile_sidebar_fill_color: true,
            default_profile_sidebar_border_color: true,
            has_url: true,
            profile_background_image_url: true,
          },
        },
        response: {
          label: 'human',
          confidence: 0.87,
          botProbability: 0.13,
          humanProbability: 0.87,
          topFeatures: [
            { featureName: 'followers_friends_ratio', displayName: 'Followers/Friends Ratio', importance: 0.25, direction: 'human' },
            { featureName: 'statuses_count', displayName: 'Statuses Count', importance: 0.18, direction: 'human' },
            { featureName: 'description_length', displayName: 'Bio Length', importance: 0.15, direction: 'human' },
          ],
          modelVersion: '1.0.0',
          usedTweetEmbedding: false,
          latencyMs: 45,
        },
      },
      {
        request: {
          features: {
            profile_use_background_image: false,
            default_profile: true,
            verified: false,
            followers_count: 15,
            default_profile_image: true,
            listed_count: 0,
            statuses_count: 50000,
            friends_count: 4999,
            geo_enabled: false,
            favourites_count: 2,
            created_at: 30,
            screen_name_length: 15,
            name_length: 8,
            description_length: 0,
            followers_friends_ratio: 0.003,
            default_profile_background_color: true,
            default_profile_sidebar_fill_color: true,
            default_profile_sidebar_border_color: true,
            has_url: false,
            profile_background_image_url: false,
          },
        },
        response: {
          label: 'bot',
          confidence: 0.94,
          botProbability: 0.94,
          humanProbability: 0.06,
          topFeatures: [
            { featureName: 'followers_friends_ratio', displayName: 'Followers/Friends Ratio', importance: 0.30, direction: 'bot' },
            { featureName: 'default_profile_image', displayName: 'Default Profile Image', importance: 0.22, direction: 'bot' },
            { featureName: 'description_length', displayName: 'Bio Length', importance: 0.16, direction: 'bot' },
          ],
          modelVersion: '1.0.0',
          usedTweetEmbedding: false,
          latencyMs: 38,
        },
      },
    ];

    for (const entry of demoEntries) {
      await this.savePrediction(entry.request, entry.response);
    }

    logger.info(`Seeded ${demoEntries.length} demo predictions`);
  }
}

/** Singleton history service instance. */
export const historyService = new HistoryService();
