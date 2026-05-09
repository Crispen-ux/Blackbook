-- Allow chat members to upload attachments to their chats
CREATE POLICY "Chat members can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat_attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = (storage.foldername(name))[1]::uuid
        AND cm.user_id = auth.uid()
    )
  );

-- Allow chat members to update their own uploads
CREATE POLICY "Chat members can update their own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat_attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = (storage.foldername(name))[1]::uuid
        AND cm.user_id = auth.uid()
    )
  );
