import { describe, expect, it } from "vitest";
import { areaPull, geohashCentre, km } from "./geohash";

describe("geohashCentre", () => {
  it("decodes a cell to its centre", () => {
    const [lon, lat] = geohashCentre("dr5r"); // New York
    expect(lat).toBeCloseTo(40.69, 1);
    expect(lon).toBeCloseTo(-73.9, 0);
  });
  it("rejects characters a geohash can't hold", () => {
    expect(() => geohashCentre("dr5a")).toThrow();
  });
});

describe("areaPull", () => {
  const nyc = { lat: 40.71, lng: -74.0 };
  it("weights affinity by popularity within the radius and ignores far cells", () => {
    const cells: [string, number, number][] = [["dr5r", 0.9, 3], ["dr5x", 0.5, 1], ["9q8y", 0.1, 50]];
    expect(areaPull(cells, nyc)).toBeCloseTo((0.9 * 3 + 0.5 * 1) / 4, 5);
  });
  it("returns null with fewer than two nearby cells", () => {
    expect(areaPull([["dr5r", 0.9, 3]], nyc)).toBeNull();
  });
  it("measures distance in km", () => {
    expect(km(40.71, -74.0, 34.05, -118.24)).toBeGreaterThan(3900);
  });
});
