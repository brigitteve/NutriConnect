-- Revoke execute on trigger functions (only used internally)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_order_delivered() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Tighten bucket: drop broad select, allow public read via path but block listing via the storage API
drop policy if exists "chat_uploads_read_all" on storage.objects;
