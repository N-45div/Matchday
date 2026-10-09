import { describe, expect, it } from "vitest";
import { distanceKm, kindOf, openDuring, partnerQuery, toPartners, type QlooPlace } from "./partners";

const venue = { lat: 43.1583, lng: -77.6197 };
const tag = (name: string) => ({ id: `urn:tag:genre:place:${name.toLowerCase().replace(/ /g, "_")}`, name });
const evening = { opens: "T11:00:00", closes: "T23:00:00", closed: false };

describe("partnerQuery", () => {
  it("searches around the ballpark and signals the club when known", () => {
    const q = partnerQuery(venue, "club-1");
    expect(q["filter.location"]).toBe("POINT(-77.6197 43.1583)");
    expect(q["filter.location.radius"]).toBe(3000);
    expect(q["signal.interests.entities"]).toBe("club-1");
    expect(partnerQuery(venue)["signal.interests.entities"]).toBeUndefined();
  });
});

describe("kindOf", () => {
  it("labels breweries, coffee, desserts and bars before falling back to restaurant", () => {
    expect(kindOf({ entity_id: "1", name: "x", tags: [tag("Restaurant"), tag("Brewpub")] })).toBe("Brewery");
    expect(kindOf({ entity_id: "2", name: "x", tags: [tag("Coffee shop")] })).toBe("Coffee");
    expect(kindOf({ entity_id: "3", name: "x", tags: [tag("Pub")] })).toBe("Bar");
    expect(kindOf({ entity_id: "4", name: "x", tags: [tag("Diner")] })).toBe("Restaurant");
  });
});

describe("openDuring", () => {
  it("handles normal and past-midnight closing times", () => {
    expect(openDuring({ friday: [evening] }, "friday")).toBe(true);
    expect(openDuring({ friday: [{ opens: "T16:00:00", closes: "T02:00:00" }] }, "friday")).toBe(true);
    expect(openDuring({ friday: [{ opens: "T07:00:00", closes: "T14:00:00" }] }, "friday")).toBe(false);
    expect(openDuring({ friday: [{ ...evening, closed: true }] }, "friday")).toBe(false);
    expect(openDuring(undefined, "friday")).toBe(false);
  });
});

describe("toPartners", () => {
  it("drops closed and duplicate places and keeps fan rank", () => {
    const places: QlooPlace[] = [
      { entity_id: "a", name: "Beer Hall", location: { lat: 43.16, lon: -77.61 }, tags: [tag("Bar")], properties: { phone: "555", hours: { friday: [evening], saturday: [evening] } } },
      { entity_id: "b", name: "Shut Diner", properties: { is_closed: true } },
      { entity_id: "c", name: "Beer  Hall!" },
      { entity_id: "d", name: "Corner Cafe", tags: [tag("Cafe")] },
    ];
    const partners = toPartners(places, venue);
    expect(partners.map((p) => p.name)).toEqual(["Beer Hall", "Corner Cafe"]);
    expect(partners[0]).toMatchObject({ kind: "Bar", phone: "555", gameNightDays: ["friday", "saturday"], fanRank: 1 });
    expect(partners[0].distanceKm).toBeCloseTo(distanceKm(venue, { lat: 43.16, lon: -77.61 }));
    expect(partners[1].fanRank).toBe(4);
  });
});
