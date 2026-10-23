// Theme-night scores by heatmap (docs/eval-plan.md section 3, amendment): one national Qloo heatmap per kept subject
// (filter.type=urn:heatmap, signal.interests.entities=<subject>), then each club's pull: the popularity-weighted mean affinity of
// the cells within 60 km of its ballpark. The same measure the agent's check_theme_night uses for any subject.
// Output: data/cache/themes/heatmap-pulls.json (gitignored). Resumable. Run: npx --yes tsx analysis/theme-heatmaps.mts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { areaPull, type Cell } from "../src/lib/geo/geohash";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const QLOO = env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const scores = JSON.parse(readFileSync("data/cache/themes/scores.json", "utf8")) as { kept: string[]; subjects: Record<string, { entityId: string }> };
const teams: { id: string; lat: number | null; lng: number | null }[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams;

const file = "data/cache/themes/heatmap-pulls.json";
const out: Record<string, Record<string, number>> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
for (const s of scores.kept) {
  if (out[s]) continue;
  let body: { results?: { heatmap?: { location: { geohash: string }; query: { affinity: number; popularity: number } }[] } } | null = null;
  for (let attempt = 0; attempt < 5 && !body; attempt++) {
    const params = new URLSearchParams({ "filter.type": "urn:heatmap", "signal.interests.entities": scores.subjects[s].entityId, "filter.location.query": "United States" });
    const res = await fetch(`${QLOO}/v2/insights?${params}`, { headers: { "X-Api-Key": env.QLOO_API_KEY } });
    if (res.ok) body = await res.json();
    else await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  if (!body) throw new Error(`heatmap failed for ${s}`);
  const cells: Cell[] = (body.results?.heatmap ?? []).map((c) => [c.location.geohash, c.query.affinity, c.query.popularity]);
  out[s] = Object.fromEntries(teams.flatMap((t) => {
    if (t.lat == null || t.lng == null) return [];
    const p = areaPull(cells, { lat: t.lat, lng: t.lng });
    return p == null ? [] : [[t.id, Math.round(p * 1000) / 1000]];
  }));
  writeFileSync(file, JSON.stringify(out));
  console.log(`${s}: ${cells.length} cells, ${Object.keys(out[s]).length} clubs`);
  await new Promise((r) => setTimeout(r, 400));
}
