import { sql } from "../db";

export const LEAGUE_ORDER = ["MLB", "Triple-A", "Double-A", "High-A", "Single-A"] as const;

export interface ClubSummary {
  id: string;
  name: string;
  nickname: string;
  league: string;
  city: string;
  region: string | null;
  venue: string | null;
  hasFanSignal: boolean;
}

type ClubRow = { id: string; name: string; nickname: string | null; league: string; city: string; region: string | null; venue: string | null; has_fan: boolean };

export async function listClubs(): Promise<ClubSummary[]> {
  const rows = (await sql()`select id, name, nickname, league, city, region, venue, team_entity_id is not null as has_fan from clubs`) as ClubRow[];
  return rows
    .map((r) => ({ id: r.id, name: r.name, nickname: r.nickname ?? r.name, league: r.league, city: r.city, region: r.region, venue: r.venue, hasFanSignal: r.has_fan }))
    .sort((a, b) => LEAGUE_ORDER.indexOf(a.league as never) - LEAGUE_ORDER.indexOf(b.league as never) || a.name.localeCompare(b.name));
}
