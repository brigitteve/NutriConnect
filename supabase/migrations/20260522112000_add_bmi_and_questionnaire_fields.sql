-- Add physical and medical profile columns to public.profiles
alter table public.profiles add column if not exists height numeric;
alter table public.profiles add column if not exists weight numeric;
alter table public.profiles add column if not exists imc numeric;
alter table public.profiles add column if not exists allergies text[] not null default '{}';
alter table public.profiles add column if not exists intolerances text[] not null default '{}';
alter table public.profiles add column if not exists chronic_diseases text[] not null default '{}';
alter table public.profiles add column if not exists special_needs text[] not null default '{}';
alter table public.profiles add column if not exists allergies_custom text;
alter table public.profiles add column if not exists intolerances_custom text;
alter table public.profiles add column if not exists chronic_diseases_custom text;
alter table public.profiles add column if not exists special_needs_custom text;

-- Redefine handle_new_user to capture height, weight and imc from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_name text;
  v_height numeric;
  v_weight numeric;
  v_imc numeric;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'usuario');
  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1));
  
  if v_role = 'usuario' then
    v_height := (new.raw_user_meta_data->>'height')::numeric;
    v_weight := (new.raw_user_meta_data->>'weight')::numeric;
    v_imc := (new.raw_user_meta_data->>'imc')::numeric;
  end if;

  insert into public.profiles (id, full_name, role, height, weight, imc)
  values (new.id, v_name, v_role, v_height, v_weight, v_imc)
  on conflict (id) do update set
    height = excluded.height,
    weight = excluded.weight,
    imc = excluded.imc;

  if v_role = 'restaurante' then
    insert into public.restaurants_metadata (id, name)
    values (new.id, v_name)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

