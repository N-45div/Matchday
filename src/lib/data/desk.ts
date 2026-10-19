// Everything one club's desk page shows, assembled from Postgres (cached Qloo data, assistant list, next season's
// dates) and the committed aggregates in data/lift. No live API call happens on a page view.

import lift from "../../../data/lift/lift.json";
import baselines from "../../../data/lift/baselines.json";
import promoMix from "../../../data/lift/promo-mix.json";
import { sql } from "../db";
import { toPartners, type Partner, type QlooPlace } from "../partners/partners";
import { planSeason, type Budget, type ClubBaseline, type Lifts, type PromoMix, type SeasonPlan } from "../plan/season";
import { buildBoard, type BoardItem } from "../sponsors/board";
import type { QlooBrand } from "../sponsors/categories";
import { rankSponsors } from "../sponsors/rank";

export interface ClubDesk {
  club: { id: string; name: string; league: string; city: string; region: string | null; venue: string | null; market: string; hasFanSignal: boolean };
  board: BoardItem[];
  partners: Partner[];
  plan: SeasonPlan | null;
  budget: Budget;
  tier: "MLB" | "MiLB";
  qlooFetchedAt: string | null;
}

/** Nights per promotion when a club has no 2026 record to copy. */
const DEFAULT_BUDGET: Record<"MLB" | "MiLB", Budget> = {
  MLB: { fireworks: 6, bobblehead: 8, giveaway: 12, theme: 12 },
  MiLB: { fireworks: 15, bobblehead: 5, giveaway: 10, theme: 15 },
};

function liftsFor(tier: "MLB" | "MiLB"): Lifts {
  const p = (lift.tiers as Record<string, { pooled: Record<string, { lift_pct: number }> }>)[tier].pooled;
  const both = (k: string) => ({ weekend: p[k].lift_pct, midweek: p[`${k}_midweek_total`]?.lift_pct ?? p[k].lift_pct });
  return { opening: both("opening"), fireworks: both("fireworks"), bobblehead: both("bobblehead"), giveaway: both("giveaway"), theme: both("theme") };
}

function budgetFrom(mix: PromoMix | undefined, tier: "MLB" | "MiLB"): Budget {
  if (!mix) return DEFAULT_BUDGET[tier];
  const nights = (k: keyof PromoMix) => Object.values(mix[k] ?? {}).reduce((s, v) => s + v, 0);
  return { fireworks: nights("fireworks"), bobblehead: nights("bobblehead"), giveaway: nights("giveaway"), theme: nights("theme") };
}

type ClubRow = { id: string; name: string; league: string; city: string; region: string | null; venue: string | null; market: string; lat: number | null; lng: number | null; team_entity_id: string | null };
type QlooRow = { fetched_at: Date; city_brands: QlooBrand[]; fan_brands: QlooBrand[]; partners: QlooPlace[] };

export interface DeskOptions {
  /** Nights per promotion; replaces the club's own 2026 numbers for any promotion given. */
  budget?: Budget;
  /** Months (1-12) to leave without promotions, e.g. a cold April. */
  skipMonths?: number[];
}

export async function getClubDesk(id: string, opts: DeskOptions = {}): Promise<ClubDesk | null> {
  const db = sql();
  const [club] = (await db`select id, name, league, city, region, venue, market, lat, lng, team_entity_id from clubs where id = ${id}`) as ClubRow[];
  if (!club) return null;
  const [qloo] = (await db`select fetched_at, city_brands, fan_brands, partners from club_qloo where club_id = ${id}`) as QlooRow[];
  const [ai] = (await db`select names from club_ai_prospects where club_id = ${id}`) as { names: string[] }[];
  const dates = (await db`select to_char(date, 'YYYY-MM-DD') as date, day_night from home_dates where club_id = ${id} order by date`) as { date: string; day_night: string | null }[];

  const brandIds = [...new Set([...(qloo?.city_brands ?? []), ...(qloo?.fan_brands ?? [])].map((b) => b.entity_id))];
  const medians = brandIds.length ? ((await db`select entity_id, median_rank from brand_city_median where entity_id = any(${brandIds})`) as { entity_id: string; median_rank: number }[]) : [];
  const local = new Map(medians.map((m) => [m.entity_id, m.median_rank]));

  const qlooBoard = qloo ? rankSponsors({ city: qloo.city_brands, teamCity: qloo.fan_brands }, { local, poolSize: 300, limit: 150 }) : [];
  const tier = club.league === "MLB" ? "MLB" : "MiLB";
  const mix = (promoMix.clubs as Record<string, PromoMix>)[id];
  const budget = { ...budgetFrom(mix, tier), ...Object.fromEntries(Object.entries(opts.budget ?? {}).filter(([, n]) => n != null)) };
  const seasons = (baselines as Record<string, Record<string, ClubBaseline>>)[id];
  const baseline = seasons?.["2026"] ?? seasons?.["2025"];
  const skip = new Set(opts.skipMonths ?? []);
  // The opener stays: it's opening day whatever else the club skips.
  const open = dates.filter((d, i) => i === 0 || !skip.has(Number(d.date.slice(5, 7))));

  return {
    club: { id: club.id, name: club.name, league: club.league, city: club.city, region: club.region, venue: club.venue, market: club.market, hasFanSignal: Boolean(club.team_entity_id) },
    board: buildBoard(ai?.names ?? [], qlooBoard),
    partners: club.lat != null && club.lng != null && qloo ? toPartners(qloo.partners, { lat: club.lat, lng: club.lng }) : [],
    plan: baseline && open.length ? planSeason(open.map((d) => ({ date: d.date, dayNight: d.day_night })), baseline, liftsFor(tier), budget, { fireworks: true }, mix) : null,
    budget,
    tier,
    qlooFetchedAt: qloo ? qloo.fetched_at.toISOString() : null,
  };
}
