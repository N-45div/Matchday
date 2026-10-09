import { describe, expect, it } from "vitest";
import { allowedOnNight, profile, type QlooBrand } from "./categories";

const brand = (name: string, ...tags: string[]): QlooBrand => ({ entity_id: name, name, tags: tags.map((id) => ({ id })) });
const genre = (g: string) => `urn:tag:genre:brand:${g}`;
const type = (t: string) => `urn:tag:brand_type:qloo:${t}`;

describe("profile", () => {
  it("keeps regional consumer brands", () => {
    expect(profile(brand("Hometown Market", genre("retail"), type("retail_brand")))).toEqual({ sponsorable: true, category: "retail", restrictions: [] });
    expect(profile(brand("Corner Burgers", genre("dining"))).category).toBe("dining");
    expect(profile(brand("Order App", genre("mobile_app:food_and_dining"))).category).toBe("app");
  });

  it("drops teams, media, nonprofits, schools and news apps", () => {
    expect(profile(brand("City Hawks", genre("sports_organization:baseball"), type("entertainment_brand"))).sponsorable).toBe(false);
    expect(profile(brand("Local Radio", genre("entertainment:media"), type("media_brand"))).sponsorable).toBe(false);
    expect(profile(brand("Advocacy Group", genre("ngo:advocacy"), type("nonprofit_brand"))).sponsorable).toBe(false);
    expect(profile(brand("State College", genre("academic"), type("educational_brand"))).sponsorable).toBe(false);
    expect(profile(brand("Daily News", genre("mobile_app:news"))).sponsorable).toBe(false);
  });

  it("flags alcohol from tags and other restrictions from names", () => {
    expect(profile(brand("River Brewing", genre("wine_and_spirits:beer"), type("product_brand"))).restrictions).toEqual(["alcohol"]);
    expect(profile(brand("Lucky Star Casino", genre("travel:hotel"))).restrictions).toContain("gambling");
    expect(profile(brand("Cloud Vape Co", genre("retail"))).restrictions).toContain("tobacco");
  });
});

describe("allowedOnNight", () => {
  it("keeps restricted categories off family nights only", () => {
    expect(allowedOnNight(["alcohol"], { family: true })).toBe(false);
    expect(allowedOnNight(["alcohol"], { family: false })).toBe(true);
    expect(allowedOnNight([], { family: true })).toBe(true);
  });
});
