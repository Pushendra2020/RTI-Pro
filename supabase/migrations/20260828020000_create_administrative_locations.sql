create table if not exists public.administrative_locations (
  id text primary key,
  name text not null,
  normalized_name text not null,
  entity_type text not null,
  state_code text,
  district_code text,
  sub_district_code text,
  block_code text,
  village_code text,
  lgd_code text,
  pincode text,
  parent_id text references public.administrative_locations(id),
  source text not null,
  source_id text,
  aliases text[] not null default '{}',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists administrative_locations_name_idx on public.administrative_locations (normalized_name) where is_active = true;
create index if not exists administrative_locations_hierarchy_idx on public.administrative_locations (state_code, district_code, sub_district_code) where is_active = true;
alter table public.administrative_locations enable row level security;
grant select on table public.administrative_locations to anon, authenticated;
drop policy if exists "Public can read active administrative locations" on public.administrative_locations;
create policy "Public can read active administrative locations" on public.administrative_locations for select to anon, authenticated using (is_active = true);
