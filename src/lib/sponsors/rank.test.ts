import { describe, expect, it } from "vitest";
import type { QlooBrand } from "./categories";
import { evidence, localStats, rankSponsors } from "./rank";

const retail = (id: string): QlooBrand => ({ entity_id: id, name: `Brand ${id}`, tags: [{ id: "urn:tag:genre:brand:retail" }] });
const beer = (id: string): QlooBrand => ({ entity_id: id, name: `Brewery ${id}`, tags: [{ id: "urn:tag:genre:brand:wine_and_spirits:beer" }] });
const casino = (id: string): QlooBrand => ({ entity_id: id, name: `Lucky ${id} Casino`, tags: [{ id: "urn:tag:genre:brand:travel:hotel" }] });
const team = (id: string): QlooBrand => ({ entity_id: id, name: `Team ${id}`, tags: [{ id: "urn:tag:genre:brand:sports_organization" }] });

describe("rankSponsors", () => {
  it("fuses city and fan-base pools and drops non-sponsors", () => {
    const board = rankSponsors({ city: [team("t"), retail("a"), retail("b")], teamCity: [retail("b"), retail("c")] });
    expect(board.map((c) => c.brand.entity_id)).toEqual(["b", "a", "c"]);
    expect(board[0]).toMatchObject({ cityRank: 2, teamRank: 0 });
  });

  it("keeps alcohol, hides restricted categories unless enabled", () => {
    const pools = { city: [casino("x"), beer("y"), retail("z")] };
    expect(rankSponsors(pools).map((c) => c.brand.entity_id)).toEqual(["y", "z"]);
    expect(rankSponsors(pools, { enabled: ["gambling"] }).map((c) => c.brand.entity_id)).toEqual(["x", "y", "z"]);
  });

  it("boosts brands that are far stronger here than in other cities", () => {
    const national = retail("national");
    const local = retail("local");
    const elsewhere = [
      [national, retail("p")],
      [national, retail("q")],
      [national, retail("r")],
    ];
    const stats = localStats(elsewhere, 300);
    const board = rankSponsors({ city: [national, local] }, { local: stats, poolSize: 300 });
    expect(board[0].brand.entity_id).toBe("local");
    expect(board[0].localLift).toBeGreaterThan(100);
    expect(board.find((c) => c.brand.entity_id === "national")!.localLift).toBe(1);
  });
});

describe("evidence", () => {
  it("explains a pick in plain words", () => {
    const [c] = rankSponsors({ city: [retail("a")], teamCity: [retail("a")] }, { local: new Map([["a", 40]]), poolSize: 300 });
    expect(evidence(c, "Rochester", "Red Wings")).toEqual(["#1 in Rochester taste", "#1 among Red Wings fans in Rochester", "41× stronger here than in a typical club city"]);
  });
});
