// Classifies a Qloo brand for the sponsor board: is it a consumer brand a club could sign,
// and does it carry a compliance restriction (alcohol, gambling, ...)?

export interface QlooBrand {
  entity_id: string;
  name: string;
  popularity?: number;
  tags?: { id?: string; tag_id?: string; name?: string }[];
  query?: { affinity?: number };
}

export type Restriction = "alcohol" | "gambling" | "tobacco" | "cannabis" | "crypto" | "firearms";

/** Categories left off the board unless a club turns them on. The desk is for family ballparks, so alcohol is off too. */
export const OFF_BY_DEFAULT: Restriction[] = ["alcohol", "gambling", "tobacco", "cannabis", "crypto", "firearms"];

export interface BrandProfile {
  sponsorable: boolean;
  category: string | null;
  restrictions: Restriction[];
}

const tagIds = (b: QlooBrand) => (b.tags ?? []).map((t) => t.id ?? t.tag_id ?? "").filter(Boolean);

const CONSUMER_GENRES = ["food_and_beverage", "dining", "retail", "fashion", "health_and_beauty", "household", "electronics", "travel", "wine_and_spirits", "automotive", "home_improvement", "toys", "pets", "fitness", "telecommunications"];
const CONSUMER_APPS = ["e_commerce", "food_and_dining", "fitness", "travel", "home_and_utilities"];
const NON_SPONSOR_TYPES = ["nonprofit_brand", "government_brand", "educational_brand", "media_brand", "personal_brand", "entertainment_brand"];

const KEYWORDS: [Restriction, RegExp][] = [
  ["gambling", /\b(casino|sportsbook|lottery|poker|draftkings|fanduel|betmgm|caesars sportsbook|bet365|fanatics sportsbook)\b/i],
  ["tobacco", /\b(tobacco|cigar|cigarette|vape|vaping|juul|nicotine|zyn)\b/i],
  ["cannabis", /\b(cannabis|cbd|thc|dispensary|marijuana)\b/i],
  ["crypto", /\b(crypto|bitcoin|coinbase|binance|blockchain)\b/i],
  ["firearms", /\b(firearms?|guns?|ammunition|smith & wesson|glock|nra)\b/i],
];

const ALCOHOL_NAME = /\b(brew(ing|ery|house|pub)?|beer|ale|lager|distill(ery|ing)?|spirits|vodka|whiskey|whisky|bourbon|tequila|rum|gin|wine(ry|s)?|vineyards?|cider(y)?|seltzer|liquor|tavern|taproom)\b/i;

/** Restrictions readable from a name alone (assistant-suggested businesses carry no Qloo tags). */
export function nameRestrictions(name: string): Restriction[] {
  const out = new Set<Restriction>();
  if (ALCOHOL_NAME.test(name)) out.add("alcohol");
  for (const [restriction, re] of KEYWORDS) if (re.test(name)) out.add(restriction);
  return [...out];
}

export function profile(brand: QlooBrand): BrandProfile {
  const ids = tagIds(brand);
  const genres = ids.filter((t) => t.startsWith("urn:tag:genre:brand:")).map((t) => t.slice("urn:tag:genre:brand:".length));
  const types = ids.filter((t) => t.startsWith("urn:tag:brand_type:qloo:")).map((t) => t.slice("urn:tag:brand_type:qloo:".length));
  const top = genres.map((g) => g.split(":")[0]);

  const restrictions = new Set<Restriction>();
  if (top.includes("wine_and_spirits")) restrictions.add("alcohol");
  for (const [restriction, re] of KEYWORDS) if (re.test(brand.name)) restrictions.add(restriction);

  const consumerGenre = top.find((g) => CONSUMER_GENRES.includes(g));
  const consumerApp = genres.find((g) => g.startsWith("mobile_app:") && CONSUMER_APPS.includes(g.split(":")[1]));
  const blockedType = types.some((t) => NON_SPONSOR_TYPES.includes(t));
  const category = consumerGenre ?? (consumerApp ? "app" : null);
  return { sponsorable: Boolean(category) && !blockedType, category, restrictions: [...restrictions] };
}

/** Kids', family, school and faith nights must never carry an alcohol, gambling, tobacco or cannabis presenter. */
export function allowedOnNight(restrictions: Restriction[], night: { family: boolean }): boolean {
  if (!night.family) return true;
  return !restrictions.some((r) => r === "alcohol" || r === "gambling" || r === "tobacco" || r === "cannabis");
}
