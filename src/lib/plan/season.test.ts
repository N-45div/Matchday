import { describe, expect, it } from "vitest";
import { baselineFor, planSeason, type ClubBaseline, type Lifts } from "./season";

const baseline: ClubBaseline = {
  weekday: { Monday: { mean: 3000 }, Tuesday: { mean: 3000 }, Wednesday: { mean: 3000 }, Thursday: { mean: 3200 }, Friday: { mean: 5000 }, Saturday: { mean: 5200 }, Sunday: { mean: 4000 } },
  month: { "6": { mean: 4000 }, "7": { mean: 4000 } },
  p95: 6000,
};
const lifts: Lifts = {
  opening: { weekend: 40, midweek: 40 },
  fireworks: { weekend: 20, midweek: 41 },
  bobblehead: { weekend: 10, midweek: 12 },
  giveaway: { weekend: 9, midweek: 5 },
  theme: { weekend: 6, midweek: 6 },
};
// Two June weeks: Mon 2027-06-07 .. Sun 2027-06-20
const dates = Array.from({ length: 14 }, (_, i) => ({ date: `2027-06-${String(7 + i).padStart(2, "0")}`, dayNight: "night" }));

describe("baselineFor", () => {
  it("uses the weekday average scaled by month", () => {
    expect(baselineFor("2027-06-11", baseline)).toBe(5000); // Friday, average month
    expect(baselineFor("2027-06-08", baseline)).toBe(3000); // Tuesday
  });
});

describe("planSeason", () => {
  it("opens with the opener and stays within each budget", () => {
    const plan = planSeason(dates, baseline, lifts, { fireworks: 2, giveaway: 1 });
    expect(plan.entries[0].promo).toBe("opening");
    expect(plan.entries.filter((e) => e.promo === "fireworks")).toHaveLength(2);
    expect(plan.entries.filter((e) => e.promo === "giveaway")).toHaveLength(1);
  });

  it("moves fireworks midweek when the midweek lift adds more fans", () => {
    const plan = planSeason(dates, baseline, lifts, { fireworks: 2 });
    const fireworks = plan.entries.filter((e) => e.promo === "fireworks");
    expect(fireworks.every((e) => ["Monday", "Tuesday", "Wednesday", "Thursday"].includes(e.weekday))).toBe(true);
    // Thursday 3,200 x 41% = 1,312 beats Saturday 5,200 x 20% = 1,040 and the 6,000 ceiling caps big nights.
    expect(plan.addedFans).toBeGreaterThan(plan.conventionalAddedFans);
  });

  it("keeps the minimum gap between nights of the same promotion", () => {
    const plan = planSeason(dates, baseline, lifts, { fireworks: 4 });
    const days = plan.entries.filter((e) => e.promo === "fireworks").map((e) => Date.parse(e.date) / 86_400_000);
    for (let i = 1; i < days.length; i++) expect(Math.abs(days[i] - days[i - 1])).toBeGreaterThanOrEqual(3);
  });

  it("never puts fireworks on day games and marks Sundays and day games as family", () => {
    const withDayGame = dates.map((d) => (d.date === "2027-06-10" ? { ...d, dayNight: "day" } : d));
    const plan = planSeason(withDayGame, baseline, lifts, { fireworks: 4 });
    expect(plan.entries.find((e) => e.date === "2027-06-10")!.promo).not.toBe("fireworks");
    expect(plan.entries.find((e) => e.date === "2027-06-10")!.family).toBe(true);
    expect(plan.entries.find((e) => e.date === "2027-06-13")!.family).toBe(true);
  });

  it("caps expected crowds at the club's ceiling", () => {
    const plan = planSeason(dates, baseline, lifts, {});
    expect(plan.entries[0].expected).toBeLessThanOrEqual(6000);
  });
});
