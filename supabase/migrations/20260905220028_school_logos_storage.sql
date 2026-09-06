-- PHASE 02 — STEP 2X: SCHOOL LOGOS STORAGE BUCKET
-- This migration creates the public storage bucket for school logos.
--
-- IMPORTANT:
-- - Run this migration only after confirming the base schema exists.
-- - This migration does NOT drop existing data.
-- - Bucket privacy is set to public so logo URLs can be used directly in <img> tags.

-- Create the public bucket for school logos if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-logos',
  'school-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- RLS POLICIES FOR STORAGE.OBJECTS
-- ============================================

-- Allow public read access to school logos (bucket is public)
CREATE POLICY "school_logos_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

-- Allow authenticated upload/update/delete for admin/bendahara only
CREATE POLICY "school_logos_authenticated_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'school-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "school_logos_authenticated_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'school-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "school_logos_authenticated_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'school-logos'
  AND auth.role() = 'authenticated'
);
