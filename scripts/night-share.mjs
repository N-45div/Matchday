// Builds data/lift/night-share.json: for each club, the share of its 2025-26 home games on each weekday that were night games.
// Next season's start times are placeholders until clubs set them, so the planner uses this to keep fireworks off weekdays the
// club usually plays in daylight (most minor league Sundays). Run: node scripts/night-share.mjs (needs data/raw from pull-games).
import { readFileSync, writeFileSync } from "node:fs";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const tally = new Map();
for (const season of ["2025", "2026"]) {
  for (const g of JSON.parse(readFileSync(`data/raw/games-${season}.json`, "utf8"))) {
    if (g.status !== "Final" || (g.dayNight !== "day" && g.dayNight !== "night")) continue;
    const club = `mlb-${g.homeId}`;
    const day = WEEKDAYS[new Date(`${g.date}T12:00:00Z`).getUTCDay()];
    const byDay = tally.get(club) ?? {};
    const t = (byDay[day] ??= { night: 0, all: 0 });
    t.all++;
    if (g.dayNight === "night") t.night++;
    tally.set(club, byDay);
  }
}
const out = {};
for (const [club, byDay] of [...tally].sort()) {
  out[club] = Object.fromEntries(WEEKDAYS.filter((d) => byDay[d]?.all >= 4).map((d) => [d, Math.round((byDay[d].night / byDay[d].all) * 100) / 100]));
}
writeFileSync("data/lift/night-share.json", JSON.stringify({ source: "MLB Stats API, 2025-26 regular-season home games", clubs: out }) + "\n");
const sundays = Object.values(out).map((c) => c.Sunday).filter((v) => v != null);
console.log(`${Object.keys(out).length} clubs; clubs playing most Sundays in daylight: ${sundays.filter((v) => v < 0.5).length} of ${sundays.length}`);
