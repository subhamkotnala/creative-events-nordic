-- Phase 1 Migration: Converting Single-Category Vendors to Multi-Category Structure
-- This script migrates the existing 'services' packages into a nested 'packages' array
-- inside a new 'services' offering object that contains category, location, and images.

-- 1. Create a safe backup of the current profiles and applications data just in case
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
CREATE TABLE applications_backup AS SELECT * FROM applications;

-- 2. Update profiles table to nest existing data into the new services JSONB structure
UPDATE profiles 
SET services = jsonb_build_array(
    jsonb_build_object(
        'id', gen_random_uuid(),
        'category', service_type,
        'location', location,
        'description', description,
        'imageUrl', image_url,
        'imageUrls', COALESCE(image_urls, ARRAY[]::text[]),
        'packages', COALESCE(services, '[]'::jsonb)
    )
)
WHERE role = 'VENDOR' 
  AND service_type IS NOT NULL 
  AND (jsonb_array_length(services) = 0 OR NOT (services->0 ? 'category'));

-- 3. Update applications table similarly
UPDATE applications
SET services = jsonb_build_array(
    jsonb_build_object(
        'id', gen_random_uuid(),
        'category', service_type,
        'location', location,
        'description', description,
        'imageUrl', image_url,
        'imageUrls', COALESCE(image_urls, ARRAY[]::text[]),
        'packages', COALESCE(services, '[]'::jsonb)
    )
)
WHERE service_type IS NOT NULL 
  AND (jsonb_array_length(services) = 0 OR NOT (services->0 ? 'category'));

-- Note: We are keeping the old columns (service_type, location, description, image_url)
-- as "Business level" details for now, to ensure we don't accidentally break anything.
-- A future cleanup phase can drop them once we confirm the application runs smoothly.
