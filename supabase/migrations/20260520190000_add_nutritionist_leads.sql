create table public.nutritionist_leads (
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

create policy "leads_insert_all" on public.nutritionist_leads for insert with check (true);
create policy "leads_select_all" on public.nutritionist_leads for select using (true);
create policy "leads_update_all" on public.nutritionist_leads for update using (true);
