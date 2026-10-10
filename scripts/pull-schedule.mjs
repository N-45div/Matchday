// Pulls next season's regular-season home dates for MLB and the affiliated Minor League levels.
// Output: data/raw/schedule-<season>.json (gitignored). Source: MLB Stats API.
// Run: node scripts/pull-schedule.mjs 2027
import { mkdirSync, writeFileSync } from "node:fs";

const season = process.argv[2] ?? "2027";
const SPORTS = [1, 11, 12, 13, 14];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const games = [];
for (const sportId of SPORTS) {
  for (let m = 3; m <= 10; m++) {
    const mm = String(m).padStart(2, "0");
    const last = new Date(Date.UTC(+season, m, 0)).getUTCDate();
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=${sportId}&startDate=${season}-${mm}-01&endDate=${season}-${mm}-${last}&gameType=R`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Stats API ${res.status} for ${url}`);
    const body = await res.json();
    for (const d of body.dates ?? []) {
      for (const g of d.games ?? []) {
        // Next season's start times are placeholders ("startTimeTBD") until clubs set them, so day/night is unknown.
        const tbd = g.status?.startTimeTBD === true;
        games.push({ gamePk: g.gamePk, sportId, date: d.date, start: tbd ? null : g.gameDate ?? null, dayNight: tbd ? null : g.dayNight ?? null, doubleHeader: g.doubleHeader ?? "N", homeId: g.teams?.home?.team?.id, awayId: g.teams?.away?.team?.id });
      }
    }
    await sleep(1000);
  }
}
mkdirSync("data/raw", { recursive: true });
writeFileSync(`data/raw/schedule-${season}.json`, JSON.stringify(games));
const clubs = new Set(games.map((g) => g.homeId)).size;
console.log(`${season}: ${games.length} games, ${clubs} home clubs`);
