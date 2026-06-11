-- ─────────────────────────────────────────────────────────────────────────────
-- Promotional images (hero banners + promotion ads): a PRIVATE storage bucket.
-- The DB only ever stores the object path (e.g. "banner/171…-uuid.webp");
-- the app resolves paths to short-lived signed URLs at read time, so nothing
-- is reachable through a permanent /object/public/ URL.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promotional-images', 'promotional-images', false, 5242880,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Read: everyone. Promotional content is publicly displayed, but the bucket is
-- private — this SELECT grant is what lets the storefront's server client
-- (anon role for visitors) mint the signed URLs it serves; direct object URLs
-- still 404 without a valid signature.
CREATE POLICY "promotional_images_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'promotional-images');

-- Write: admins only (banner management is an admin surface).
CREATE POLICY "promotional_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promotional-images' AND (SELECT public.is_admin()));

CREATE POLICY "promotional_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'promotional-images' AND (SELECT public.is_admin()));

CREATE POLICY "promotional_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'promotional-images' AND (SELECT public.is_admin()));
