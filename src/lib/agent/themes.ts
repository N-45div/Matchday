// Family theme nights for the agent:
//   family_themes      the stored ideas for a club (subjects other clubs ran, where this town ranks high by Qloo local taste);
//   check_theme_night  asks Qloo live about any subject: one national heatmap, then this town's pull against every club town.
// Family-safe only: nothing about drinking, gambling, tobacco or cannabis, and no film rated R or NC-17. Live answers are kept.

import { z } from "zod";
import themeTest from "../../../data/eval/theme-nights.json";
import { getClubDesk } from "../data/desk";
import { sql } from "../db";
import { areaPull, type Cell } from "../geo/geohash";
import { qloo } from "../qloo/live";
import { LIMITS, take } from "./limits";
import { DeskToolError } from "./tools";

const clubId = z.string().min(3).max(20).describe("A club id from find_clubs, such as 'mlb-534'.");

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}`;

/** One sentence on whether the ranking was tested (docs/eval-plan.md section 3: the heatmap arm the amendment ranks ideas by). */
export function themeVerdict(): string {
  const h = themeTest.spearman_demeaned_residual_vs_score.heatmap;
  const p = themeTest.spearman_demeaned_residual_vs_score.heatmap_placebo;
  const passed = h.ci95[0] > 0 && h.mean > p.mean;
  return passed
    ? `Tested on ${themeTest.theme_games_with_kept_subject} theme nights in 2025–26: nights drew more where the area leaned toward the subject (correlation ${signed(h.mean)}, range ${h.ci95[0].toFixed(2)} to ${h.ci95[1].toFixed(2)}).`
    : `The ranking is untested as a pick: on ${themeTest.theme_games_with_kept_subject} theme nights in 2025–26, how an area leaned toward a subject didn't reliably predict which nights drew more (correlation ${signed(h.mean)}, range ${h.ci95[0].toFixed(2)} to ${h.ci95[1].toFixed(2)}). Read it as a list of ideas the town likes.`;
}

// ---- family_themes
export const familyThemesInput = z.object({ clubId });
export async function familyThemes({ clubId: id }: z.infer<typeof familyThemesInput>) {
  const desk = await getClubDesk(id);
  if (!desk) throw new DeskToolError(`There is no club with id ${id}. Look it up with find_clubs first.`);
  return {
    club: desk.club.name,
    ideas: desk.themes.map((t) => ({ subject: t.subject, kind: t.kind, topShareOfClubTowns: `${Math.max(1, Math.round((1 - t.percentile) * 100))}%`, clubsRanOne2025to26: t.clubsRan, ranHere: t.ranHere, suggestedDate: t.date })),
    themeNightLiftPct: desk.lifts.theme.weekend,
    notes: [
      "Subjects other clubs built family theme nights on, ranked by how this town compares with the 150 club towns in Qloo local taste.",
      "Family-safe only: no drinking, gambling or tobacco nights, and no film rated R.",
      themeVerdict(),
    ],
  };
}

// ---- check_theme_night (live)
export const checkThemeInput = z.object({
  clubId,
  subject: z.string().min(2).max(60).describe("A film, TV show, franchise, character, music artist or game, such as 'Bluey', 'Pokémon' or 'Taylor Swift'."),
});

const MAPPABLE: Record<string, string> = { "urn:entity:brand": "brand", "urn:entity:movie": "film", "urn:entity:tv_show": "TV show", "urn:entity:artist": "music", "urn:entity:videogame": "game" };
const VICE = /\b(beer|brew\w*|wine|whiske?y|vodka|tequila|rum|margarit\w*|cocktail|bourbon|casino|poker|betting|sportsbook|lottery|cannabis|marijuana|weed|vape|vaping|tobacco|cigar\w*)\b/i;
const ADULT_FILM = new Set(["R", "NC-17"]);
const ADULT_TV = new Set(["TV-MA"]);

type Hit = { entity_id: string; name: string; types?: string[]; properties?: { content_rating?: string; description?: string; short_description?: string } };
type Heatmap = { results?: { heatmap?: { location: { geohash: string }; query: { affinity: number; popularity: number } }[] } };

export async function checkThemeNight({ clubId: id, subject }: z.infer<typeof checkThemeInput>) {
  const [club] = (await sql()`select id, name, city, lat, lng from clubs where id = ${id}`) as { id: string; name: string; city: string; lat: number | null; lng: number | null }[];
  if (!club) throw new DeskToolError(`There is no club with id ${id}. Look it up with find_clubs first.`);
  if (club.lat == null || club.lng == null) throw new DeskToolError(`The data has no ballpark location for the ${club.name}, so a town comparison isn't possible.`);
  if (VICE.test(subject)) throw new DeskToolError(`Matchday only plans family-safe nights, so it doesn't check "${subject}".`);

  const hits = ((await qloo().get<{ results?: Hit[] }>("/search", { query: subject, take: 8 })).results ?? []) as Hit[];
  const hit = hits.find((e) => e.types?.some((t) => t in MAPPABLE));
  if (!hit) throw new DeskToolError(`Qloo has nothing it can map for "${subject}". Name a film, show, franchise, artist or game.`);
  const type = hit.types!.find((t) => t in MAPPABLE)!;
  const about = `${hit.name} ${hit.properties?.short_description ?? hit.properties?.description ?? ""}`;
  const rating = hit.properties?.content_rating ?? null;
  if (VICE.test(about) || (type === "urn:entity:movie" && rating && ADULT_FILM.has(rating)) || (type === "urn:entity:tv_show" && rating && ADULT_TV.has(rating))) {
    throw new DeskToolError(`${hit.name} isn't family-safe${rating ? ` (rated ${rating})` : ""}, so Matchday won't plan a night around it.`);
  }

  const key = hit.entity_id;
  const [kept] = (await sql()`select pulls, fetched_at from theme_checks where entity_id = ${key}`) as { pulls: Record<string, number>; fetched_at: Date }[];
  let pulls = kept?.pulls;
  if (!pulls) {
    if (!(await take("qloo:live", LIMITS.liveQlooPerDay))) throw new DeskToolError("Today's budget for live Qloo questions is used up. Subjects already checked still answer; try a new one tomorrow.");
    const r = await qloo().get<Heatmap>("/v2/insights", { "filter.type": "urn:heatmap", "signal.interests.entities": key, "filter.location.query": "United States" });
    const cells: Cell[] = (r.results?.heatmap ?? []).map((c) => [c.location.geohash, c.query.affinity, c.query.popularity]);
    const clubs = (await sql()`select id, lat, lng from clubs where lat is not null and lng is not null`) as { id: string; lat: number; lng: number }[];
    pulls = Object.fromEntries(clubs.flatMap((c) => {
      const p = areaPull(cells, c);
      return p == null ? [] : [[c.id, Math.round(p * 1000) / 1000]];
    }));
    await sql()`insert into theme_checks (entity_id, name, pulls) values (${key}, ${hit.name}, ${JSON.stringify(pulls)}) on conflict (entity_id) do nothing`;
  }
  const mine = pulls[id];
  if (mine == null) throw new DeskToolError(`Qloo's map has too little around the ${club.name}'s ballpark to compare ${hit.name}.`);
  const others = Object.entries(pulls).filter(([c]) => c !== id).map(([, p]) => p);
  const share = others.filter((p) => p < mine).length / Math.max(others.length, 1);
  return {
    club: club.name,
    subject: hit.name,
    kind: MAPPABLE[type],
    contentRating: rating,
    asked: kept ? `A Qloo heatmap asked on ${kept.fetched_at.toISOString().slice(0, 10)} and kept` : "A Qloo heatmap, asked live just now",
    townPull: mine,
    topShareOfClubTowns: `${Math.max(1, Math.round((1 - share) * 100))}%`,
    clubTownsCompared: others.length + 1,
    readAs: share >= 0.75 ? `A strong local fit: ${club.city} leans toward ${hit.name} more than most club towns.` : share >= 0.4 ? `About average for a club town.` : `A weak local fit: most club towns lean toward ${hit.name} more than ${club.city} does.`,
    notes: [
      "Pull is the popularity-weighted mean affinity of Qloo's map within 60 km of the ballpark, compared with every club's ballpark.",
      "A quick check of one subject, untested against attendance; family_themes says how the desk's own ideas were tested.",
    ],
  };
}
