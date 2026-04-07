/**
 * Zod validation schemas for the frontend form.
 * Mirrors the backend schemas but with UI-friendly error messages.
 */

import { z } from 'zod';

export const featureFormSchema = z.object({
  // Profile Settings
  profile_use_background_image: z.boolean(),
  default_profile: z.boolean(),
  default_profile_image: z.boolean(),
  default_profile_background_color: z.boolean(),
  default_profile_sidebar_fill_color: z.boolean(),
  default_profile_sidebar_border_color: z.boolean(),
  profile_background_image_url: z.boolean(),

  // Identity
  verified: z.boolean(),
  has_url: z.boolean(),
  screen_name_length: z.number()
    .int('Must be a whole number')
    .min(1, 'At least 1 character')
    .max(15, 'Maximum 15 characters'),
  name_length: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(50, 'Maximum 50 characters'),
  description_length: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(160, 'Maximum 160 characters'),

  // Activity
  statuses_count: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative'),
  favourites_count: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative'),
  listed_count: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative'),

  // Network
  followers_count: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative'),
  friends_count: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative'),
  followers_friends_ratio: z.number()
    .min(0, 'Cannot be negative'),

  // Account
  created_at: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(10000, 'Unrealistic account age'),
  geo_enabled: z.boolean(),

  // Optional tweets
  tweets: z.string().optional(),
});

export type FeatureFormData = z.infer<typeof featureFormSchema>;

/** Feature groups for the form UI. */
export const FORM_GROUPS = [
  {
    id: 'profile',
    title: 'Profile Settings',
    subtitle: 'Visual and configuration settings',
    icon: '🎨',
    fields: [
      'profile_use_background_image',
      'default_profile',
      'default_profile_image',
      'default_profile_background_color',
      'default_profile_sidebar_fill_color',
      'default_profile_sidebar_border_color',
      'profile_background_image_url',
    ],
  },
  {
    id: 'identity',
    title: 'Identity & Verification',
    subtitle: 'Account identity markers',
    icon: '🪪',
    fields: [
      'verified',
      'has_url',
      'screen_name_length',
      'name_length',
      'description_length',
    ],
  },
  {
    id: 'activity',
    title: 'Activity Metrics',
    subtitle: 'Engagement and posting stats',
    icon: '📊',
    fields: [
      'statuses_count',
      'favourites_count',
      'listed_count',
    ],
  },
  {
    id: 'network',
    title: 'Network & Reach',
    subtitle: 'Follower-following dynamics',
    icon: '🌐',
    fields: [
      'followers_count',
      'friends_count',
      'followers_friends_ratio',
    ],
  },
  {
    id: 'account',
    title: 'Account Age & Location',
    subtitle: 'Registration and geo settings',
    icon: '📅',
    fields: [
      'created_at',
      'geo_enabled',
    ],
  },
] as const;

/** Display names and types for each field. */
export const FIELD_CONFIG: Record<string, {
  label: string;
  type: 'boolean' | 'number';
  help: string;
  placeholder?: string;
}> = {
  profile_use_background_image: { label: 'Uses Background Image', type: 'boolean', help: 'Custom background image set?' },
  default_profile: { label: 'Default Profile', type: 'boolean', help: 'Uses default theme?' },
  default_profile_image: { label: 'Default Avatar', type: 'boolean', help: 'Still using egg/silhouette avatar?' },
  default_profile_background_color: { label: 'Default BG Color', type: 'boolean', help: 'Default background color?' },
  default_profile_sidebar_fill_color: { label: 'Default Sidebar Fill', type: 'boolean', help: 'Default sidebar fill color?' },
  default_profile_sidebar_border_color: { label: 'Default Sidebar Border', type: 'boolean', help: 'Default sidebar border color?' },
  profile_background_image_url: { label: 'Has BG Image URL', type: 'boolean', help: 'Background image URL exists?' },
  verified: { label: 'Verified', type: 'boolean', help: 'Has verified badge?' },
  has_url: { label: 'Has Website URL', type: 'boolean', help: 'Profile has a website URL?' },
  screen_name_length: { label: 'Screen Name Length', type: 'number', help: 'Length of username/handle', placeholder: 'e.g. 12' },
  name_length: { label: 'Display Name Length', type: 'number', help: 'Length of display name', placeholder: 'e.g. 15' },
  description_length: { label: 'Bio Length', type: 'number', help: 'Length of profile bio', placeholder: 'e.g. 120' },
  statuses_count: { label: 'Tweets Count', type: 'number', help: 'Total tweets posted', placeholder: 'e.g. 12000' },
  favourites_count: { label: 'Likes Count', type: 'number', help: 'Total tweets liked', placeholder: 'e.g. 5000' },
  listed_count: { label: 'Listed Count', type: 'number', help: 'Public list memberships', placeholder: 'e.g. 42' },
  followers_count: { label: 'Followers', type: 'number', help: 'Total followers', placeholder: 'e.g. 1500' },
  friends_count: { label: 'Following', type: 'number', help: 'Total following', placeholder: 'e.g. 800' },
  followers_friends_ratio: { label: 'Followers/Following Ratio', type: 'number', help: 'Followers ÷ Following', placeholder: 'e.g. 1.5' },
  created_at: { label: 'Account Age (days)', type: 'number', help: 'Days since creation', placeholder: 'e.g. 3650' },
  geo_enabled: { label: 'Geo Enabled', type: 'boolean', help: 'Location tagging on?' },
};
