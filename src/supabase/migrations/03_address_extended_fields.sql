-- =========================================================
-- Migration: Extend addresses table for rich delivery info
-- File: src/supabase/migrations/03_address_extended_fields.sql
-- =========================================================

-- Contact fields
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS alternate_phone text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS email text;

-- Location fields
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS country text DEFAULT 'India';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS address_line_1 text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS address_line_2 text;

-- Delivery preference fields
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS address_type text DEFAULT 'Home';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS delivery_time text DEFAULT 'Morning';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS custom_delivery_time text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS order_note text;

-- GPS coordinates for live tracking
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS longitude numeric;

-- Back-fill full_name from name for existing rows
UPDATE public.addresses SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Back-fill postal_code from pincode for existing rows
UPDATE public.addresses SET postal_code = pincode WHERE postal_code IS NULL AND pincode IS NOT NULL;

-- Back-fill address_type from type for existing rows
UPDATE public.addresses SET address_type = type WHERE address_type IS NULL AND type IS NOT NULL;
