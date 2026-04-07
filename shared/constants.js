// @ts-check
/**
 * @module @mgtab/shared/constants
 *
 * Single source of truth for all feature definitions, normalization parameters,
 * and system-wide constants used across the MGTAB Detector stack.
 *
 * Feature list: MGTAB Paper Table A5 — 20 hand-crafted profile properties.
 * Total feature vector: 788 dims = 20 property + 768 LaBSE tweet embedding.
 */

// ============================================================
// Feature Definitions
// ============================================================

/**
 * Logical groupings for the 20 MGTAB profile features.
 * Used by the frontend to render form sections and by
 * the backend for structured validation.
 */
export const FEATURE_GROUPS = {
  profile: {
    label: 'Profile Settings',
    description: 'Visual and configuration settings of the account profile',
    features: [
      'profile_use_background_image',
      'default_profile',
      'default_profile_image',
      'default_profile_background_color',
      'default_profile_sidebar_fill_color',
      'default_profile_sidebar_border_color',
      'profile_background_image_url',
    ],
  },
  identity: {
    label: 'Identity & Verification',
    description: 'Account identity markers and verification status',
    features: [
      'verified',
      'has_url',
      'screen_name_length',
      'name_length',
      'description_length',
    ],
  },
  activity: {
    label: 'Activity Metrics',
    description: 'Engagement and activity statistics',
    features: [
      'statuses_count',
      'favourites_count',
      'listed_count',
    ],
  },
  network: {
    label: 'Network & Reach',
    description: 'Follower-following dynamics and social graph metrics',
    features: [
      'followers_count',
      'friends_count',
      'followers_friends_ratio',
    ],
  },
  account: {
    label: 'Account Age & Location',
    description: 'Account creation time and geolocation settings',
    features: [
      'created_at',
      'geo_enabled',
    ],
  },
};

/**
 * Ordered list of all 20 property feature names.
 * ORDER MATTERS — this defines the position in the 788-dim vector.
 */
export const PROPERTY_FEATURE_NAMES = [
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

/**
 * Metadata for each feature: display name, type, help text, input constraints.
 *
 * @type {Record<string, { displayName: string, type: string, helpText: string, min?: number, max?: number, placeholder?: string }>}
 */
export const FEATURE_METADATA = {
  profile_use_background_image: {
    displayName: 'Uses Background Image',
    type: 'boolean',
    helpText: 'Whether the account has a custom background image set',
  },
  default_profile: {
    displayName: 'Default Profile',
    type: 'boolean',
    helpText: 'Whether the account uses the default Twitter/X profile theme',
  },
  verified: {
    displayName: 'Verified',
    type: 'boolean',
    helpText: 'Whether the account has a verified badge',
  },
  followers_count: {
    displayName: 'Followers Count',
    type: 'integer',
    helpText: 'Total number of accounts following this user',
    min: 0,
    max: 200_000_000,
    placeholder: 'e.g. 1500',
  },
  default_profile_image: {
    displayName: 'Default Profile Image',
    type: 'boolean',
    helpText: 'Whether the account still uses the default egg/silhouette avatar',
  },
  listed_count: {
    displayName: 'Listed Count',
    type: 'integer',
    helpText: 'Number of public lists this account is a member of',
    min: 0,
    max: 500_000,
    placeholder: 'e.g. 42',
  },
  statuses_count: {
    displayName: 'Statuses Count',
    type: 'integer',
    helpText: 'Total number of tweets/posts published',
    min: 0,
    max: 100_000_000,
    placeholder: 'e.g. 12000',
  },
  friends_count: {
    displayName: 'Friends Count',
    type: 'integer',
    helpText: 'Total number of accounts this user follows',
    min: 0,
    max: 5_000_000,
    placeholder: 'e.g. 800',
  },
  geo_enabled: {
    displayName: 'Geo Enabled',
    type: 'boolean',
    helpText: 'Whether the account has enabled location tagging for tweets',
  },
  favourites_count: {
    displayName: 'Favourites Count',
    type: 'integer',
    helpText: 'Number of tweets this account has liked',
    min: 0,
    max: 100_000_000,
    placeholder: 'e.g. 5000',
  },
  created_at: {
    displayName: 'Account Age (days)',
    type: 'integer',
    helpText: 'Number of days since the account was created',
    min: 0,
    max: 10_000,
    placeholder: 'e.g. 3650',
  },
  screen_name_length: {
    displayName: 'Screen Name Length',
    type: 'integer',
    helpText: 'Number of characters in the username/handle',
    min: 1,
    max: 15,
    placeholder: 'e.g. 12',
  },
  name_length: {
    displayName: 'Display Name Length',
    type: 'integer',
    helpText: 'Number of characters in the display name',
    min: 0,
    max: 50,
    placeholder: 'e.g. 15',
  },
  description_length: {
    displayName: 'Bio Length',
    type: 'integer',
    helpText: 'Number of characters in the profile bio/description',
    min: 0,
    max: 160,
    placeholder: 'e.g. 120',
  },
  followers_friends_ratio: {
    displayName: 'Followers/Friends Ratio',
    type: 'float',
    helpText: 'Ratio of followers to following (followers_count / friends_count)',
    min: 0,
    placeholder: 'e.g. 1.5',
  },
  default_profile_background_color: {
    displayName: 'Default Background Color',
    type: 'boolean',
    helpText: 'Whether the profile uses the default background color',
  },
  default_profile_sidebar_fill_color: {
    displayName: 'Default Sidebar Fill Color',
    type: 'boolean',
    helpText: 'Whether the profile uses the default sidebar fill color',
  },
  default_profile_sidebar_border_color: {
    displayName: 'Default Sidebar Border Color',
    type: 'boolean',
    helpText: 'Whether the profile uses the default sidebar border color',
  },
  has_url: {
    displayName: 'Has URL in Profile',
    type: 'boolean',
    helpText: 'Whether the profile has a website URL set',
  },
  profile_background_image_url: {
    displayName: 'Has Background Image URL',
    type: 'boolean',
    helpText: 'Whether a background image URL exists (even if not displayed)',
  },
};

// ============================================================
// Dimension Constants
// ============================================================

/** Number of hand-crafted profile features (MGTAB Table A5). */
export const NUM_PROPERTY_FEATURES = 20;

/** Dimension of LaBSE tweet embedding vector. */
export const LABSE_EMBEDDING_DIM = 768;

/** Total feature vector dimension: 20 property + 768 embedding. */
export const FEATURE_VECTOR_DIM = NUM_PROPERTY_FEATURES + LABSE_EMBEDDING_DIM;

// ============================================================
// API Constants
// ============================================================

export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

export const MODEL_INFO = {
  name: 'MGTAB Detector MLP V1',
  version: '1.0.0',
  type: 'MLP',
  featureCount: FEATURE_VECTOR_DIM,
  numPropertyFeatures: NUM_PROPERTY_FEATURES,
  embeddingDim: LABSE_EMBEDDING_DIM,
  trainingDataset: 'MGTAB',
  architecture: '788 → 256 → 128 → 2',
  description:
    'Feature-only MLP classifier trained on MGTAB dataset property features + LaBSE tweet embeddings. Phase 2 will upgrade to full RGCN with graph structure.',
};

// ============================================================
// Normalization Constants
// ============================================================

/**
 * Features that require log1p transform before MinMax scaling.
 * These are count-based features with heavy right-skew distributions.
 */
export const LOG_TRANSFORM_FEATURES = [
  'followers_count',
  'listed_count',
  'statuses_count',
  'friends_count',
  'favourites_count',
  'followers_friends_ratio',
];

/**
 * Boolean features that are already 0/1 and need no normalization.
 */
export const BOOLEAN_FEATURES = [
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
];

/**
 * Features that get standard MinMax normalization (no log transform).
 */
export const MINMAX_FEATURES = [
  'created_at',
  'screen_name_length',
  'name_length',
  'description_length',
];
