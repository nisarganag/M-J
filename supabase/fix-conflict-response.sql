-- One-time correction for projects initialized before the conflict-response fix.
-- Stops hanging requests for this app's publish function, then replaces only
-- that function. Ceremony text, revisions, and login credentials are preserved.

select pid, pg_terminate_backend(pid) as stopped_hanging_save
from pg_stat_activity
where usename = 'authenticator'
  and pid <> pg_backend_pid()
  and state = 'active'
  and query ilike '%publish_wedding%';

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

notify pgrst, 'reload schema';
