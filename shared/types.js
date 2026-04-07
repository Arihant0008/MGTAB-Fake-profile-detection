// @ts-check
/**
 * @module @mgtab/shared/types
 *
 * Canonical type definitions for the MGTAB Detector.
 * All API contracts, feature shapes, and domain models are documented here
 * as JSDoc typedefs. Frontend and backend both reference these for clarity.
 *
 * NOTE: In the JavaScript version, these are documentation-only.
 * The actual runtime validation is handled by Zod schemas in schemas.js.
 */

/**
 * @typedef {Object} PropertyFeatures
 * @property {boolean} profile_use_background_image
 * @property {boolean} default_profile
 * @property {boolean} verified
 * @property {number} followers_count
 * @property {boolean} default_profile_image
 * @property {number} listed_count
 * @property {number} statuses_count
 * @property {number} friends_count
 * @property {boolean} geo_enabled
 * @property {number} favourites_count
 * @property {number} created_at
 * @property {number} screen_name_length
 * @property {number} name_length
 * @property {number} description_length
 * @property {number} followers_friends_ratio
 * @property {boolean} default_profile_background_color
 * @property {boolean} default_profile_sidebar_fill_color
 * @property {boolean} default_profile_sidebar_border_color
 * @property {boolean} has_url
 * @property {boolean} profile_background_image_url
 */

/**
 * @typedef {Object} PredictionRequest
 * @property {PropertyFeatures} features
 * @property {string[]} [tweets]
 */

/**
 * @typedef {Object} FeatureContribution
 * @property {string} featureName
 * @property {string} displayName
 * @property {number} importance
 * @property {'bot' | 'human'} direction
 */

/**
 * @typedef {Object} PredictionResponse
 * @property {string} id
 * @property {'bot' | 'human'} label
 * @property {number} confidence
 * @property {number} botProbability
 * @property {number} humanProbability
 * @property {FeatureContribution[]} topFeatures
 * @property {string} modelVersion
 * @property {boolean} usedTweetEmbedding
 * @property {string} timestamp
 * @property {number} latencyMs
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {PredictionRequest} request
 * @property {PredictionResponse} response
 * @property {string} createdAt
 */

/**
 * @typedef {Object} HistoryResponse
 * @property {HistoryEntry[]} entries
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 */

/**
 * @typedef {Object} ModelInfoResponse
 * @property {string} name
 * @property {string} version
 * @property {string} type
 * @property {number} featureCount
 * @property {number} numPropertyFeatures
 * @property {number} embeddingDim
 * @property {string} trainingDataset
 * @property {string} architecture
 * @property {string} description
 * @property {{ featureOnlyInference: boolean, graphInference: boolean, tweetEmbedding: boolean, twitterApiFetch: boolean }} capabilities
 */

/**
 * @typedef {Object} HealthResponse
 * @property {'healthy' | 'degraded' | 'unhealthy'} status
 * @property {string} version
 * @property {number} uptime
 * @property {{ api: string, inference: string, database: string }} services
 */

/**
 * @typedef {Object} InferenceInput
 * @property {number[]} features
 * @property {boolean} computeImportance
 */

/**
 * @typedef {Object} InferenceOutput
 * @property {number} predictedClass
 * @property {[number, number]} probabilities
 * @property {number[]} featureImportance
 * @property {number} inferenceTimeMs
 */

// This file is documentation-only. No runtime exports needed.
export {};
