// Theme-night scores (docs/eval-plan.md section 3), after analysis/theme-subjects.mts:
//   - kept subjects: family-safe (the model says all ages and no vice; a film not rated R or NC-17), resolved in Qloo, with theme
//     nights at three or more clubs;
//   - Qloo local taste: each kept subject's affinity in every club's market (/v2/insights, signal.location.query = the market,
//     filter.results.entities = the kept subjects of that type);
//   - assistant: Claude Haiku 5.5's 0-10 rating for every (subject, club) pair that ran a night built on the subject.
// The same Qloo affinities feed the product's family theme suggestions. Output: data/cache/themes/scores.json (gitignored).
// Resumable. Run: npx --yes tsx analysis/theme-scores.mts
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const QLOO = env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const DIR = "data/cache/themes";
const MIN_CLUBS = 3;
const ADULT_FILM = new Set(["R", "NC-17"]);

type Answer = { subject: string | null; allAges: boolean; vice: boolean };
type Resolved = { entityId: string; qlooName: string; type: string; contentRating: string | null } | null;
const answers: Record<string, Answer> = JSON.parse(readFileSync(`${DIR}/subjects.json`, "utf8"));
const resolved: Record<string, Resolved> = JSON.parse(readFileSync(`${DIR}/resolved.json`, "utf8"));
const teams: { id: string; name: string; market: string }[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams;

const themeName = (name: string) => name.replace(/\s+(presented|powered|sponsored|brought to you)\s+by\b.*$/i, "").replace(/\s+/g, " ").trim();
const familySafe = (a: Answer | undefined) => Boolean(a?.subject && a.allAges && !a.vice);

// Clubs that ran a family-safe night built on each subject.
const clubsOf = new Map<string, Set<string>>();
for (const season of ["2025", "2026"]) {
  const games: { homeId: number; promos: { type: string; name: string | null }[] }[] = JSON.parse(readFileSync(`data/raw/games-${season}.json`, "utf8"));
  for (const g of games) {
    for (const p of g.promos) {
      if (p.type !== "Theme Days" || !p.name) continue;
      const a = answers[themeName(p.name)];
      if (!familySafe(a)) continue;
      const r = resolved[a.subject!];
      if (!r || (r.type === "urn:entity:movie" && r.contentRating && ADULT_FILM.has(r.contentRating))) continue;
      if (!clubsOf.has(a.subject!)) clubsOf.set(a.subject!, new Set());
      clubsOf.get(a.subject!)!.add(`mlb-${g.homeId}`);
    }
  }
}
const kept = [...clubsOf].filter(([, c]) => c.size >= MIN_CLUBS).map(([s]) => s).sort();
console.log(`family-safe subjects ${clubsOf.size}; kept (${MIN_CLUBS}+ clubs) ${kept.length}`);

const qloo = async (params: Record<string, string>) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${QLOO}/v2/insights?${new URLSearchParams(params)}`, { headers: { "X-Api-Key": env.QLOO_API_KEY } });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    if (!res.ok) return { results: { entities: [] } };
    return res.json();
  }
  throw new Error("Qloo kept failing");
};

const file = `${DIR}/scores.json`;
const out: { kept: string[]; subjects: Record<string, NonNullable<Resolved> & { clubs: string[] }>; qloo: Record<string, Record<string, number>>; assistant: Record<string, Record<string, number>> } =
  existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { kept: [], subjects: {}, qloo: {}, assistant: {} };
out.kept = kept;
for (const s of kept) out.subjects[s] = { ...resolved[s]!, clubs: [...clubsOf.get(s)!].sort() };

// Qloo local taste: per club market, per entity type, the kept subjects' affinities.
const byType = new Map<string, string[]>();
for (const s of kept) byType.set(resolved[s]!.type, [...(byType.get(resolved[s]!.type) ?? []), s]);
let done = 0;
for (const t of teams) {
  if (out.qloo[t.id]) continue;
  const scores: Record<string, number> = {};
  for (const [type, subjects] of byType) {
    for (let i = 0; i < subjects.length; i += 25) {
      const chunk = subjects.slice(i, i + 25);
      const idToSubject = new Map(chunk.map((s) => [resolved[s]!.entityId, s]));
      const r = await qloo({ "filter.type": type, "signal.location.query": t.market, "filter.results.entities": [...idToSubject.keys()].join(","), take: String(chunk.length) });
      for (const e of r.results?.entities ?? []) {
        const s = idToSubject.get(e.entity_id);
        if (s && typeof e.query?.affinity === "number") scores[s] = e.query.affinity;
      }
      await new Promise((r2) => setTimeout(r2, 250));
    }
  }
  out.qloo[t.id] = scores;
  if (++done % 10 === 0) { writeFileSync(file, JSON.stringify(out)); console.log(`qloo: ${done} clubs`); }
}
writeFileSync(file, JSON.stringify(out));

// Assistant: for each club, the kept subjects it ran a night on.
const ASK = (market: string, subjects: string[]) =>
  `A baseball club in ${market} is planning theme nights. For each subject below, rate from 0 to 10 how strongly families in ${market} would turn out for a theme night built on it, compared with a typical town that has a baseball club (5 = about the same as a typical town). Reply with JSON only: an object mapping each subject exactly as written to its rating.\n\n${subjects.map((s) => `- ${s}`).join("\n")}`;
for (const t of teams) {
  const subjects = kept.filter((s) => clubsOf.get(s)!.has(t.id));
  if (!subjects.length || out.assistant[t.id]) continue;
  for (let attempt = 0; attempt < 3 && !out.assistant[t.id]; attempt++) {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.VERCEL_OIDC_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "anthropic/claude-haiku-5.5", reasoning: { enabled: false }, max_tokens: 2000, messages: [{ role: "user", content: ASK(t.market, subjects) }] }),
    });
    if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const text: string = (await res.json()).choices[0].message.content ?? "";
    try {
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, number>;
      const ratings = Object.fromEntries(subjects.filter((s) => typeof parsed[s] === "number").map((s) => [s, parsed[s]]));
      if (Object.keys(ratings).length >= subjects.length * 0.8) out.assistant[t.id] = ratings;
    } catch {
      // ask again
    }
  }
  writeFileSync(file, JSON.stringify(out));
}
console.log(`qloo scores for ${Object.keys(out.qloo).length} clubs; assistant ratings for ${Object.keys(out.assistant).length} clubs`);
