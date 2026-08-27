do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'public_authorities_source_url_official_check'
  ) then
    alter table public.public_authorities
      add constraint public_authorities_source_url_official_check
      check (source_url ~* '^https://[^/]+[.](gov[.]in|nic[.]in)(/|$)');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'public_authorities_portal_url_official_check'
  ) then
    alter table public.public_authorities
      add constraint public_authorities_portal_url_official_check
      check (portal_url ~* '^https://[^/]+[.](gov[.]in|nic[.]in)(/|$)');
  end if;
end $$;
