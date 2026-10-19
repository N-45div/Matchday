// Builds the sponsor board for one club from Qloo brand pools:
//   city pool       - brands with strong affinity in the club's city
//   team+city pool  - the same, also signalled by the club's own Qloo entity (its fan base), when one exists
// Fused by reciprocal rank, then boosted for "local lift": brands ranked far higher here than in other club cities.

import { OFF_BY_DEFAULT, profile, type BrandProfile, type QlooBrand, type Restriction } from "./categories";

export interface Pools {
  city: QlooBrand[];
  teamCity?: QlooBrand[];
}

/** For each brand id, its median rank across other clubs' city pools (missing from a pool = pool size). */
export type LocalStats = Map<string, number>;

export interface SponsorCandidate {
  brand: QlooBrand;
  profile: BrandProfile;
  score: number;
  cityRank: number | null;
  teamRank: number | null;
  localLift: number | null;
}

export interface RankOptions {
  local?: LocalStats;
  poolSize?: number;
  /** Restricted categories the club has switched on (alcohol, gambling, ...); all are off by default. */
  enabled?: Restriction[];
  limit?: number;
}

const K = 60;
const LIFT_WEIGHT = 0.5;
const MAX_LIFT = 3;

export function localStats(cityPools: QlooBrand[][], poolSize: number): LocalStats {
  const ranks = new Map<string, number[]>();
  cityPools.forEach((pool, i) => pool.forEach((b, r) => {
    const list = ranks.get(b.entity_id) ?? new Array(cityPools.length).fill(poolSize);
    list[i] = r;
    ranks.set(b.entity_id, list);
  }));
  const stats: LocalStats = new Map();
  for (const [id, list] of ranks) {
    const sorted = [...list].sort((a, b) => a - b);
    stats.set(id, sorted[Math.floor(sorted.length / 2)]);
  }
  return stats;
}

export function rankSponsors(pools: Pools, opts: RankOptions = {}): SponsorCandidate[] {
  const poolSize = opts.poolSize ?? Math.max(pools.city.length, pools.teamCity?.length ?? 0);
  const blocked = OFF_BY_DEFAULT.filter((r) => !(opts.enabled ?? []).includes(r));
  const byId = new Map<string, { brand: QlooBrand; cityRank: number | null; teamRank: number | null }>();
  pools.city.forEach((brand, rank) => byId.set(brand.entity_id, { brand, cityRank: rank, teamRank: null }));
  pools.teamCity?.forEach((brand, rank) => {
    const entry = byId.get(brand.entity_id) ?? { brand, cityRank: null, teamRank: null };
    entry.teamRank = rank;
    byId.set(brand.entity_id, entry);
  });

  const out: SponsorCandidate[] = [];
  for (const { brand, cityRank, teamRank } of byId.values()) {
    const p = profile(brand);
    if (!p.sponsorable || p.restrictions.some((r) => blocked.includes(r))) continue;
    let score = (cityRank != null ? 1 / (K + cityRank) : 0) + (teamRank != null ? 1 / (K + teamRank) : 0);
    let localLift: number | null = null;
    if (opts.local && cityRank != null) {
      const elsewhere = opts.local.get(brand.entity_id) ?? poolSize;
      localLift = (elsewhere + 1) / (cityRank + 1);
      score *= 1 + LIFT_WEIGHT * Math.min(Math.max(Math.log2(localLift), 0), MAX_LIFT);
    }
    out.push({ brand, profile: p, score, cityRank, teamRank, localLift });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 50);
}

/** Plain-English evidence for a pick, e.g. "#4 in Rochester taste · #9 among Red Wings fans · 12× more local". */
export function evidence(c: SponsorCandidate, city: string, team?: string): string[] {
  const lines: string[] = [];
  if (c.cityRank != null) lines.push(`#${c.cityRank + 1} in ${city} taste`);
  if (c.teamRank != null && team) lines.push(`#${c.teamRank + 1} among ${team} fans in ${city}`);
  if (c.localLift != null && c.localLift >= 2) lines.push(`${Math.round(c.localLift)}× stronger here than in a typical club city`);
  return lines;
}
