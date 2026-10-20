// Shapes a season plan for the plan board: both placements night by night, monthly added fans, and a one-line
// read of where each placement puts its fireworks.

import type { PlanEntry, PromoKind, SeasonPlan } from "./season";

export interface NightView {
  date: string;
  weekday: string;
  family: boolean;
  dayGame: boolean;
  desk: { promo: PromoKind | null; fans: number };
  mine: { promo: PromoKind | null; fans: number } | null;
}

export interface MonthView {
  key: string;
  label: string;
  desk: number;
  mine: number | null;
}

export interface PlanView {
  nights: NightView[];
  months: MonthView[];
  deskLine: string;
  mineLine: string | null;
  /** The desk night that adds the most fans: the board opens on it. */
  bestDate: string | null;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function list(parts: string[]): string {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** "Fireworks on 11 Tuesdays, 9 Saturdays and 1 Wednesday." */
export function fireworksLine(entries: PlanEntry[]): string | null {
  const byDay = new Map<string, number>();
  for (const e of entries) if (e.promo === "fireworks") byDay.set(e.weekday, (byDay.get(e.weekday) ?? 0) + 1);
  if (!byDay.size) return null;
  const parts = [...byDay].sort((a, b) => b[1] - a[1]).map(([day, n]) => `${n} ${day}${n === 1 ? "" : "s"}`);
  return `Fireworks on ${list(parts)}.`;
}

export function planView(plan: SeasonPlan): PlanView {
  const mineByDate = new Map((plan.clubMixEntries ?? []).map((e) => [e.date, e]));
  const nights: NightView[] = plan.entries.map((e) => {
    const m = mineByDate.get(e.date);
    return {
      date: e.date,
      weekday: e.weekday,
      family: e.family,
      dayGame: e.dayNight === "day",
      desk: { promo: e.promo, fans: e.addedFans },
      mine: plan.clubMixEntries ? { promo: m?.promo ?? null, fans: m?.addedFans ?? 0 } : null,
    };
  });

  const months = new Map<string, MonthView>();
  for (const n of nights) {
    const key = n.date.slice(0, 7);
    const m = months.get(key) ?? { key, label: MONTHS[Number(key.slice(5)) - 1], desk: 0, mine: n.mine ? 0 : null };
    m.desk += n.desk.fans;
    if (n.mine && m.mine != null) m.mine += n.mine.fans;
    months.set(key, m);
  }

  const giveaways = plan.entries.filter((e) => e.promo === "giveaway");
  const familyGiveaways = giveaways.length > 0 && giveaways.every((e) => e.family);
  const deskLine = [fireworksLine(plan.entries), familyGiveaways ? "Giveaways on family days." : null].filter(Boolean).join(" ") || "The same nights on the dates that add the most fans.";

  let mineLine: string | null = null;
  if (plan.clubMixEntries) {
    const fireworks = plan.clubMixEntries.filter((e) => e.promo === "fireworks");
    const weekend = fireworks.filter((e) => e.weekday === "Friday" || e.weekday === "Saturday").length;
    mineLine = fireworks.length
      ? `Like your 2026 schedule: ${weekend} of ${fireworks.length} fireworks nights on Fridays and Saturdays.`
      : "The same nights on the weekdays you used in 2026.";
  }

  const best = plan.entries.filter((e) => e.promo && e.promo !== "opening").sort((a, b) => b.addedFans - a.addedFans)[0];
  return { nights, months: [...months.values()], deskLine, mineLine, bestDate: best?.date ?? null };
}
