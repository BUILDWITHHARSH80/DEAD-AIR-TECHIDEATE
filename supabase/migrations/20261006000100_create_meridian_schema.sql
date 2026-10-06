-- Application-owned namespace keeps this migration away from unknown public objects.
-- Apply only after reviewing the target project's schema inventory and Storage bucket.
begin;

create schema if not exists meridian;

create table if not exists meridian.teams (
  id uuid primary key,
  code text not null unique,
  name text not null,
  password text not null,
  state jsonb not null,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meridian.sessions (
  id text primary key,
  role text not null,
  team_id uuid references meridian.teams(id) on delete cascade,
  expires bigint not null
);

create table if not exists meridian.settings (
  id text primary key,
  value jsonb not null,
  revision integer not null default 0
);

create table if not exists meridian.documents (
  id text primary key,
  data jsonb not null,
  passkey text not null
);

create table if not exists meridian.challenges (
  id text primary key,
  data jsonb not null
);

create table if not exists meridian.media (
  id uuid primary key,
  team_id uuid not null references meridian.teams(id) on delete cascade,
  name text not null,
  mime text not null,
  size bigint not null,
  status text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  storage_path text not null unique
);

create table if not exists meridian.activity (
  id bigserial primary key,
  team_id uuid,
  actor text not null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists meridian.limits (
  id text primary key,
  count integer not null,
  expires bigint not null
);

create index if not exists media_team on meridian.media(team_id);
create index if not exists activity_team_time on meridian.activity(team_id, created_at);

create table if not exists meridian.file_unlocks (
  team_id uuid not null references meridian.teams(id) on delete cascade,
  document_id text not null,
  approved_at timestamptz,
  unlocked_at timestamptz,
  primary key (team_id, document_id)
);
create index if not exists file_unlocks_unlocked_at on meridian.file_unlocks(unlocked_at);
create index if not exists file_unlocks_document_id on meridian.file_unlocks(document_id);

-- Backfill epoch-millisecond maps from any prior state representation, then remove
-- those duplicate maps. This only touches rows in the isolated app-owned schema.
insert into meridian.file_unlocks(team_id, document_id, approved_at, unlocked_at)
select t.id, x.document_id, max(x.approved_at), max(x.unlocked_at)
from meridian.teams t
cross join lateral (
  select a.key as document_id,
         case when a.value ~ '^[0-9]+$' then to_timestamp(a.value::numeric / 1000) end as approved_at,
         null::timestamptz as unlocked_at
  from jsonb_each_text(coalesce(t.state->'archiveApprovals', '{}'::jsonb)) a
  union all
  select u.key, null::timestamptz,
         case when u.value ~ '^[0-9]+$' then to_timestamp(u.value::numeric / 1000) end
  from jsonb_each_text(coalesce(t.state->'unlocks', '{}'::jsonb)) u
) x
group by t.id, x.document_id
on conflict (team_id, document_id) do update
set approved_at = coalesce(meridian.file_unlocks.approved_at, excluded.approved_at),
    unlocked_at = coalesce(meridian.file_unlocks.unlocked_at, excluded.unlocked_at);

update meridian.teams
set state = state - 'unlocks' - 'archiveApprovals'
where state ? 'unlocks' or state ? 'archiveApprovals';

alter table meridian.teams enable row level security;
alter table meridian.sessions enable row level security;
alter table meridian.settings enable row level security;
alter table meridian.documents enable row level security;
alter table meridian.challenges enable row level security;
alter table meridian.media enable row level security;
alter table meridian.activity enable row level security;
alter table meridian.limits enable row level security;
alter table meridian.file_unlocks enable row level security;

revoke all on all tables in schema meridian from anon, authenticated;
revoke all on all sequences in schema meridian from anon, authenticated;
grant usage on schema meridian to service_role;
grant select, insert, update, delete on all tables in schema meridian to service_role;
grant usage, select on all sequences in schema meridian to service_role;
revoke all on schema meridian from anon, authenticated;
alter default privileges in schema meridian revoke all on tables from anon, authenticated;
alter default privileges in schema meridian revoke all on sequences from anon, authenticated;
alter default privileges in schema meridian grant select, insert, update, delete on tables to service_role;
alter default privileges in schema meridian grant usage, select on sequences to service_role;

create or replace view meridian.leaderboard_v as
with config as (
  select coalesce((value->>'startedAt')::numeric, 0) as started_at_ms,
         coalesce((value->>'hintPenalty')::boolean, true) as hint_penalty
  from meridian.settings where id = 'event'
), unlock_stats as (
  select t.id as team_id,
         count(f.unlocked_at)::integer as files_unlocked,
         count(f.unlocked_at) filter (where f.document_id in ('01','02','03','04'))::integer as main_files_unlocked,
         min(f.unlocked_at) as first_unlock_at,
         max(f.unlocked_at) as last_unlock_at,
         coalesce(jsonb_object_agg(f.document_id, f.unlocked_at) filter (where f.unlocked_at is not null), '{}'::jsonb) as unlock_times
  from meridian.teams t left join meridian.file_unlocks f on f.team_id = t.id
  group by t.id
), calculated as (
  select t.id, t.code, t.name, us.files_unlocked, us.main_files_unlocked,
         us.first_unlock_at, us.last_unlock_at,
         case when us.last_unlock_at is null or coalesce(c.started_at_ms, 0) = 0 then null
              else floor(extract(epoch from (us.last_unlock_at - to_timestamp(c.started_at_ms / 1000))) * 1000)::bigint end as elapsed_ms,
         us.unlock_times,
         (t.state->>'broadcast')::boolean as broadcast,
         (t.state->>'truth')::boolean as truth,
         coalesce((t.state->>'accuracy')::integer, 0) as accuracy,
         coalesce((select count(*) from jsonb_each(coalesce(t.state->'challenges', '{}'::jsonb)) x where x.value->>'status' = 'COMPLETED'), 0)::integer as completed_challenges,
         coalesce(jsonb_array_length(coalesce(t.state->'hints', '[]'::jsonb)), 0)::integer as hint_count,
         coalesce((select sum((x.value->>'cost')::numeric) from jsonb_array_elements(coalesce(t.state->'hints', '[]'::jsonb)) x), 0)::numeric as hint_cost
  from meridian.teams t join unlock_stats us on us.team_id = t.id cross join (select coalesce((select started_at_ms from config), 0) as started_at_ms) c
), metrics as (
  select calculated.*,
         round((completed_challenges + files_unlocked + (case when broadcast then 2 else 0 end) + (case when truth then 2 else 0 end)) * 5)::integer as progress,
         greatest(0, accuracy + round((completed_challenges + files_unlocked + (case when broadcast then 2 else 0 end) + (case when truth then 2 else 0 end)) * 5) - case when coalesce((select hint_penalty from config), true) then hint_cost else 0 end)::numeric as score,
         (broadcast::integer + truth::integer) as objectives
  from calculated
)
select row_number() over (order by files_unlocked desc, last_unlock_at asc nulls last, first_unlock_at asc nulls last, code asc)::integer as rank,
       id, code, name, files_unlocked, main_files_unlocked, first_unlock_at, last_unlock_at, elapsed_ms, unlock_times,
       progress, broadcast, truth, accuracy, score, objectives
from metrics;
revoke all on meridian.leaderboard_v from public, anon, authenticated;
grant select on meridian.leaderboard_v to service_role;

-- A pre-existing public bucket of the same name must never be silently changed.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
do $$
begin
  if exists (select 1 from storage.buckets where id = 'media' and public is true) then
    raise exception 'Storage bucket media already exists and is public; inspect it and resolve before continuing';
  end if;
end $$;

commit;
