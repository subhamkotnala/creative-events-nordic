-- migration_application_fields.sql
-- Run this in your Supabase SQL Editor to add the missing columns

-- Add columns to profiles table
alter table profiles add column if not exists application_story text;
alter table profiles add column if not exists application_location text;
alter table profiles add column if not exists application_image_url text;
alter table profiles add column if not exists application_gallery_urls text[];

-- Add columns to applications table
alter table applications add column if not exists application_story text;
alter table applications add column if not exists application_location text;
alter table applications add column if not exists application_image_url text;
alter table applications add column if not exists application_gallery_urls text[];
