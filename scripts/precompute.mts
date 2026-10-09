// Precomputes Qloo data for every club so the app never waits on cold API calls:
//   - the club's own Qloo entity (exact name match only)
//   - city brand pool and city + fan-base brand pool (300 each)
//   - food and drink partners within 3 km of the ballpark
// Output: data/cache/clubs/<team id>.json (gitignored: Qloo output is never committed).
// Run: npx --yes tsx scripts/precompute.mts [--force] [team id ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { QlooClient } from "../src/lib/qloo/client";
import { partnerQuery } from "../src/lib/partners/partners";

interface Team { id: string; name: string; league: string; city: string; region: string | null; market: string; venue: string | null; lat: number | null; lng: number | null }

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const client = new QlooClient({ apiKey: env.QLOO_API_KEY, baseUrl: env.QLOO_BASE_URL });
const get = <T,>(path: string, params: Record<string, unknown>) => client.get<T>(path, params as never);

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = new Set(args.filter((a) => !a.startsWith("--")));
const teams: Team[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams.filter((t: Team) => !only.size || only.has(t.id));
const OUT = "data/cache/clubs";
mkdirSync(OUT, { recursive: true });

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// Keep only what the app reads; Qloo entities carry long descriptions we don't need.
const slimBrand = (e: any) => ({ entity_id: e.entity_id, name: e.name, popularity: e.popularity, tags: (e.tags ?? []).map((t: any) => ({ id: t.id ?? t.tag_id })).filter((t: any) => /genre:brand|brand_type/.test(t.id)) });
const slimPlace = (e: any) => ({ entity_id: e.entity_id, name: e.name, location: e.location, tags: (e.tags ?? []).filter((t: any) => /genre:place/.test(t.id ?? t.tag_id)), properties: { address: e.properties?.address, neighborhood: e.properties?.neighborhood, phone: e.properties?.phone, website: e.properties?.website, price_level: e.properties?.price_level, business_rating: e.properties?.business_rating, is_closed: e.properties?.is_closed, hours: e.properties?.hours } });

async function brandPool(extra: Record<string, unknown>, pages = 6) {
  const out: unknown[] = [];
  for (let page = 1; page <= pages; page++) {
    const r = await get<any>("/v2/insights", { "filter.type": "urn:entity:brand", take: 50, page, ...extra });
    const list = r.results?.entities ?? [];
    out.push(...list.map(slimBrand));
    if (list.length < 50) break;
  }
  return out;
}

async function precompute(team: Team) {
  const file = `${OUT}/${team.id}.json`;
  if (!force && existsSync(file)) return "cached";
  const location = team.market;
  const hits = (await get<any>("/search", { query: team.name, types: "urn:entity:brand", take: 3 })).results ?? [];
  const teamEntity = hits.find((h: any) => norm(h.name) === norm(team.name)) ?? null;
  const city = await brandPool({ "signal.location.query": location });
  const teamCity = teamEntity ? await brandPool({ "signal.location.query": location, "signal.interests.entities": teamEntity.entity_id }) : [];
  const partners = team.lat != null && team.lng != null
    ? ((await get<any>("/v2/insights", partnerQuery({ lat: team.lat, lng: team.lng }, teamEntity?.entity_id))).results?.entities ?? []).map(slimPlace)
    : [];
  if (!city.length) console.log(`  warning: no brands for "${location}"; add a market override in scripts/teams-baseball.mjs`);
  writeFileSync(file, JSON.stringify({ team: team.id, location, teamEntityId: teamEntity?.entity_id ?? null, fetchedAt: new Date().toISOString(), city, teamCity, partners }));
  return `city ${city.length}, fans ${teamCity.length}, partners ${partners.length}`;
}

let next = 0;
const failures: string[] = [];
async function worker() {
  while (next < teams.length) {
    const team = teams[next++];
    try {
      console.log(`${team.name}: ${await precompute(team)}`);
    } catch (error) {
      failures.push(team.name);
      console.log(`${team.name}: FAILED ${(error as Error).message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log(`done: ${teams.length - failures.length}/${teams.length}${failures.length ? `; failed: ${failures.join(", ")}` : ""}`);
