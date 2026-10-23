// Theme-night subjects (docs/eval-plan.md section 3). For each distinct 2025-26 "Theme Days" name: the pop-culture subject the
// night is built on (Claude Haiku 5.5, the fixed prompt below), whether it suits all ages and whether it is about a vice; then the
// subject resolved in Qloo (/search: the first brand, film, TV show, artist or video game) and, for films, Qloo's content rating.
// Output: data/cache/themes/{subjects,resolved}.json (gitignored). Resumable. Run: npx --yes tsx analysis/theme-subjects.mts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const QLOO = env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const OUT = "data/cache/themes";
mkdirSync(OUT, { recursive: true });

/** The theme itself, without its sponsor: "Star Wars Night presented by Pepsi" -> "Star Wars Night". */
const themeName = (name: string) => name.replace(/\s+(presented|powered|sponsored|brought to you)\s+by\b.*$/i, "").replace(/\s+/g, " ").trim();

type Game = { status: string; attendance: number | null; doubleHeader: string; homeId: number; promos: { type: string; name: string | null }[] };
const names = new Map<string, Set<number>>();
for (const season of ["2025", "2026"]) {
  const games: Game[] = JSON.parse(readFileSync(`data/raw/games-${season}.json`, "utf8"));
  for (const g of games) {
    for (const p of g.promos) {
      if (p.type !== "Theme Days" || !p.name) continue;
      const n = themeName(p.name);
      if (!names.has(n)) names.set(n, new Set());
      names.get(n)!.add(g.homeId);
    }
  }
}

const PROMPT = `Each numbered line below is the name of a theme night at a US baseball game. For each line, name the pop-culture subject the night is built on: one specific film, TV show, media franchise, character, music artist or band, or video game, written as it is usually known (for example "Star Wars", "Bluey", "Taylor Swift").
Answer null when the night is built on anything else: appreciation or heritage nights, faith and family nights, holidays, drink or food specials, pets, other sports, kids running the bases, and generic themes with no named title (such as "superhero night" or "princess night").
Also say whether the subject suits all ages (allAges: true or false) and whether the night is about alcohol, gambling or tobacco (vice: true or false).
Reply with JSON only: an array of {"i": line number, "subject": string or null, "allAges": boolean, "vice": boolean}.`;

async function ask(lines: string[]): Promise<{ i: number; subject: string | null; allAges: boolean; vice: boolean }[]> {
  const body = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.VERCEL_OIDC_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "anthropic/claude-haiku-5.5", reasoning: { enabled: false }, max_tokens: 6000, messages: [{ role: "user", content: `${PROMPT}\n\n${body}` }] }),
    });
    if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const text: string = (await res.json()).choices[0].message.content ?? "";
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed) && parsed.length >= lines.length * 0.9) return parsed;
    } catch {
      // ask again
    }
  }
  throw new Error("model answer kept failing to parse");
}

// 1. Subjects from the model, cached per theme name.
const subjectsFile = `${OUT}/subjects.json`;
const subjects: Record<string, { subject: string | null; allAges: boolean; vice: boolean; clubs: number }> = existsSync(subjectsFile) ? JSON.parse(readFileSync(subjectsFile, "utf8")) : {};
const todo = [...names.keys()].filter((n) => !(n in subjects));
for (let i = 0; i < todo.length; i += 60) {
  const batch = todo.slice(i, i + 60);
  const answers = await ask(batch);
  for (const a of answers) {
    const n = batch[a.i - 1];
    if (n) subjects[n] = { subject: a.subject?.trim() || null, allAges: Boolean(a.allAges), vice: Boolean(a.vice), clubs: names.get(n)!.size };
  }
  writeFileSync(subjectsFile, JSON.stringify(subjects, null, 1));
  console.log(`subjects: ${Math.min(i + 60, todo.length)} of ${todo.length}`);
}

// 2. Each distinct subject resolved in Qloo.
const MAPPABLE = ["urn:entity:brand", "urn:entity:movie", "urn:entity:tv_show", "urn:entity:artist", "urn:entity:videogame"];
const qloo = async (path: string, params: Record<string, string>) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${QLOO}${path}?${new URLSearchParams(params)}`, { headers: { "X-Api-Key": env.QLOO_API_KEY } });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    return res.json();
  }
  throw new Error(`Qloo kept failing on ${path}`);
};
const resolvedFile = `${OUT}/resolved.json`;
const resolved: Record<string, { entityId: string; qlooName: string; type: string; contentRating: string | null } | null> = existsSync(resolvedFile) ? JSON.parse(readFileSync(resolvedFile, "utf8")) : {};
const distinct = [...new Set(Object.values(subjects).map((s) => s.subject).filter((s): s is string => Boolean(s)))].filter((s) => !(s in resolved));
for (const [k, subject] of distinct.entries()) {
  const hits = ((await qloo("/search", { query: subject, take: "5" })).results ?? []) as { entity_id: string; name: string; types?: string[]; properties?: { content_rating?: string } }[];
  const hit = hits.find((e) => e.types?.some((t) => MAPPABLE.includes(t)));
  if (!hit) { resolved[subject] = null; continue; }
  const type = hit.types!.find((t) => MAPPABLE.includes(t))!;
  let contentRating: string | null = hit.properties?.content_rating ?? null;
  if (type === "urn:entity:movie" && !contentRating) {
    const e = ((await qloo("/entities", { entity_ids: hit.entity_id })).results ?? [])[0];
    contentRating = e?.properties?.content_rating ?? null;
  }
  resolved[subject] = { entityId: hit.entity_id, qlooName: hit.name, type, contentRating };
  if (k % 25 === 24) { writeFileSync(resolvedFile, JSON.stringify(resolved, null, 1)); console.log(`resolved ${k + 1} of ${distinct.length}`); }
  await new Promise((r) => setTimeout(r, 250));
}
writeFileSync(resolvedFile, JSON.stringify(resolved, null, 1));
const withSubject = Object.values(subjects).filter((s) => s.subject).length;
console.log(`theme names ${names.size}; with a subject ${withSubject}; distinct subjects ${Object.keys(resolved).length}; resolved ${Object.values(resolved).filter(Boolean).length}`);
