// Places a club's promotions on next season's home dates where the measured lift adds the most fans.
// Baseline crowd per date = the club's no-promotion average for that weekday, scaled by month.
// Lift per promotion comes from data/lift (fitted on two seasons of real games); Mon-Thu lifts are used midweek.

export type PromoKind = "opening" | "fireworks" | "bobblehead" | "giveaway" | "theme";

export interface HomeDate {
  date: string;
  dayNight?: string | null;
}

export interface ClubBaseline {
  weekday: Record<string, { mean: number }>;
  month: Record<string, { mean: number }>;
  p95?: number;
}

/** Percentage lifts, e.g. { fireworks: { weekend: 9.1, midweek: 16.6 }, ... } */
export type Lifts = Record<PromoKind, { weekend: number; midweek: number }>;

export interface PlanEntry {
  date: string;
  weekday: string;
  baseline: number;
  promo: PromoKind | null;
  expected: number;
  addedFans: number;
  family: boolean;
  dayNight: string | null;
}

export interface SeasonPlan {
  entries: PlanEntry[];
  addedFans: number;
  /** Fans added by the same promotions placed the common way (biggest crowds first). */
  conventionalAddedFans: number;
}

export type Budget = Partial<Record<Exclude<PromoKind, "opening">, number>>;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MIN_GAP_DAYS: Record<Exclude<PromoKind, "opening">, number> = { fireworks: 3, bobblehead: 5, giveaway: 3, theme: 2 };
const ORDER: Exclude<PromoKind, "opening">[] = ["fireworks", "bobblehead", "giveaway", "theme"];

const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
const isMidweek = (weekday: string) => ["Monday", "Tuesday", "Wednesday", "Thursday"].includes(weekday);
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function baselineFor(date: string, b: ClubBaseline): number {
  const weekdays = Object.values(b.weekday);
  const overall = weekdays.reduce((s, w) => s + w.mean, 0) / Math.max(weekdays.length, 1);
  const byDay = b.weekday[weekdayOf(date)]?.mean ?? overall;
  const months = Object.values(b.month);
  const monthAvg = months.reduce((s, m) => s + m.mean, 0) / Math.max(months.length, 1);
  const monthMean = b.month[String(Number(date.slice(5, 7)))]?.mean;
  const factor = monthMean && monthAvg ? monthMean / monthAvg : 1;
  return Math.round(byDay * factor);
}

function withLift(base: number, pct: number, cap?: number) {
  const raw = Math.round(base * (1 + pct / 100));
  return cap ? Math.min(raw, Math.max(cap, base)) : raw;
}

function place(entries: PlanEntry[], budget: Budget, lifts: Lifts, cap: number | undefined, choose: (candidates: PlanEntry[], kind: Exclude<PromoKind, "opening">) => PlanEntry[]) {
  for (const kind of ORDER) {
    let left = budget[kind] ?? 0;
    const taken: number[] = [];
    for (const e of choose(entries.filter((x) => x.promo === null), kind)) {
      if (left <= 0) break;
      const day = dayNumber(e.date);
      if (taken.some((t) => Math.abs(t - day) < MIN_GAP_DAYS[kind])) continue;
      const pct = isMidweek(e.weekday) ? lifts[kind].midweek : lifts[kind].weekend;
      e.promo = kind;
      e.expected = withLift(e.baseline, pct, cap);
      e.addedFans = e.expected - e.baseline;
      taken.push(day);
      left--;
    }
  }
}

export function planSeason(dates: HomeDate[], baseline: ClubBaseline, lifts: Lifts, budget: Budget, nightOnly: { fireworks: boolean } = { fireworks: true }): SeasonPlan {
  const fresh = (): PlanEntry[] =>
    [...dates]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((d, i, all) => i === 0 || all[i - 1].date !== d.date)
      .map((d) => {
        const weekday = weekdayOf(d.date);
        const base = baselineFor(d.date, baseline);
        return { date: d.date, weekday, baseline: base, promo: null, expected: base, addedFans: 0, family: weekday === "Sunday" || d.dayNight === "day", dayNight: d.dayNight ?? null };
      });
  const eligible = (e: PlanEntry, kind: string) => !(kind === "fireworks" && nightOnly.fireworks && e.dayNight === "day");

  const open = (entries: PlanEntry[]) => {
    const first = entries[0];
    if (!first) return;
    first.promo = "opening";
    first.expected = withLift(first.baseline, lifts.opening.weekend, baseline.p95);
    first.addedFans = first.expected - first.baseline;
  };

  // Desk plan: each promotion goes where it adds the most fans.
  const entries = fresh();
  open(entries);
  place(entries, budget, lifts, baseline.p95, (c, kind) =>
    c.filter((e) => eligible(e, kind)).sort((a, b) => {
      const gain = (e: PlanEntry) => withLift(e.baseline, isMidweek(e.weekday) ? lifts[kind].midweek : lifts[kind].weekend, baseline.p95) - e.baseline;
      return gain(b) - gain(a) || a.date.localeCompare(b.date);
    }),
  );

  // Conventional plan: the same promotions on the biggest crowds (Fridays and Saturdays first).
  const conventional = fresh();
  open(conventional);
  place(conventional, budget, lifts, baseline.p95, (c, kind) => c.filter((e) => eligible(e, kind)).sort((a, b) => b.baseline - a.baseline || a.date.localeCompare(b.date)));

  const total = (list: PlanEntry[]) => list.reduce((s, e) => s + e.addedFans, 0);
  return { entries, addedFans: total(entries), conventionalAddedFans: total(conventional) };
}
