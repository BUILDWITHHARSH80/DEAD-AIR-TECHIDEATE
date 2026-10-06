-- Test-only fixture helper. The integration suite creates this only after
-- TEST_DB_ISOLATED=true and requires TEST_SUPABASE_DB_URL.
create schema if not exists meridian_test;

create or replace function meridian_test.backdate_file_unlock(
  p_team uuid,
  p_document text,
  p_at timestamptz
) returns void
language sql
set search_path = pg_catalog, meridian
as $$
  insert into file_unlocks(team_id, document_id, approved_at, unlocked_at)
  values (p_team, p_document, now(), p_at)
  on conflict (team_id, document_id)
  do update set unlocked_at = excluded.unlocked_at
$$;
