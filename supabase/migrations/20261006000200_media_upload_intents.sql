begin;

create table if not exists meridian.media_upload_intents (
  id uuid primary key,
  team_id uuid not null references meridian.teams(id) on delete cascade,
  name text not null,
  mime text not null,
  size bigint not null check (size > 0),
  storage_path text not null unique,
  expires bigint not null
);
create index if not exists media_upload_intents_team_expiry
  on meridian.media_upload_intents(team_id, expires);

alter table meridian.media_upload_intents enable row level security;
revoke all on meridian.media_upload_intents from anon, authenticated;
grant select, insert, update, delete on meridian.media_upload_intents to service_role;
alter default privileges in schema meridian revoke all on tables from anon, authenticated;
alter default privileges in schema meridian grant select, insert, update, delete on tables to service_role;

commit;
