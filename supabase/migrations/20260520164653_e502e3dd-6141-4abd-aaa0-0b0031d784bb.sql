
-- ENUMS
create type public.app_role as enum ('usuario','restaurante');
create type public.user_tier as enum ('freemium','premium');
create type public.order_status as enum (
  'chat_activo','pendiente_pago','esperando_validacion',
  'pago_confirmado','en_preparacion','preparando',
  'listo_para_enviar','entregado','cancelado'
);

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'usuario',
  tier user_tier not null default 'freemium',
  diets text[] not null default '{}',
  medical_restrictions text[] not null default '{}',
  fitness_goal text,
  onboarding_complete boolean not null default false,
  safety_meals_ordered int not null default 0,
  points int not null default 0,
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- RESTAURANTS METADATA
create table public.restaurants_metadata (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  qr_url text,
  points int not null default 0,
  badges text[] not null default '{}',
  total_orders_completed int not null default 0,
  successful_delivery_rate numeric not null default 100,
  specific_counters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.restaurants_metadata enable row level security;

create policy "rest_meta_select_all" on public.restaurants_metadata for select using (true);
create policy "rest_meta_update_own" on public.restaurants_metadata for update using (auth.uid() = id);
create policy "rest_meta_insert_own" on public.restaurants_metadata for insert with check (auth.uid() = id);

-- DISHES
create table public.restaurant_dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.profiles(id) on delete cascade,
  dish_name text not null,
  description text,
  base_price numeric not null,
  health_tags text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.restaurant_dishes enable row level security;

create policy "dishes_select_all" on public.restaurant_dishes for select using (true);
create policy "dishes_insert_own" on public.restaurant_dishes for insert with check (auth.uid() = restaurant_id);
create policy "dishes_update_own" on public.restaurant_dishes for update using (auth.uid() = restaurant_id);
create policy "dishes_delete_own" on public.restaurant_dishes for delete using (auth.uid() = restaurant_id);

-- ORDERS
create table public.orders_chat_hub (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.profiles(id) on delete cascade,
  dish_id uuid references public.restaurant_dishes(id),
  dish_name text,
  status order_status not null default 'chat_activo',
  is_premium_custom boolean not null default false,
  base_price numeric,
  final_price numeric,
  customized_recipe jsonb,
  health_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders_chat_hub enable row level security;

create policy "orders_select_parties" on public.orders_chat_hub
  for select using (auth.uid() = client_id or auth.uid() = restaurant_id);
create policy "orders_insert_client" on public.orders_chat_hub
  for insert with check (auth.uid() = client_id);
create policy "orders_update_parties" on public.orders_chat_hub
  for update using (auth.uid() = client_id or auth.uid() = restaurant_id);

-- MESSAGES
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders_chat_hub(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_text text,
  image_url text,
  kind text not null default 'text', -- text | qr | voucher | system
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;

create policy "messages_select_parties" on public.chat_messages
  for select using (exists (
    select 1 from public.orders_chat_hub o
    where o.id = order_id and (o.client_id = auth.uid() or o.restaurant_id = auth.uid())
  ));
create policy "messages_insert_parties" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.orders_chat_hub o
      where o.id = order_id and (o.client_id = auth.uid() or o.restaurant_id = auth.uid())
    )
  );

-- NUTRITIONISTS
create table public.nutritionists (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cnp text,
  specialty text,
  bio text,
  contact_url text,
  photo_url text,
  created_at timestamptz not null default now()
);
alter table public.nutritionists enable row level security;
create policy "nutritionists_select_all" on public.nutritionists for select using (true);

-- NEW USER TRIGGER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_name text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'usuario');
  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1));

  insert into public.profiles (id, full_name, role)
  values (new.id, v_name, v_role)
  on conflict (id) do nothing;

  if v_role = 'restaurante' then
    insert into public.restaurants_metadata (id, name)
    values (new.id, v_name)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- GAMIFICATION TRIGGER (on delivered)
create or replace function public.handle_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag text;
  v_counters jsonb;
  v_new_total int;
  v_new_badges text[];
begin
  if new.status = 'entregado' and old.status is distinct from 'entregado' then
    -- Restaurant: points + total + counters
    update public.restaurants_metadata
    set points = points + 10,
        total_orders_completed = total_orders_completed + 1
    where id = new.restaurant_id;

    -- Per-tag counters
    if new.health_tags is not null and array_length(new.health_tags, 1) > 0 then
      foreach v_tag in array new.health_tags loop
        update public.restaurants_metadata
        set specific_counters = jsonb_set(
          coalesce(specific_counters, '{}'::jsonb),
          array[v_tag],
          to_jsonb(coalesce((specific_counters->>v_tag)::int, 0) + 1)
        )
        where id = new.restaurant_id;
      end loop;
    end if;

    -- Badges at thresholds
    select total_orders_completed into v_new_total from public.restaurants_metadata where id = new.restaurant_id;
    if v_new_total = 50 then
      update public.restaurants_metadata
      set badges = array_append(badges, 'Chef de Precisión')
      where id = new.restaurant_id and not ('Chef de Precisión' = any(badges));
    end if;
    if v_new_total = 100 then
      update public.restaurants_metadata
      set badges = array_append(badges, 'Cocina Segura Cero Alérgenos')
      where id = new.restaurant_id and not ('Cocina Segura Cero Alérgenos' = any(badges));
    end if;

    -- Client: points + safety meals
    update public.profiles
    set points = points + 5,
        safety_meals_ordered = safety_meals_ordered + 1
    where id = new.client_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_status_change on public.orders_chat_hub;
create trigger on_order_status_change
  after update on public.orders_chat_hub
  for each row execute function public.handle_order_delivered();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger orders_touch before update on public.orders_chat_hub
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- REALTIME
alter publication supabase_realtime add table public.orders_chat_hub;
alter publication supabase_realtime add table public.chat_messages;
alter table public.orders_chat_hub replica identity full;
alter table public.chat_messages replica identity full;

-- STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', true)
on conflict (id) do nothing;

create policy "chat_uploads_read_all" on storage.objects
  for select using (bucket_id = 'chat-uploads');
create policy "chat_uploads_auth_insert" on storage.objects
  for insert with check (bucket_id = 'chat-uploads' and auth.role() = 'authenticated');
create policy "chat_uploads_owner_update" on storage.objects
  for update using (bucket_id = 'chat-uploads' and owner = auth.uid());
create policy "chat_uploads_owner_delete" on storage.objects
  for delete using (bucket_id = 'chat-uploads' and owner = auth.uid());
