-- Run supabase/setup.sql in the Supabase SQL Editor. This is its schema source.
-- Re-running setup preserves published content and any changed admin password.
begin;

create schema if not exists wedding_private;
revoke all on schema wedding_private from public, anon, authenticated;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists wedding_private.editors (
  username text primary key,
  password_hash text not null
);
revoke all on wedding_private.editors from public, anon, authenticated;

insert into wedding_private.editors(username, password_hash)
values ('admin', extensions.crypt('admin', extensions.gen_salt('bf', 10)))
on conflict (username) do nothing;

create or replace function wedding_private.valid_text(value jsonb, min_length integer, max_length integer)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'string'
    and length(value #>> '{}') <= max_length
    and length(btrim(value #>> '{}')) >= min_length, false);
$$;

create or replace function wedding_private.valid_document(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := '{}';
begin
  if jsonb_typeof(value) is distinct from 'object'
     or value->'schemaVersion' is distinct from '1'::jsonb
     or octet_length(value::text) > 500000 then return false; end if;
  if not (wedding_private.valid_text(value#>'{couple,firstName}', 1, 80)
      and wedding_private.valid_text(value#>'{couple,secondName}', 1, 80)
      and wedding_private.valid_text(value#>'{intro,eyebrow}', 1, 120)
      and wedding_private.valid_text(value#>'{intro,title}', 1, 160)
      and wedding_private.valid_text(value#>'{intro,message}', 1, 4000)
      and wedding_private.valid_text(value#>'{closing,title}', 1, 160)
      and wedding_private.valid_text(value#>'{closing,message}', 1, 10000)) then return false; end if;
  if jsonb_typeof(value->'sections') is distinct from 'array' then return false; end if;
  if jsonb_array_length(value->'sections') not between 1 and 120 then return false; end if;
  for item in select * from jsonb_array_elements(value->'sections') loop
    if not (wedding_private.valid_text(item->'id', 1, 80)
        and wedding_private.valid_text(item->'title', 1, 160)
        and wedding_private.valid_text(item->'content', 1, 60000)
        and wedding_private.valid_text(item->'posture', 0, 80)) then return false; end if;
    if (item->>'id') !~ '^[a-zA-Z0-9_-]+$' or (item->>'id') = any(ids) then return false; end if;
    ids := array_append(ids, item->>'id');
    if jsonb_typeof(item->'number') is distinct from 'number'
      or not coalesce((item->>'number') ~ '^[1-9][0-9]{0,6}$', false)
      or not coalesce((item->>'chapter') in ('opening', 'word', 'marriage', 'eucharist', 'closing'), false)
      or not coalesce((item->>'category') in ('prayer', 'hymn', 'reading', 'ceremony'), false)
      then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function wedding_private.valid_text(jsonb, integer, integer) from public, anon, authenticated;
revoke all on function wedding_private.valid_document(jsonb) from public, anon, authenticated;

create table if not exists public.wedding_ceremony (
  id text primary key check (id = 'mohini-jewel'),
  document jsonb not null check (wedding_private.valid_document(document)),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.wedding_ceremony enable row level security;
revoke all on public.wedding_ceremony from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.wedding_ceremony to anon, authenticated;
drop policy if exists "Everyone can read the wedding ceremony" on public.wedding_ceremony;
create policy "Everyone can read the wedding ceremony"
  on public.wedding_ceremony for select to anon, authenticated
  using (id = 'mohini-jewel');

create or replace function public.wedding_login(p_username text, p_password text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare stored_hash text;
begin
  if p_username is null or p_password is null or length(p_username) > 80
     or octet_length(p_password) not between 1 and 72 then return false; end if;
  select password_hash into stored_hash from wedding_private.editors where username = p_username;
  if stored_hash is null then return false; end if;
  return stored_hash = extensions.crypt(p_password, stored_hash);
end;
$$;

create or replace function public.publish_wedding(
  p_username text, p_password text, p_document jsonb, p_expected_revision integer
)
returns setof public.wedding_ceremony
language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if not public.wedding_login(p_username, p_password) then
    raise exception 'INVALID_CREDENTIALS' using errcode = '28000';
  end if;
  if not wedding_private.valid_document(p_document) then
    raise exception 'INVALID_DOCUMENT' using errcode = '22023';
  end if;
  select revision into current_revision from public.wedding_ceremony
    where id = 'mohini-jewel' for update;
  if not found then raise exception 'SETUP_REQUIRED'; end if;
  if p_expected_revision is null or current_revision <> p_expected_revision then
    raise sqlstate 'PT409' using message = 'CONTENT_CONFLICT';
  end if;
  return query update public.wedding_ceremony
    set document = p_document, revision = current_revision + 1, updated_at = clock_timestamp()
    where id = 'mohini-jewel' returning *;
end;
$$;

revoke all on function public.wedding_login(text, text) from public, anon, authenticated;
revoke all on function public.publish_wedding(text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.wedding_login(text, text) to anon, authenticated;
grant execute on function public.publish_wedding(text, text, jsonb, integer) to anon, authenticated;

commit;
