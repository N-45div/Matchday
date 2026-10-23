-- Matchday Revenue Desk: everything the app reads at request time, so visitors never wait on (or spend) live API calls.

create table if not exists clubs (
  id text primary key,
  name text not null,
  nickname text,
  league text not null,
  city text not null,
  region text,
  market text not null,
  venue text,
  lat double precision,
  lng double precision,
  team_entity_id text
);
alter table clubs add column if not exists nickname text;

-- Qloo output cached per club (brand pools and nearby partners), refreshed by scripts/precompute.mts.
create table if not exists club_qloo (
  club_id text primary key references clubs(id) on delete cascade,
  fetched_at timestamptz not null,
  city_brands jsonb not null,
  fan_brands jsonb not null,
  partners jsonb not null
);

-- Next season's home dates (day/night stays null until clubs set start times).
create table if not exists home_dates (
  club_id text not null references clubs(id) on delete cascade,
  date date not null,
  day_night text,
  primary key (club_id, date)
);

-- The LLM half of the sponsor board: local consumer businesses an assistant can name (scripts/ai-prospects.mts).
create table if not exists club_ai_prospects (
  club_id text primary key references clubs(id) on delete cascade,
  model text not null,
  names jsonb not null,
  created_at timestamptz not null default now()
);
-- Names a model flagged as alcohol, gambling, tobacco or cannabis (scripts/classify-prospects.mts): { name: [restriction] }.
alter table club_ai_prospects add column if not exists restricted jsonb not null default '{}'::jsonb;

-- Each brand's median rank across every club city's Qloo brand pool, for "stronger here than in a typical club city".
create table if not exists brand_city_median (
  entity_id text primary key,
  median_rank integer not null
);

-- Daily request counts for the public demo's limits (src/lib/agent/limits.ts). Keys hold hashed addresses only.
create table if not exists usage_counts (
  key text not null,
  day date not null,
  count integer not null default 0,
  primary key (key, day)
);

-- Family theme nights for each club (scripts/load-themes.mts): family-safe subjects other clubs built theme nights on, with how
-- this club's town ranks for each among all club towns by Qloo local taste (docs/eval-plan.md section 3).
create table if not exists club_themes (
  club_id text primary key references clubs(id) on delete cascade,
  themes jsonb not null
);

-- Live theme checks from the agent (check_theme_night): one Qloo heatmap per subject, turned into each club town's pull, kept.
create table if not exists theme_checks (
  entity_id text primary key,
  name text not null,
  fetched_at timestamptz not null default now(),
  pulls jsonb not null
);
