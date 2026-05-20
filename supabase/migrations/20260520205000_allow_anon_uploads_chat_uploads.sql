-- Allow anyone (including anonymous/unauthenticated users) to upload to the chat-uploads bucket
-- This is necessary for unauthenticated B2B nutritionist leads to upload their profile photo.

drop policy if exists "chat_uploads_auth_insert" on storage.objects;

create policy "chat_uploads_insert_all" on storage.objects
  for insert with check (bucket_id = 'chat-uploads');
