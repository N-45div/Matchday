// Loads each club's family theme subjects into Postgres: every kept subject (analysis/theme-scores.mts) with the share of club towns
// this club's ballpark out-ranks for it by Qloo heatmap pull (analysis/theme-heatmaps.mts), as docs/eval-plan.md section 3's amendment
// fixed. The desk shows the strongest few. Safe to re-run (upserts).
// Run: npx --yes tsx scripts/load-themes.mts
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const sql = neon(env.DATABASE_URL);
await sql.query("create table if not exists club_themes (club_id text primary key references clubs(id) on delete cascade, themes jsonb not null)");

const scores = JSON.parse(readFileSync("data/cache/themes/scores.json", "utf8")) as {
  kept: string[];
  subjects: Record<string, { entityId: string; qlooName: string; type: string; clubs: string[] }>;
};
const pulls = JSON.parse(readFileSync("data/cache/themes/heatmap-pulls.json", "utf8")) as Record<string, Record<string, number>>;
// Matchday's own family rule on top of the test's: a band tied to drug culture stays out of the ideas a club is shown.
const NOT_SUGGESTED = new Set(["Grateful Dead"]);
// Qloo files some subjects under another type (Peppa Pig as a music artist); the label follows what the night is about.
const KIND_OVERRIDE: Record<string, string> = { "Peppa Pig": "TV show" };
const KIND: Record<string, string> = { "urn:entity:brand": "brand", "urn:entity:movie": "film", "urn:entity:tv_show": "TV show", "urn:entity:artist": "music", "urn:entity:videogame": "game" };

// For each subject, every club's pull, to rank one town against the rest.
const bySubject = new Map(scores.kept.map((s) => [s, Object.entries(pulls[s] ?? {})]));
const clubs = (await sql`select id from clubs`) as { id: string }[];
let loaded = 0;
for (const { id } of clubs) {
  const mine = Object.fromEntries(scores.kept.filter((s) => pulls[s]?.[id] != null).map((s) => [s, pulls[s][id]]));
  const themes = scores.kept
    .filter((s) => s in mine && !NOT_SUGGESTED.has(s))
    .map((s) => {
      const all = bySubject.get(s)!;
      const below = all.filter(([, a]) => a < mine[s]).length;
      return {
        subject: s,
        qlooName: scores.subjects[s].qlooName,
        kind: KIND_OVERRIDE[s] ?? KIND[scores.subjects[s].type] ?? "subject",
        /** Share of other club towns this town out-ranks for the subject (1 = the strongest of all). */
        percentile: Math.round((below / Math.max(all.length - 1, 1)) * 100) / 100,
        clubsRan: scores.subjects[s].clubs.length,
        ranHere: scores.subjects[s].clubs.includes(id),
      };
    })
    .sort((a, b) => b.percentile - a.percentile || b.clubsRan - a.clubsRan);
  await sql`insert into club_themes (club_id, themes) values (${id}, ${JSON.stringify(themes)}) on conflict (club_id) do update set themes = excluded.themes`;
  loaded++;
}
console.log(`themes for ${loaded} clubs, ${scores.kept.length} subjects`);
