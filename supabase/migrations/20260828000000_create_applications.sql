create table if not exists public.applications (
  id text primary key,
  session_id text not null,
  applicant_name text not null,
  applicant_email text not null,
  applicant_mobile text not null,
  state text not null,
  district text not null,
  department text not null,
  public_authority text not null,
  draft text not null,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'response_due')),
  created_at timestamptz not null default now()
);

create index if not exists applications_created_at_idx
  on public.applications (created_at desc);

alter table public.applications enable row level security;

revoke all on table public.applications from anon, authenticated;
grant all on table public.applications to service_role;
