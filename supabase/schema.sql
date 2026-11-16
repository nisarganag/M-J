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
    -- Count UTF-16 units and trim the same whitespace as JavaScript strings.
    and length(value #>> '{}') + regexp_count(value #>> '{}', U&'[\+010000-\+10FFFF]') <= max_length
    and length(btrim(value #>> '{}', U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) >= min_length, false);
$$;

create or replace function wedding_private.valid_document(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := '{}'; chapter_ids text[] := '{}'; copy_key text;
  -- BEGIN GENERATED COPY LIMITS
  copy_limits constant jsonb := '{"pageTitle":[0,160],"brandCaption":[0,160],"navHome":[1,80],"navCeremony":[1,80],"navThanks":[1,80],"heroPrimary":[1,80],"heroSecondary":[1,80],"heroFootnote":[0,160],"artEyebrow":[0,160],"artCaption":[0,160],"artCaptionEmphasis":[0,160],"artNote":[0,160],"quote":[0,1000],"quoteEmphasis":[0,1000],"quoteCitation":[0,160],"toolbarMessage":[0,160],"readerEyebrow":[0,160],"readerTitle":[0,160],"readerTitleEmphasis":[0,160],"readerDescription":[0,4000],"sidebarTitle":[0,160],"participationMessage":[0,1000],"participationCaption":[0,160],"responsesHelp":[0,300],"hymnsHelp":[0,300],"filterAll":[1,80],"filterPrayer":[1,80],"filterHymn":[1,80],"filterReading":[1,80],"filterCeremony":[1,80],"categoryPrayer":[1,80],"categoryHymn":[1,80],"categoryReading":[1,80],"categoryCeremony":[1,80],"searchPlaceholder":[1,160],"momentSingular":[1,80],"momentPlural":[1,80],"resultsSelection":[1,160],"resultsCelebration":[1,160],"expandAll":[1,80],"collapseAll":[1,80],"emptyTitle":[1,160],"emptyMessage":[0,1000],"clearFilters":[1,80],"emptyCeremonyTitle":[1,160],"emptyCeremonyMessage":[0,1000],"congregationLabel":[1,80],"ceremonyEnd":[0,300],"thanksEyebrow":[0,160],"footerMessage":[0,300],"footerCaption":[0,160],"shareButton":[1,80],"printButton":[1,80],"shareTitle":[1,160],"shareDescription":[0,1000],"shareField":[1,80],"shareCopy":[1,80],"shareCopied":[1,80],"shareToast":[1,300]}'::jsonb;
  -- END GENERATED COPY LIMITS
begin
  if jsonb_typeof(value) is distinct from 'object'
     or value->'schemaVersion' is distinct from '1'::jsonb
     or octet_length(value::text) > 500000 then return false; end if;
  if not (wedding_private.valid_text(value#>'{couple,firstName}', 1, 80)
      and wedding_private.valid_text(value#>'{couple,secondName}', 1, 80)
      and wedding_private.valid_text(value#>'{intro,eyebrow}', 0, 120)
      and wedding_private.valid_text(value#>'{intro,title}', 0, 160)
      and wedding_private.valid_text(value#>'{intro,message}', 0, 4000)
      and wedding_private.valid_text(value#>'{closing,title}', 0, 160)
      and wedding_private.valid_text(value#>'{closing,message}', 0, 10000)) then return false; end if;
  -- Older ceremonies omit these fields and retain the original chapter IDs.
  if value ? 'chapters' then
    if jsonb_typeof(value->'chapters') is distinct from 'array' then return false; end if;
    if jsonb_array_length(value->'chapters') > 30 then return false; end if;
    for item in select * from jsonb_array_elements(value->'chapters') loop
      if not (wedding_private.valid_text(item->'id', 1, 80)
          and wedding_private.valid_text(item->'title', 1, 160)
          and wedding_private.valid_text(item->'caption', 0, 160)
          and wedding_private.valid_text(item->'numeral', 0, 20)) then return false; end if;
      if (item->>'id') !~ '^[a-zA-Z0-9_-]+$' or (item->>'id') = any(chapter_ids) then return false; end if;
      chapter_ids := array_append(chapter_ids, item->>'id');
    end loop;
  else
    chapter_ids := array['opening', 'word', 'marriage', 'eucharist', 'closing'];
  end if;
  if value ? 'copy' then
    if jsonb_typeof(value->'copy') is distinct from 'object' then return false; end if;
    for copy_key, item in select entry.key, entry.value from jsonb_each(value->'copy') as entry loop
      if copy_limits ? copy_key then
        if not wedding_private.valid_text(item, (copy_limits->copy_key->>0)::integer, (copy_limits->copy_key->>1)::integer) then return false; end if;
      elsif not wedding_private.valid_text(item, 0, 4000) then return false;
      end if;
    end loop;
  end if;
  if jsonb_typeof(value->'sections') is distinct from 'array' then return false; end if;
  if jsonb_array_length(value->'sections') > 120 then return false; end if;
  for item in select * from jsonb_array_elements(value->'sections') loop
    if not (wedding_private.valid_text(item->'id', 1, 80)
        and wedding_private.valid_text(item->'title', 1, 160)
        and wedding_private.valid_text(item->'content', 0, 60000)
        and wedding_private.valid_text(item->'posture', 0, 80)) then return false; end if;
    if (item->>'id') !~ '^[a-zA-Z0-9_-]+$' or (item->>'id') = any(ids) then return false; end if;
    ids := array_append(ids, item->>'id');
    if jsonb_typeof(item->'number') is distinct from 'number'
      or not coalesce((item->>'number') ~ '^[1-9][0-9]{0,6}$', false)
      or not coalesce((item->>'chapter') = any(chapter_ids), false)
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
