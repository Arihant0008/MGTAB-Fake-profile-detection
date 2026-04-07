// @ts-check
/**
 * @module backend/schemas
 *
 * Zod validation schemas for API endpoints.
 * Mirrors the shared schemas but optimized for backend validation context.
 */

import { z } from 'zod';

/**
 * Schema for the 20 MGTAB property features.
 * Includes coercion to handle both form-encoded and JSON inputs gracefully.
 */
export const propertyFeaturesSchema = z.object({
  profile_use_background_image: z.boolean({ coerce: true }),
  default_profile: z.boolean({ coerce: true }),
  verified: z.boolean({ coerce: true }),
  followers_count: z.number({ coerce: true }).int().min(0),
  default_profile_image: z.boolean({ coerce: true }),
  listed_count: z.number({ coerce: true }).int().min(0),
  statuses_count: z.number({ coerce: true }).int().min(0),
  friends_count: z.number({ coerce: true }).int().min(0),
  geo_enabled: z.boolean({ coerce: true }),
  favourites_count: z.number({ coerce: true }).int().min(0),
  created_at: z.number({ coerce: true }).int().min(0).max(10_000),
  screen_name_length: z.number({ coerce: true }).int().min(1).max(15),
  name_length: z.number({ coerce: true }).int().min(0).max(50),
  description_length: z.number({ coerce: true }).int().min(0).max(160),
  followers_friends_ratio: z.number({ coerce: true }).min(0),
  default_profile_background_color: z.boolean({ coerce: true }),
  default_profile_sidebar_fill_color: z.boolean({ coerce: true }),
  default_profile_sidebar_border_color: z.boolean({ coerce: true }),
  has_url: z.boolean({ coerce: true }),
  profile_background_image_url: z.boolean({ coerce: true }),
});

/** Schema for POST /api/v1/predict request body. */
export const predictionRequestSchema = z.object({
  features: propertyFeaturesSchema,
  tweets: z
    .array(z.string().min(1).max(1000))
    .max(200)
    .optional(),
});

/** Schema for GET /api/v1/history query parameters. */
export const historyQuerySchema = z.object({
  page: z.number({ coerce: true }).int().min(1).default(1),
  pageSize: z.number({ coerce: true }).int().min(1).max(100).default(20),
});
