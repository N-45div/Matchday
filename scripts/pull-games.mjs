// Pulls regular-season games for MLB and the four affiliated Minor League levels: attendance, promotions
// (with presenting sponsor), weather and start time. Output goes to data/raw/ (gitignored); only derived
// aggregates are committed. Source: MLB Stats API. Run: node scripts/pull-games.mjs 2025 2026
import { mkdirSync, writeFileSync } from "node:fs";

const seasons = process.argv.slice(2).length ? process.argv.slice(2) : ["2025", "2026"];
const SPORTS = [1, 11, 12, 13, 14];
const HYDRATE = "game(promotions),gameInfo,weather";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function monthWindows(season) {
  const windows = [];
  for (let m = 3; m <= 10; m++) {
    const last = new Date(Date.UTC(+season, m, 0)).getUTCDate();
    const mm = String(m).padStart(2, "0");
    windows.push([`${season}-${mm}-01`, `${season}-${mm}-${last}`]);
  }
  return windows;
}

function toGame(sportId, date, g) {
  const promos = (g.promotions ?? []).map((p) => ({ type: p.offerType ?? null, name: p.name ?? null, presentedBy: p.presentedBy ?? null }));
  return {
    gamePk: g.gamePk,
    sportId,
    date,
    status: g.status?.abstractGameState,
    dayNight: g.dayNight ?? null,
    doubleHeader: g.doubleHeader ?? "N",
    homeId: g.teams?.home?.team?.id,
    awayId: g.teams?.away?.team?.id,
    attendance: g.gameInfo?.attendance ?? null,
    delayMinutes: g.gameInfo?.delayDurationMinutes ?? 0,
    weather: g.weather ? { condition: g.weather.condition ?? null, temp: g.weather.temp != null ? Number(g.weather.temp) : null } : null,
    promos,
  };
}

mkdirSync("data/raw", { recursive: true });
for (const season of seasons) {
  const games = [];
  for (const sportId of SPORTS) {
    for (const [start, end] of monthWindows(season)) {
      const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=${sportId}&startDate=${start}&endDate=${end}&gameType=R&hydrate=${HYDRATE}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Stats API ${res.status} for ${url}`);
      const body = await res.json();
      for (const d of body.dates ?? []) for (const g of d.games ?? []) games.push(toGame(sportId, d.date, g));
      await sleep(1000);
    }
  }
  const final = games.filter((g) => g.status === "Final");
  writeFileSync(`data/raw/games-${season}.json`, JSON.stringify(games));
  const withAtt = final.filter((g) => g.attendance > 0).length;
  const withPromo = final.filter((g) => g.promos.length).length;
  console.log(`${season}: ${games.length} games (${final.length} final, ${withAtt} with attendance, ${withPromo} with promotions)`);
}
