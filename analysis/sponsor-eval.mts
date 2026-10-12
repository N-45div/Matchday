// Sponsor-fit evaluation, exactly as written in docs/eval-plan.md (section 2 and its Oct 13 amendment).
// Labels: each club's 2026 promotion presenters (data/raw/games-2026.json).
// Rankers: city, city + fan base, Desk fusion, LLM only, placebo (another club's city), national.
// Writes aggregates only to data/eval/sponsor-fit.json; resolutions and LLM answers are cached in data/cache/eval/.
// Run: npx --yes tsx analysis/sponsor-eval.mts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { QlooClient } from "../src/lib/qloo/client";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
// One key is shared by every script: run evaluations alone, and retry rate limits patiently.
const qloo = new QlooClient({ apiKey: env.QLOO_API_KEY, baseUrl: env.QLOO_BASE_URL, maxAttempts: 6 });
const CACHE = "data/cache/eval";
mkdirSync(`${CACHE}/llm`, { recursive: true });
mkdirSync("data/eval", { recursive: true });
const readJson = (f: string, fallback: any) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fallback);

// ---------- names ----------
const STOP = new Set(["inc", "llc", "co", "company", "the", "and", "of", "corp", "corporation", "group", "presented", "by"]);
const toks = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/'s\b/g, "s").split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
export const sim = (a: string, b: string) => {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  return [...A].filter((x) => B.has(x)).length / Math.max(A.size, B.size);
};
const GUARD = 0.6;

// ---------- labels ----------
interface Team { id: string; name: string; league: string; market: string }
const teams: Team[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams;
const games = JSON.parse(readFileSync("data/raw/games-2026.json", "utf8")) as { homeId: number; promos: { presentedBy: string | null }[] }[];
const presenters = new Map<string, Set<string>>();
for (const g of games) {
  for (const p of g.promos) {
    if (!p.presentedBy) continue;
    for (const part of p.presentedBy.split(/\s*(?:,|&| and |\/|\+)\s*/i)) {
      const s = part.trim();
      if (s.length < 3 || /^(inc\.?|llc|m)$/i.test(s)) continue;
      const id = `mlb-${g.homeId}`;
      if (!presenters.has(id)) presenters.set(id, new Set());
      presenters.get(id)!.add(s);
    }
  }
}
const evalTeams = teams.filter((t) => presenters.has(t.id) && existsSync(`data/cache/clubs/${t.id}.json`));

const resolved: Record<string, { id: string; name: string } | null> = readJson(`${CACHE}/labels.json`, {});
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}
// QLOO_OFFLINE=1 skips every live Qloo call (label resolution and the national pool) when the key's quota is spent.
// Name-match scoring still runs; ID-match and the national ranker are reported once the quota is back.
const OFFLINE = process.env.QLOO_OFFLINE === "1";
const todo = OFFLINE ? [] : [...new Set(evalTeams.flatMap((t) => [...presenters.get(t.id)!]))].filter((s) => !(s in resolved));
let done = 0;
await pool(todo, 3, async (s) => {
  try {
    const r = await qloo.get<any>("/search", { query: s, types: "urn:entity:brand", take: 3 });
    const ok = (r.results ?? []).filter((e: any) => !(e.tags ?? []).some((t: any) => /sports_organization/.test(t.id ?? t.tag_id ?? "")));
    const best = ok.map((e: any) => ({ e, v: sim(s, e.name) })).filter((x: any) => x.v >= GUARD).sort((a: any, b: any) => b.v - a.v)[0];
    resolved[s] = best ? { id: best.e.entity_id, name: best.e.name } : null;
  } catch (error) {
    console.log(`  search failed for "${s}" (${(error as Error).message}); will retry on the next run`);
  }
  if (++done % 25 === 0) writeFileSync(`${CACHE}/labels.json`, JSON.stringify(resolved));
});
writeFileSync(`${CACHE}/labels.json`, JSON.stringify(resolved));
const pending = OFFLINE ? [] : todo.filter((s) => !(s in resolved));
if (pending.length) throw new Error(`${pending.length} sponsor names still unresolved; run again to finish`);

// ---------- rankers ----------
const national: { id: string; name: string }[] | null = readJson(`${CACHE}/national.json`, null) ?? (OFFLINE ? null : await (async () => {
  const ids: { id: string; name: string }[] = [];
  for (let page = 1; page <= 6; page++) {
    const r = await qloo.get<any>("/v2/insights", { "filter.type": "urn:entity:brand", "signal.interests.tags": "urn:tag:genre:brand:retail", take: 50, page });
    ids.push(...(r.results?.entities ?? []).map((e: any) => ({ id: e.entity_id, name: e.name })));
  }
  writeFileSync(`${CACHE}/national.json`, JSON.stringify(ids));
  return ids;
})());
const clubCache = (id: string) => JSON.parse(readFileSync(`data/cache/clubs/${id}.json`, "utf8"));
type Ranked = { id: string | null; name: string }[];
const fuse = (a: Ranked, b: Ranked): Ranked => {
  const score = new Map<string, { name: string; s: number }>();
  const add = (list: Ranked) => list.forEach((x, r) => { const k = x.id!; const e = score.get(k) ?? { name: x.name, s: 0 }; e.s += 1 / (60 + r); score.set(k, e); });
  add(a); add(b);
  return [...score.entries()].sort((x, y) => y[1].s - x[1].s).map(([id, v]) => ({ id, name: v.name }));
};

async function llmBrands(t: Team): Promise<Ranked> {
  const file = `${CACHE}/llm/${t.id}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const prompt = `List 300 regional or local consumer brands (food, drink, grocery, restaurants, retail, consumer services) that would plausibly sponsor promotional nights for the ${t.name} (${t.league} baseball) in ${t.market}. Return only brand names, one per line, most likely first. Do not include sports teams, leagues or media outlets.`;
  const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.VERCEL_OIDC_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "anthropic/claude-haiku-5.5", temperature: 0, reasoning: { enabled: false }, max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text: string = (await res.json()).choices[0].message.content;
  const names = text.split(/\r?\n/).map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim()).filter((l) => l && l.length < 80).slice(0, 300);
  const ranked = names.map((name) => ({ id: null, name }));
  writeFileSync(file, JSON.stringify(ranked));
  return ranked;
}
const llm = new Map<string, Ranked>();
await pool(evalTeams, 4, async (t) => { llm.set(t.id, await llmBrands(t)); });

// ---------- scoring ----------
const RANKERS = (["city", "fans", "desk", "llm", "placebo", "national"] as const).filter((r) => r !== "national" || national);
type Row = { club: string; league: string; labels: number; resolved: number } & Record<string, number>;
const rows: Row[] = [];
evalTeams.forEach((t, i) => {
  const c = clubCache(t.id);
  const city: Ranked = c.city.map((e: any) => ({ id: e.entity_id, name: e.name }));
  const fans: Ranked = c.teamCity.map((e: any) => ({ id: e.entity_id, name: e.name }));
  const other = clubCache(teams[(teams.findIndex((x) => x.id === t.id) + 11) % teams.length].id);
  const lists: Record<string, Ranked> = {
    city,
    fans,
    desk: fans.length ? fuse(city, fans) : city,
    llm: llm.get(t.id) ?? [],
    placebo: other.city.map((e: any) => ({ id: e.entity_id, name: e.name })),
    national: national ?? [],
  };
  const labelNames = [...presenters.get(t.id)!];
  const labelIds = new Set(labelNames.map((s) => resolved[s]?.id).filter(Boolean) as string[]);
  const row: Row = { club: t.name, league: t.league, labels: labelNames.length, resolved: labelIds.size } as Row;
  for (const r of RANKERS) {
    for (const k of [100, 300]) {
      const top = lists[r].slice(0, k);
      row[`${r}_name${k}`] = labelNames.filter((l) => top.some((x) => sim(l, x.name) >= GUARD)).length;
      if (r !== "llm" && !OFFLINE) row[`${r}_id${k}`] = top.filter((x) => x.id && labelIds.has(x.id)).length;
    }
  }
  rows.push(row);
});

// Bootstrap over clubs (seeded, 2,000 resamples).
let seed = 20261013;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const sumOf = (rs: Row[], k: string) => rs.reduce((a, r) => a + (r[k] ?? 0), 0);
const ci = (vals: number[]) => { const s = [...vals].sort((a, b) => a - b); return [s[Math.floor(0.025 * s.length)], s[Math.floor(0.975 * s.length)]]; };
const keys = Object.keys(rows[0]).filter((k) => /_(name|id)\d+$/.test(k));
const diffs = [["desk_name300", "llm_name300"], ["desk_name300", "placebo_name300"], ["desk_name100", "llm_name100"], ...(OFFLINE ? [] : [["desk_id300", "placebo_id300"]])];
const boots: Record<string, number[]> = Object.fromEntries([...keys, ...diffs.map(([a, b]) => `${a}-${b}`)].map((k) => [k, []]));
for (let b = 0; b < 2000; b++) {
  const sample = rows.map(() => rows[Math.floor(rand() * rows.length)]);
  for (const k of keys) boots[k].push(sumOf(sample, k));
  for (const [a, c] of diffs) boots[`${a}-${c}`].push(sumOf(sample, a) - sumOf(sample, c));
}
const totals = Object.fromEntries(keys.map((k) => [k, { found: sumOf(rows, k), ci95: ci(boots[k]) }]));
const differences = Object.fromEntries(diffs.map(([a, c]) => [`${a} minus ${c}`, { value: sumOf(rows, a) - sumOf(rows, c), ci95: ci(boots[`${a}-${c}`]) }]));
const labelCount = sumOf(rows, "labels");
const resolvedCount = sumOf(rows, "resolved");
const out = {
  clubs: rows.length,
  labels: labelCount,
  labelsResolvedToQloo: OFFLINE ? null : resolvedCount,
  resolutionRate: OFFLINE ? null : Math.round((1000 * resolvedCount) / labelCount) / 10,
  offline: OFFLINE ? "Qloo key quota spent: ID-match scoring and the national ranker are pending" : undefined,
  model: "anthropic/claude-haiku-5.5 (LLM-only arm)",
  totals,
  differences,
  perClub: rows,
};
writeFileSync("data/eval/sponsor-fit.json", JSON.stringify(out, null, 1).replace(/\n\s+(?=[\d\]"-])/g, " "));
console.log(JSON.stringify({ clubs: out.clubs, labels: labelCount, resolved: resolvedCount, totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.found])), differences }, null, 1));
