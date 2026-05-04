-- Phase 3 Migration: Cleanup old business-level columns
-- This script removes the single-category columns from profiles and applications
-- that were deprecated during Phase 1 & 2 in favor of the nested `services` JSONB array.

-- Drop columns from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS service_type,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS image_url,
DROP COLUMN IF EXISTS image_urls;

-- Drop columns from applications table
ALTER TABLE applications
DROP COLUMN IF EXISTS service_type,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS image_url,
DROP COLUMN IF EXISTS image_urls;

-- Note: The application codebase has been updated to exclusively use the `services`
-- field for category, location, images, and descriptions.
