-- Storage bucket for customer review photos & videos. Public-read (so reviews
-- can display them); uploads are scoped to the uploader's own folder
-- ({user_id}/...). 50MB cap covers short unboxing clips.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-media', 'review-media', true, 52428800,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif',
        'video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Public can read review media (objects live in a public bucket).
CREATE POLICY "review_media_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'review-media');

-- Authenticated users upload only into their own {user_id}/ folder.
CREATE POLICY "review_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- …and can remove their own uploads.
CREATE POLICY "review_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'review-media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
