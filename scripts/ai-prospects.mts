// Builds each club's "local businesses an assistant can name" list: the LLM half of the evaluated hybrid
// (docs/eval-plan.md amendment 2 used the LLM's top 150 names). Uses the evaluation's exact prompt.
// Reuses evaluation answers that already have 150+ names; asks again (up to 3 tries) for the rest.
// Output: data/cache/prospects/<team id>.json (gitignored). Run: npx --yes tsx scripts/ai-prospects.mts
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
interface Team { id: string; name: string; league: string; market: string }
const teams: Team[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams;
const OUT = "data/cache/prospects";
const EVAL = "data/cache/eval/llm";
const NEEDED = 150;
mkdirSync(OUT, { recursive: true });

const count = (file: string) => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as unknown[]).length : 0);

async function ask(t: Team): Promise<{ id: null; name: string }[]> {
  const prompt = `List 300 regional or local consumer brands (food, drink, grocery, restaurants, retail, consumer services) that would plausibly sponsor promotional nights for the ${t.name} (${t.league} baseball) in ${t.market}. Return only brand names, one per line, most likely first. Do not include sports teams, leagues or media outlets.`;
  const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.VERCEL_OIDC_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "anthropic/claude-haiku-5.5", temperature: 0, reasoning: { enabled: false }, max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text: string = (await res.json()).choices[0].message.content ?? "";
  return text.split(/\r?\n/).map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim()).filter((l) => l && l.length < 80 && !/^(here|note|i |these)/i.test(l)).slice(0, 300).map((name) => ({ id: null, name }));
}

let reused = 0, asked = 0;
const short: string[] = [];
for (const t of teams) {
  const out = `${OUT}/${t.id}.json`;
  if (count(out) >= NEEDED) continue;
  const fromEval = `${EVAL}/${t.id}.json`;
  if (count(fromEval) >= NEEDED) { copyFileSync(fromEval, out); reused++; continue; }
  let best: { id: null; name: string }[] = [];
  for (let attempt = 0; attempt < 3 && best.length < NEEDED; attempt++) {
    const list = await ask(t);
    if (list.length > best.length) best = list;
  }
  writeFileSync(out, JSON.stringify(best));
  asked++;
  if (best.length < NEEDED) short.push(`${t.name} (${best.length})`);
}
console.log(`reused ${reused}, generated ${asked}${short.length ? `; still under ${NEEDED}: ${short.join(", ")}` : ""}`);
