// @ts-check
/**
 * @module @mgtab/shared/schemas
 *
 * Zod validation schemas — the single source of truth for runtime validation.
 * Used by backend for request validation and frontend for form validation.
 * All schemas are derived from the MGTAB paper's Table A5 feature definitions.
 */

import { z } from 'zod';

// ============================================================
// Property Features Schema
// ============================================================

/**
 * Zod schema for the 20 MGTAB hand-crafted profile features.
 * Includes coercion for form inputs (strings → numbers/booleans).
 */
export const propertyFeaturesSchema = z.object({
  // --- Profile Settings (boolean) ---
  profile_use_background_image: z
    .boolean({ coerce: true })
    .describe('Whether the account has a custom background image'),

  default_profile: z
    .boolean({ coerce: true })
    .describe('Whether the account uses the default profile theme'),

  default_profile_image: z
    .boolean({ coerce: true })
    .describe('Whether the account uses the default avatar'),

  default_profile_background_color: z
    .boolean({ coerce: true })
    .describe('Whether the profile uses the default background color'),

  default_profile_sidebar_fill_color: z
    .boolean({ coerce: true })
    .describe('Whether the profile uses the default sidebar fill color'),

  default_profile_sidebar_border_color: z
    .boolean({ coerce: true })
    .describe('Whether the profile uses the default sidebar border color'),

  profile_background_image_url: z
    .boolean({ coerce: true })
    .describe('Whether a background image URL exists'),

  // --- Identity & Verification ---
  verified: z
    .boolean({ coerce: true })
    .describe('Whether the account is verified'),

  has_url: z
    .boolean({ coerce: true })
    .describe('Whether the profile has a website URL'),

  screen_name_length: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(1, 'Screen name must be at least 1 character')
    .max(15, 'Screen name cannot exceed 15 characters')
    .describe('Length of the username/handle'),

  name_length: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(50, 'Display name cannot exceed 50 characters')
    .describe('Length of the display name'),

  description_length: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(160, 'Bio cannot exceed 160 characters')
    .describe('Length of the profile bio'),

  // --- Activity Metrics ---
  statuses_count: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .describe('Total tweets published'),

  favourites_count: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .describe('Number of tweets liked'),

  listed_count: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .describe('Number of public lists membership'),

  // --- Network & Reach ---
  followers_count: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .describe('Total number of followers'),

  friends_count: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .describe('Total number of following'),

  followers_friends_ratio: z
    .number({ coerce: true })
    .min(0, 'Ratio cannot be negative')
    .describe('Followers to following ratio'),

  // --- Account Age & Location ---
  created_at: z
    .number({ coerce: true })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(10_000, 'Unrealistic account age')
    .describe('Days since account creation'),

  geo_enabled: z
    .boolean({ coerce: true })
    .describe('Whether geo-tagging is enabled'),
});

// ============================================================
// Prediction Request Schema
// ============================================================

export const predictionRequestSchema = z.object({
  features: propertyFeaturesSchema,
  tweets: z
    .array(z.string().min(1).max(1000))
    .max(200, 'Maximum 200 tweets allowed')
    .optional()
    .describe('Optional array of recent tweet texts for LaBSE embedding'),
});

// ============================================================
// Query Schemas
// ============================================================

export const historyQuerySchema = z.object({
  page: z.number({ coerce: true }).int().min(1).default(1),
  pageSize: z.number({ coerce: true }).int().min(1).max(100).default(20),
});
