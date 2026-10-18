-- Matchday Revenue Desk: everything the app reads at request time, so judges never wait on (or spend) live API calls.

create table if not exists clubs (
  id text primary key,
  name text not null,
  league text not null,
  city text not null,
  region text,
  market text not null,
  venue text,
  lat double precision,
  lng double precision,
  team_entity_id text
);

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

-- Each brand's median rank across every club city's Qloo brand pool, for "stronger here than in a typical club city".
create table if not exists brand_city_median (
  entity_id text primary key,
  median_rank integer not null
);
