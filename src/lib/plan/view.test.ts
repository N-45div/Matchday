import { describe, expect, it } from "vitest";
import type { PlanEntry, SeasonPlan } from "./season";
import { fireworksLine, planView } from "./view";

const entry = (date: string, weekday: string, promo: PlanEntry["promo"], addedFans: number, family = false): PlanEntry => ({
  date, weekday, promo, addedFans, family, baseline: 1000, expected: 1000 + addedFans, dayNight: null,
});

const desk = [
  entry("2027-06-01", "Tuesday", "fireworks", 2300),
  entry("2027-06-05", "Saturday", "fireworks", 1100),
  entry("2027-06-06", "Sunday", "giveaway", 600, true),
  entry("2027-07-06", "Tuesday", "fireworks", 1900),
];
const mine = [
  entry("2027-06-01", "Tuesday", null, 0),
  entry("2027-06-05", "Saturday", "fireworks", 1100),
  entry("2027-06-06", "Sunday", null, 0, true),
  entry("2027-07-06", "Tuesday", null, 0),
];
const plan: SeasonPlan = { entries: desk, addedFans: 5900, conventionalAddedFans: 0, clubMixAddedFans: 1100, clubMixEntries: mine };

describe("fireworksLine", () => {
  it("counts fireworks by weekday, most first", () => {
    expect(fireworksLine(desk)).toBe("Fireworks on 2 Tuesdays and 1 Saturday.");
    expect(fireworksLine([])).toBeNull();
  });
});

describe("planView", () => {
  it("pairs both placements night by night and sums months", () => {
    const view = planView(plan);
    expect(view.nights[0]).toMatchObject({ date: "2027-06-01", desk: { promo: "fireworks", fans: 2300 }, mine: { promo: null, fans: 0 } });
    expect(view.months).toEqual([
      { key: "2027-06", label: "JUN", desk: 4000, mine: 1100 },
      { key: "2027-07", label: "JUL", desk: 1900, mine: 0 },
    ]);
  });

  it("describes each placement and opens on the night that adds the most", () => {
    const view = planView(plan);
    expect(view.deskLine).toBe("Fireworks on 2 Tuesdays and 1 Saturday. Giveaways on family days.");
    expect(view.mineLine).toBe("Like your 2026 schedule: 1 of 1 fireworks nights on Fridays and Saturdays.");
    expect(view.bestDate).toBe("2027-06-01");
  });

  it("has no club placement when the club has no 2026 record", () => {
    const view = planView({ ...plan, clubMixAddedFans: null, clubMixEntries: null });
    expect(view.mineLine).toBeNull();
    expect(view.months[0].mine).toBeNull();
  });
});
