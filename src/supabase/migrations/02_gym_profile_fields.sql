-- =========================================================
-- Migration: Add gym-focused profile fields
-- File: src/supabase/migrations/02_gym_profile_fields.sql
-- =========================================================

-- New columns for gym-focused user onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_preference text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT '{}';
