import { describe, expect, it } from "vitest";
import type { ClubSummary } from "../data/clubs";
import { matchClubs } from "./tools";

const club = (id: string, name: string, city: string, region: string, league = "Triple-A"): ClubSummary => ({ id, name, nickname: name.split(" ").at(-1)!, league, city, region, venue: null, hasFanSignal: false });
const clubs = [
  club("mlb-534", "Rochester Red Wings", "Rochester", "NY"),
  club("mlb-147", "New York Yankees", "Bronx", "NY", "MLB"),
  club("mlb-121", "New York Mets", "Queens", "NY", "MLB"),
  club("mlb-235", "Memphis Redbirds", "Memphis", "TN"),
];

describe("matchClubs", () => {
  it("finds a club by nickname or city", () => {
    expect(matchClubs(clubs, "Red Wings").clubs.map((c) => c.id)).toEqual(["mlb-534"]);
    expect(matchClubs(clubs, "rochester").clubs.map((c) => c.id)).toEqual(["mlb-534"]);
  });

  it("keeps only the clubs matching the most words", () => {
    expect(matchClubs(clubs, "New York Mets").clubs.map((c) => c.id)).toEqual(["mlb-121"]);
    expect(matchClubs(clubs, "new york").clubs.map((c) => c.id).sort()).toEqual(["mlb-121", "mlb-147"]);
  });

  it("returns nothing for an unknown club and caps long lists", () => {
    expect(matchClubs(clubs, "Galaxy").clubs).toEqual([]);
    const many = matchClubs(clubs, "ny", 1);
    expect(many.clubs).toHaveLength(1);
    expect(many.more).toBe(2);
  });
});
