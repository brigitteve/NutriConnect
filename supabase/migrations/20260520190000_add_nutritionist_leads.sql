create table if not exists public.nutritionist_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cnp_code text not null,
  specialty text not null,
  whatsapp_number text not null,
  profile_image_url text,
  status text not null default 'pendiente_revision',
  created_at timestamptz not null default now()
);

alter table public.nutritionist_leads enable row level security;

grant insert on public.nutritionist_leads to anon, authenticated;
grant select, update on public.nutritionist_leads to authenticated;

drop policy if exists "leads_insert_all" on public.nutritionist_leads;
drop policy if exists "leads_select_authenticated" on public.nutritionist_leads;
drop policy if exists "leads_update_authenticated" on public.nutritionist_leads;

create policy "leads_insert_all"
on public.nutritionist_leads
for insert
to anon, authenticated
with check (true);

create policy "leads_select_authenticated"
on public.nutritionist_leads
for select
to authenticated
using (true);

create policy "leads_update_authenticated"
on public.nutritionist_leads
for update
to authenticated
using (true)
with check (true);

notify pgrst, 'reload schema';
