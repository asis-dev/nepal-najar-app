-- 019: Evidence photo storage bucket + RLS policies
-- Allows authenticated users to upload evidence photos/docs, public read access.

-- Create evidence-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-photos',
  'evidence-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload evidence photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence-photos');

-- Allow public read access
CREATE POLICY "Public can view evidence photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'evidence-photos');

-- Allow users to delete their own uploads
-- Files are stored as evidence/{userId}/{timestamp}-{random}.{ext}
-- so foldername(name)[2] extracts the userId segment
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidence-photos' AND auth.uid()::text = (storage.foldername(name))[2]);
