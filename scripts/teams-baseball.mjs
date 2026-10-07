// Builds data/teams/baseball.json: MLB + affiliated Minor League clubs with their ballpark location.
// Source: MLB Stats API (public). Run: node scripts/teams-baseball.mjs [season]
import { mkdirSync, writeFileSync } from "node:fs";

const season = process.argv[2] ?? "2026";
const LEVEL = { 1: "MLB", 11: "Triple-A", 12: "Double-A", 13: "High-A", 14: "Single-A" };
const url = `https://statsapi.mlb.com/api/v1/teams?sportIds=1,11,12,13,14&season=${season}&hydrate=venue(location)`;

const res = await fetch(url);
if (!res.ok) throw new Error(`Stats API returned ${res.status}`);
const { teams } = await res.json();

const rows = teams
  .map((t) => {
    const loc = t.venue?.location ?? {};
    return {
      id: `mlb-${t.id}`,
      name: t.name,
      league: LEVEL[t.sport.id],
      city: loc.city ?? t.locationName,
      region: loc.state ?? null,
      country: loc.country ?? null,
      venue: t.venue?.name ?? null,
      lat: loc.defaultCoordinates?.latitude ?? null,
      lng: loc.defaultCoordinates?.longitude ?? null,
    };
  })
  .sort((a, b) => Object.values(LEVEL).indexOf(a.league) - Object.values(LEVEL).indexOf(b.league) || a.name.localeCompare(b.name));

mkdirSync("data/teams", { recursive: true });
writeFileSync("data/teams/baseball.json", JSON.stringify({ season, source: "MLB Stats API", teams: rows }, null, 2) + "\n");
// New ballparks can lack coordinates; the precompute step geocodes them from the venue name.
const noCoords = rows.filter((r) => r.lat == null).map((r) => r.name);
console.log(`${rows.length} teams written${noCoords.length ? `; no coordinates yet: ${noCoords.join(", ")}` : ""}`);
