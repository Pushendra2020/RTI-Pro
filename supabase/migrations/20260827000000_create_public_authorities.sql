create table if not exists public.public_authorities (
  id text primary key,
  state text not null,
  district text not null,
  category text not null,
  department text not null,
  public_authority text not null,
  aliases text[] not null default '{}',
  portal_name text not null,
  portal_url text not null,
  source_title text not null,
  source_url text not null,
  verified_at date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists public_authorities_jurisdiction_idx
  on public.public_authorities (state, district, category)
  where active = true;

alter table public.public_authorities enable row level security;

grant select on table public.public_authorities to anon, authenticated;

drop policy if exists "Public can read active authority directory" on public.public_authorities;
create policy "Public can read active authority directory"
  on public.public_authorities
  for select
  to anon, authenticated
  using (active = true);

insert into public.public_authorities (
  id, state, district, category, department, public_authority, aliases,
  portal_name, portal_url, source_title, source_url, verified_at, active
)
values
  (
    'mh-nashik-rdd-road', 'Maharashtra', 'Nashik', 'Rural development',
    'Rural Development and Panchayat Raj Department',
    'Zilla Parishad Nashik - Rural Development Department',
    array['road', 'roads', 'road repair', 'gaon ka road', 'village road', 'pavement', 'contractor', 'sadak', 'रस्ता'],
    'Maharashtra RTI portal', 'https://rtionline.maharashtra.gov.in/',
    'Maharashtra Rural Development and Panchayat Raj Department', 'https://rdd.maharashtra.gov.in/',
    '2026-08-27', true
  ),
  (
    'mh-nashik-school-education', 'Maharashtra', 'Nashik', 'School education',
    'School Education and Sports Department',
    'Zilla Parishad Nashik - Education Department',
    array['school', 'classroom', 'teacher', 'school building', 'midday meal', 'शाळा'],
    'Maharashtra RTI portal', 'https://rtionline.maharashtra.gov.in/',
    'Maharashtra School Education and Sports Department', 'https://education.maharashtra.gov.in/',
    '2026-08-27', true
  ),
  (
    'mh-nashik-water-supply', 'Maharashtra', 'Nashik', 'Water supply and sanitation',
    'Water Supply and Sanitation Department',
    'Maharashtra Jeevan Pradhikaran - Nashik Division',
    array['water', 'tap', 'pipeline', 'drinking water', 'jal jeevan', 'पाणी'],
    'Maharashtra RTI portal', 'https://rtionline.maharashtra.gov.in/',
    'Maharashtra Jeevan Pradhikaran', 'https://mjp.maharashtra.gov.in/',
    '2026-08-27', true
  ),
  (
    'mh-nashik-revenue-land', 'Maharashtra', 'Nashik', 'Revenue and land records',
    'Revenue and Forest Department',
    'Office of the District Collector, Nashik',
    array['land', 'property', '7/12', 'mutation', 'survey', 'collector', 'जमीन'],
    'Nashik district official website', 'https://nashik.gov.in/',
    'Nashik District Administration', 'https://nashik.gov.in/',
    '2026-08-27', true
  ),
  (
    'mh-nashik-public-health', 'Maharashtra', 'Nashik', 'Public health',
    'Public Health Department',
    'District Health Office, Zilla Parishad Nashik',
    array['hospital', 'clinic', 'medicine', 'health centre', 'ambulance', 'आरोग्य'],
    'Nashik district official website', 'https://nashik.gov.in/',
    'Nashik District Administration', 'https://nashik.gov.in/',
    '2026-08-27', true
  )
on conflict (id) do update set
  state = excluded.state,
  district = excluded.district,
  category = excluded.category,
  department = excluded.department,
  public_authority = excluded.public_authority,
  aliases = excluded.aliases,
  portal_name = excluded.portal_name,
  portal_url = excluded.portal_url,
  source_title = excluded.source_title,
  source_url = excluded.source_url,
  verified_at = excluded.verified_at,
  active = excluded.active;
