-- Migration: Create unknown_reports table and storage bucket
-- Run with: supabase migration new create_unknown_reports

-- Create unknown_reports table
CREATE TABLE IF NOT EXISTS public.unknown_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gtin TEXT NOT NULL,
  manual_name TEXT,
  note TEXT,
  ocr_text TEXT,
  image_path TEXT, -- Path in storage bucket
  image_public_url TEXT, -- Optional public URL after upload (not used for private bucket)
  app_version TEXT,
  platform TEXT, -- 'ios' | 'android'
  locale TEXT, -- e.g., 'da-DK'
  device_hash TEXT -- For abuse control (hashed device ID)
);

-- Create index on gtin for faster lookups
CREATE INDEX IF NOT EXISTS idx_unknown_reports_gtin ON public.unknown_reports(gtin);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_unknown_reports_created_at ON public.unknown_reports(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.unknown_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Deny all direct access from anon users
-- All inserts must go through Edge Function (which uses service_role)
CREATE POLICY "Deny all anon access" ON public.unknown_reports
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Create storage bucket for unknown product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'unknown-product-images',
  'unknown-product-images',
  false, -- Private bucket - no direct access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET public = false; -- Ensure bucket stays private

-- Storage policy: Deny all direct access from anon users
-- Uploads must go through Edge Function with signed URLs
CREATE POLICY "Deny all anon access to images"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id = 'unknown-product-images')
WITH CHECK (bucket_id = 'unknown-product-images');

-- Storage policy: Deny public read access
CREATE POLICY "Deny public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'unknown-product-images');

-- Storage policy: Allow service_role to manage files (used by Edge Function)
CREATE POLICY "Service role can manage images"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'unknown-product-images')
WITH CHECK (bucket_id = 'unknown-product-images');
