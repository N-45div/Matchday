import { describe, expect, it } from "vitest";
import { buildBoard } from "./board";
import { nameRestrictions, type QlooBrand } from "./categories";
import { rankSponsors } from "./rank";

const retail = (id: string, name: string): QlooBrand => ({ entity_id: id, name, tags: [{ id: "urn:tag:genre:brand:retail" }] });

describe("nameRestrictions", () => {
  it("flags alcohol and gambling from names without false hits on ordinary words", () => {
    expect(nameRestrictions("River Bend Brewing Co.")).toEqual(["alcohol"]);
    expect(nameRestrictions("Lakeside Winery")).toEqual(["alcohol"]);
    expect(nameRestrictions("Lucky Star Casino")).toEqual(["gambling"]);
    expect(nameRestrictions("Sales Engine Forum Bakery")).toEqual([]);
  });
});

describe("buildBoard", () => {
  const qloo = rankSponsors({ city: [retail("a", "Hometown Market"), retail("b", "Corner Outfitters")] });

  it("merges both sources and marks names they agree on", () => {
    const board = buildBoard(["Hometown Market Inc.", "Main Street Diner"], qloo);
    expect(board.map((b) => [b.name, b.source])).toEqual([
      ["Hometown Market Inc.", "both"],
      ["Main Street Diner", "assistant"],
      ["Corner Outfitters", "qloo"],
    ]);
    expect(board[0].qloo?.brand.entity_id).toBe("a");
  });

  it("keeps alcohol (with its flag) and hides gambling unless the club enables it", () => {
    const board = buildBoard(["Lucky Star Casino", "River Bend Brewing"], []);
    expect(board.map((b) => b.name)).toEqual(["River Bend Brewing"]);
    expect(board[0].restrictions).toEqual(["alcohol"]);
    expect(buildBoard(["Lucky Star Casino"], [], 150, ["gambling"])).toHaveLength(1);
  });

  it("treats brewing and brewery as the same business", () => {
    const brewery = rankSponsors({ city: [{ entity_id: "g", name: "The River Brewery", tags: [{ id: "urn:tag:genre:brand:wine_and_spirits:beer" }] }] });
    const board = buildBoard(["River Brewing Company"], brewery);
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ source: "both", assistantRank: 0 });
  });

  it("drops duplicate and empty assistant names", () => {
    expect(buildBoard(["Main Street Diner", "Main Street Diner (downtown)", "  "], [])).toHaveLength(1);
  });
});
