// The desk's tools, shared by the in-app agent (/api/agent) and the remote MCP endpoint (/api/mcp).
// Each one reads the same cached Qloo data and committed aggregates as the club pages, so no tool call
// reaches Qloo or the MLB Stats API live.

import { z } from "zod";
import fit2026 from "../../../data/eval/sponsor-fit.json";
import fit2025 from "../../../data/eval/sponsor-fit-2025.json";
import lift from "../../../data/lift/lift.json";
import { listClubs, type ClubSummary } from "../data/clubs";
import { getClubDesk, type ClubDesk } from "../data/desk";
import type { PromoKind } from "../plan/season";
import type { BoardItem } from "../sponsors/board";
import { evidence } from "../sponsors/rank";

/** A problem the caller can fix (an unknown club id, say), reported back as a plain sentence. */
export class DeskToolError extends Error {}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const clubId = z.string().min(1).max(40).describe("A club id from find_clubs, such as mlb-534 (Rochester Red Wings).");

function header(c: ClubDesk["club"]) {
  return { id: c.id, name: c.name, league: c.league, city: c.region ? `${c.city}, ${c.region}` : c.city, ballpark: c.venue };
}

async function deskOrThrow(id: string, opts?: Parameters<typeof getClubDesk>[1]): Promise<ClubDesk> {
  const desk = await getClubDesk(id, opts);
  if (!desk) throw new DeskToolError(`There is no club with id "${id}". Look it up with find_clubs first.`);
  return desk;
}

// ---- find_clubs

export const findClubsInput = z.object({
  query: z.string().min(1).max(80).describe("Part of a club's name or city, such as 'Red Wings', 'Rochester' or 'Yankees'."),
});

export function matchClubs(clubs: ClubSummary[], query: string, limit = 10) {
  const words = query.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
  const scored = clubs
    .map((c) => {
      const text = `${c.name} ${c.city} ${c.region ?? ""} ${c.league}`.toLowerCase();
      return { c, score: words.filter((w) => text.includes(w)).length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  const hits = scored.filter((s) => s.score === best).map((s) => s.c);
  return { clubs: hits.slice(0, limit).map((c) => ({ id: c.id, name: c.name, league: c.league, city: c.region ? `${c.city}, ${c.region}` : c.city })), more: Math.max(0, hits.length - limit) };
}

export async function findClubs({ query }: z.infer<typeof findClubsInput>) {
  const found = matchClubs(await listClubs(), query);
  return found.clubs.length ? found : { ...found, note: "No MLB or affiliated minor league club matches that. Try a city or a nickname." };
}

// ---- sponsor_board

export const sponsorBoardInput = z.object({
  clubId,
  category: z.string().max(40).optional().describe("Keep only audience-fit brands whose Qloo category contains this, such as 'food', 'restaurant' or 'retail'."),
  limit: z.number().int().min(1).max(40).optional().describe("How many of each list to return (default 12)."),
});

function sponsorLine(item: BoardItem, city: string, nickname: string) {
  return {
    name: item.name,
    sources: item.source === "both" ? "named by the assistant and ranked by Qloo" : item.source === "qloo" ? "ranked by Qloo" : "named by the assistant",
    category: item.category?.replaceAll("_", " ") ?? null,
    evidence: item.qloo ? evidence(item.qloo, city, nickname) : [],
  };
}

export async function sponsorBoard({ clubId: id, category, limit = 12 }: z.infer<typeof sponsorBoardInput>) {
  const desk = await deskOrThrow(id);
  const nickname = desk.club.nickname;
  const keep = (i: BoardItem) => !category || (i.category ?? "").replaceAll("_", " ").includes(category.toLowerCase());
  const local = desk.board.filter((i) => i.assistantRank != null).sort((a, b) => a.assistantRank! - b.assistantRank!);
  const fit = desk.board.filter((i) => i.qloo && keep(i)).sort((a, b) => b.qloo!.score - a.qloo!.score);
  return {
    club: header(desk.club),
    localBusinesses: local.slice(0, limit).map((i) => sponsorLine(i, desk.club.city, nickname)),
    audienceFitBrands: fit.slice(0, limit).map((i) => sponsorLine(i, desk.club.city, nickname)),
    totals: { localBusinesses: local.length, audienceFitBrands: fit.length },
    notes: [
      "Local businesses are named by a language model; audience-fit brands are ranked from Qloo taste data for the city and, where Qloo knows the club, its fans.",
      "Alcohol, gambling, tobacco, cannabis, crypto and firearms brands are left off, so every name here suits a family ballpark.",
      desk.qlooFetchedAt ? `Qloo data fetched ${desk.qlooFetchedAt.slice(0, 10)}.` : "No Qloo data is cached for this club yet.",
    ],
  };
}

// ---- nearby_partners

export const partnersInput = z.object({
  clubId,
  openOn: z.enum(WEEKDAYS).optional().describe("Keep only places open from 17:30 to 22:00 on this weekday, i.e. through a night game."),
  kind: z.string().max(40).optional().describe("Keep only places whose kind contains this, such as 'pizza', 'coffee' or 'bakery'."),
  limit: z.number().int().min(1).max(30).optional().describe("How many places to return (default 10)."),
});

export async function nearbyPartners({ clubId: id, openOn, kind, limit = 10 }: z.infer<typeof partnersInput>) {
  const desk = await deskOrThrow(id);
  const places = desk.partners.filter((p) => (!openOn || p.gameNightDays.includes(openOn.toLowerCase())) && (!kind || p.kind.toLowerCase().includes(kind.toLowerCase())));
  return {
    club: header(desk.club),
    partners: places.slice(0, limit).map((p) => ({ name: p.name, kind: p.kind, distanceKm: p.distanceKm, priceLevel: p.priceLevel, rating: p.rating, openThroughNightGamesOn: p.gameNightDays, phone: p.phone, website: p.website, address: p.address })),
    total: places.length,
    notes: desk.partners.length
      ? ["Restaurants, cafes and bakeries within 3 km of the ballpark, ranked by Qloo for the club's fans. Bars, pubs and breweries are left out. Hours are as listed on Qloo and can be out of date."]
      : [desk.partnersReason === "no-coordinates" ? "No partner list for this club: its ballpark has no map coordinates in the data yet." : "Qloo listed no family food places within 3 km of this ballpark."],
  };
}

// ---- plan_season

const nights = (what: string) => z.number().int().min(0).max(40).optional().describe(`Number of ${what} nights. Leave out to keep the club's own 2026 number.`);

export const planInput = z.object({
  clubId,
  fireworks: nights("fireworks"),
  bobblehead: nights("bobblehead"),
  giveaway: nights("giveaway"),
  theme: nights("theme"),
  skipMonths: z.array(z.number().int().min(1).max(12)).max(6).optional().describe("Months (1-12) to keep free of promotions, e.g. [4] for April."),
});

export async function planNextSeason({ clubId: id, fireworks, bobblehead, giveaway, theme, skipMonths }: z.infer<typeof planInput>) {
  const desk = await deskOrThrow(id, { budget: { fireworks, bobblehead, giveaway, theme }, skipMonths });
  const plan = desk.plan;
  if (!plan) return { club: header(desk.club), plan: null, notes: ["This club has no 2027 home dates or no attendance baseline in the data, so no plan can be made."] };
  const promoted = plan.entries.filter((e) => e.promo && e.promo !== "opening");
  const count = (k: PromoKind) => promoted.filter((e) => e.promo === k).length;
  return {
    club: header(desk.club),
    nightsAsked: desk.budget,
    nightsPlaced: { fireworks: count("fireworks"), bobblehead: count("bobblehead"), giveaway: count("giveaway"), theme: count("theme") },
    addedFans: plan.addedFans,
    sameNightsOnClubs2026Weekdays: plan.clubMixAddedFans,
    sameNightsOnBiggestCrowds: plan.conventionalAddedFans,
    nights: promoted.map((e) => ({ date: e.date, weekday: e.weekday, promotion: e.promo, expectedCrowd: e.expected, addedFans: e.addedFans, familyDay: e.family })),
    notes: [
      "Added fans are estimates from measured lift at 2025-26 games, scaled to this club's own weekday and month crowds and capped at its biggest crowds. They are averages, not promises for a given night.",
      "2027 start times aren't set yet. Weekdays this club played mostly in daylight in 2025-26 (usually Sundays) are treated as day games, so fireworks stay off them; check each date once times are set.",
      skipMonths?.length ? `Months kept free: ${skipMonths.join(", ")}.` : null,
    ].filter(Boolean),
  };
}

// ---- get_evidence

export const evidenceInput = z.object({});

type Effect = { lift_pct: number; ci95?: number[] };
const PROMOS: [string, string][] = [["fireworks", "Fireworks"], ["fireworks_midweek_total", "Fireworks, Mon-Thu"], ["bobblehead", "Bobblehead"], ["giveaway", "Giveaway"], ["theme", "Theme night"], ["opening", "Opening day"]];

export async function getEvidence() {
  const tiers = lift.tiers as unknown as Record<string, { pooled: Record<string, Effect> }>;
  const effect = (e: Effect | undefined) => (e ? `${e.lift_pct > 0 ? "+" : ""}${e.lift_pct}%${e.ci95 ? ` (95% CI ${e.ci95[0]} to ${e.ci95[1]})` : ""}` : "not estimated");
  const t26 = fit2026.totals as Record<string, { found: number }>;
  const t25 = fit2025.totals as Record<string, { found: number }>;
  const d25 = fit2025.differences as Record<string, { value: number; ci95: number[] }>;
  return {
    attendanceLift: Object.fromEntries(
      Object.keys(tiers).map((t) => [t === "MLB" ? "MLB" : "All minor league levels together (Triple-A to Single-A)", Object.fromEntries(PROMOS.map(([k, label]) => [label, effect(tiers[t].pooled[k])]))]),
    ),
    attendanceMethod: "Regular-season games 2025-26 from the MLB Stats API; log attendance on promotion flags with club-season, weekday, month, day/night, temperature and rain controls; errors clustered by club.",
    sponsorTest: {
      labels: `${fit2026.labels} presenting sponsors that ${fit2026.clubs} clubs published for 2026, and the 2025 equivalents.`,
      found2026Top300: { qlooDesk: t26.desk_name300.found, assistantAlone: t26.llm_name300.found, placebo: t26.placebo_name300.found },
      found2025Top300: { hybridBoard: t25.hybrid_name300.found, assistantAlone: t25.llm_name300.found },
      hybridMinusAssistant2025: d25["hybrid_name300 minus llm_name300"],
      readAs: "Qloo alone lost to the assistant alone in the pre-registered 2026 test but beat a placebo; the two find different sponsors, and the hybrid board beat the assistant alone on 2025 sponsors.",
    },
    limits: [
      "Promotions shift average crowds; they barely improve single-game forecasts.",
      "Sponsor labels show who bought, not who should or would sign.",
      "Only MLB and affiliated minor league clubs publish promotions in a machine-readable way, so other leagues aren't covered.",
    ],
  };
}
