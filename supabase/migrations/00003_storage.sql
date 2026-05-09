-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('posts', 'posts', true, false, 4194304, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('events', 'events', true, false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('chat_attachments', 'chat_attachments', false, false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to avatars
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload to posts
CREATE POLICY "Users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

-- Allow authenticated users to upload to events
CREATE POLICY "Users can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'events'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'events');

-- Allow chat members to view attachments
CREATE POLICY "Chat members can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat_attachments'
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = (storage.foldername(name))[1]::uuid
        AND cm.user_id = auth.uid()
    )
  );

-- Function to generate a signed upload URL
CREATE OR REPLACE FUNCTION public.get_upload_url(
  bucket TEXT,
  file_path TEXT,
  content_type TEXT
) RETURNS TEXT AS $$
DECLARE
  url TEXT;
BEGIN
  SELECT storage.create_signed_upload_url(bucket, file_path, content_type) INTO url;
  RETURN url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
