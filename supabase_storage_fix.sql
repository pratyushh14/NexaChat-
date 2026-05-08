-- ============================================================
-- STORAGE BUCKET FIX — Run this in Supabase SQL Editor
-- This creates the chat-images bucket and open access policies
-- ============================================================

-- 1. Create the bucket (public = true means files are readable without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 2. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

-- 3. Allow public to read/download all files in the bucket
CREATE POLICY "Public can read chat images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');

-- 4. Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images' AND auth.uid() = owner);
