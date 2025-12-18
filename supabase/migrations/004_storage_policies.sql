-- Migration: Update storage policies for unknown-product-images bucket
-- Ensures bucket is private and no direct writes from clients
-- Run with: supabase migration new storage_policies

-- Ensure bucket is private (should already be set, but verify)
UPDATE storage.buckets
SET public = false
WHERE id = 'unknown-product-images';

-- Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Deny all anon access to images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage images" ON storage.objects;
DROP POLICY IF EXISTS "Deny public read access" ON storage.objects;

-- Policy 1: Deny ALL operations from anon users (read, write, delete)
-- This ensures no direct access from mobile app
CREATE POLICY "Deny all anon access to images"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id = 'unknown-product-images')
WITH CHECK (bucket_id = 'unknown-product-images');

-- Policy 2: Deny public read access (bucket is private)
-- Even authenticated users can't read without signed URLs
CREATE POLICY "Deny public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'unknown-product-images');

-- Policy 3: Service role can do everything (for Edge Function)
-- Used by Edge Function to:
-- - Generate signed URLs (requires read access to bucket metadata)
-- - Manage files if needed (cleanup, etc.)
CREATE POLICY "Service role full access to images"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'unknown-product-images')
WITH CHECK (bucket_id = 'unknown-product-images');

-- Optional: Allow authenticated users to read their own uploaded images
-- (Uncomment if you want authenticated users to access images via signed URLs later)
-- CREATE POLICY "Authenticated can read images"
-- ON storage.objects
-- FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'unknown-product-images');

-- Note: Signed URLs bypass RLS and policies
-- They are generated server-side (Edge Function) with service_role
-- and can be used by anyone (including anon) to upload/download within TTL

