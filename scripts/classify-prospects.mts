// Flags assistant-named businesses the board must leave off: alcohol (beer, wine, cider and spirits brands, breweries,
// wineries, bars), gambling, tobacco or vaping, and cannabis. Brand names like "Labatt Blue" or "Red Newt Cellars" say
// nothing in their words, so a keyword rule misses them; a model reads each club's list once instead.
// Output: data/cache/prospect-flags/<team id>.json (gitignored), loaded by scripts/load-db.mts.
// Run: npx --yes tsx scripts/classify-prospects.mts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const teams: { id: string; market: string }[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams;
const OUT = "data/cache/prospect-flags";
const KINDS = ["alcohol", "gambling", "tobacco", "cannabis"] as const;
mkdirSync(OUT, { recursive: true });

async function classify(names: string[], market: string): Promise<Record<string, string[]>> {
  const prompt = [
    `These are businesses and brands in or near ${market}. For each one that is mainly one of the following, say which:`,
    "- alcohol: beer, wine, cider, hard seltzer or spirits brands, breweries, brewpubs, wineries, cellars, vineyards, distilleries, taprooms, bars, pubs, liquor stores",
    "- gambling: casinos, sportsbooks, lotteries, racinos",
    "- tobacco: tobacco, cigars, vapes, nicotine products",
    "- cannabis: cannabis or CBD brands and dispensaries",
    "Grocery stores, restaurants, soft drinks, coffee, juice and water are none of these.",
    'Answer with JSON only: {"alcohol": [...], "gambling": [...], "tobacco": [...], "cannabis": [...]}, copying names exactly as given. Leave out every name that is none of these.',
    "",
    ...names,
  ].join("\n");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.VERCEL_OIDC_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "anthropic/claude-haiku-5.5", temperature: 0, reasoning: { enabled: false }, max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const text: string = (await res.json()).choices[0].message.content ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    try {
      const parsed = JSON.parse(json) as Record<string, string[]>;
      const known = new Set(names);
      const flags: Record<string, string[]> = {};
      for (const kind of KINDS) for (const name of parsed[kind] ?? []) if (known.has(name)) (flags[name] ??= []).push(kind);
      return flags;
    } catch {
      // A malformed answer: ask again.
    }
  }
  throw new Error(`no usable answer for ${market}`);
}

let done = 0, flagged = 0;
for (const t of teams) {
  const out = `${OUT}/${t.id}.json`;
  const source = `data/cache/prospects/${t.id}.json`;
  if (existsSync(out) || !existsSync(source)) continue;
  const names = (JSON.parse(readFileSync(source, "utf8")) as { name: string }[]).map((x) => x.name).slice(0, 150);
  const flags = await classify(names, t.market);
  writeFileSync(out, JSON.stringify(flags));
  done++;
  flagged += Object.keys(flags).length;
}
console.log(`classified ${done} clubs, flagged ${flagged} names`);
