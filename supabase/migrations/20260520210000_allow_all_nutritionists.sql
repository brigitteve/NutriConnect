-- Allow anyone (including anonymous/unauthenticated users) to perform insert/update/delete operations on public.nutritionists.
-- This is necessary for the simulated admin panel to validate leads and populate the nutritionists directory.

drop policy if exists "nutritionists_insert_all" on public.nutritionists;
drop policy if exists "nutritionists_update_all" on public.nutritionists;
drop policy if exists "nutritionists_delete_all" on public.nutritionists;

create policy "nutritionists_insert_all" on public.nutritionists
  for insert with check (true);

create policy "nutritionists_update_all" on public.nutritionists
  for update using (true) with check (true);

create policy "nutritionists_delete_all" on public.nutritionists
  for delete using (true);
