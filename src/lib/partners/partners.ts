// Local food partners near a ballpark, ranked by how much the club's own fans like them
// (Qloo place affinity to the club entity). Used for concession tie-ins, partner nights and small sponsors.

import type { QueryParams } from "../qloo/client";

export const PARTNER_TAGS = [
  "urn:tag:genre:place:restaurant",
  "urn:tag:genre:place:restaurant:cafe",
  "urn:tag:genre:place:restaurant:coffee_shop",
  "urn:tag:genre:place:restaurant:bakery",
];

type Hours = Record<string, { opens?: string; closes?: string; closed?: boolean }[]>;

export interface QlooPlace {
  entity_id: string;
  name: string;
  location?: { lat: number; lon: number };
  properties?: {
    address?: string;
    neighborhood?: string;
    phone?: string;
    website?: string;
    price_level?: number;
    business_rating?: number;
    is_closed?: boolean;
    hours?: Hours;
  };
  tags?: { id?: string; tag_id?: string; name?: string }[];
  query?: { affinity?: number };
}

export interface Venue {
  lat: number;
  lng: number;
}

export interface Partner {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  priceLevel: number | null;
  rating: number | null;
  distanceKm: number | null;
  /** Compass bearing from the ballpark in degrees (0 = north, 90 = east), for the radar map. */
  bearing: number | null;
  gameNightDays: string[];
  fanRank: number;
}

export function partnerQuery(venue: Venue, teamEntityId?: string | null, radiusMeters = 3000, take = 30): QueryParams {
  return {
    "filter.type": "urn:entity:place",
    "filter.location": `POINT(${venue.lng} ${venue.lat})`,
    "filter.location.radius": radiusMeters,
    "filter.tags": PARTNER_TAGS,
    "signal.interests.entities": teamEntityId ?? undefined,
    take,
  };
}

const KINDS: [RegExp, string][] = [
  [/coffee|cafe|café|espresso/i, "Coffee"],
  [/bakery|dessert|ice cream|chocolate/i, "Bakery & dessert"],
  [/pizza/i, "Pizza"],
  [/barbecue|bbq/i, "Barbecue"],
  [/burger/i, "Burgers"],
  [/deli|sandwich/i, "Deli"],
];

const placeTags = (place: QlooPlace) => (place.tags ?? []).filter((t) => (t.id ?? t.tag_id ?? "").startsWith("urn:tag:genre:place")).map((t) => t.name ?? "");

export function kindOf(place: QlooPlace): string {
  const names = placeTags(place);
  for (const [re, kind] of KINDS) if (names.some((n) => re.test(n))) return kind;
  return "Restaurant";
}

// Bars, pubs, breweries, wine and cocktail places are left out: the desk lists family food partners only.
// "Espresso bar", "juice bar" and "Bar-B-Que" are food, so they're taken out of the text before the test.
const DRINKS = /\b(bars?|pubs?|gastropub|brew\w*|tavern|lounge|night ?club|beer|wine\w*|liquor|cocktails?|taproom|tap room|distiller\w*|speakeasy|saloon|cider\w*|whiske?y)\b/i;
const FOOD_BARS = /\b(espresso|juice|salad|sushi|oyster|smoothie|snack|tea|coffee|dessert|yogurt|acai|poke|noodle|ramen|raw)\s+bars?\b/gi;
const BBQ = /bar[- ]?b[- ]?q(ue)?/gi;
const drinky = (text: string) => DRINKS.test(text.replace(BBQ, "bbq").replace(FOOD_BARS, "food"));

export function isDrinkPlace(place: QlooPlace): boolean {
  return drinky(place.name) || placeTags(place).some(drinky);
}

/** North American numbers as (585) 736-7430; anything else as Qloo gives it. */
export function formatPhone(phone: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone.replace(/[\s().-]/g, ""));
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

export function bearing(a: Venue, b: { lat: number; lon: number }): number {
  const east = (b.lon - a.lng) * Math.cos((a.lat * Math.PI) / 180);
  const north = b.lat - a.lat;
  return Math.round(((Math.atan2(east, north) * 180) / Math.PI + 360) % 360);
}

export function distanceKm(a: Venue, b: { lat: number; lon: number }): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lon - a.lng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

const minutes = (t?: string) => {
  const m = /T?(\d{2}):(\d{2})/.exec(t ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** True if the place is open for the whole window (e.g. 17:30-22:00), allowing closing times after midnight. */
export function openDuring(hours: Hours | undefined, day: string, from = "17:30", to = "22:00"): boolean {
  const start = minutes(from)!;
  const end = minutes(to)!;
  return (hours?.[day] ?? []).some((slot) => {
    if (slot.closed) return false;
    const opens = minutes(slot.opens);
    let closes = minutes(slot.closes);
    if (opens == null || closes == null) return false;
    if (closes <= opens) closes += 24 * 60;
    return opens <= start && closes >= end;
  });
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function toPartners(places: QlooPlace[], venue: Venue): Partner[] {
  const seen = new Set<string>();
  const out: Partner[] = [];
  places.forEach((place, rank) => {
    const key = place.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (place.properties?.is_closed || seen.has(key) || isDrinkPlace(place)) return;
    seen.add(key);
    const p = place.properties ?? {};
    out.push({
      id: place.entity_id,
      name: place.name,
      kind: kindOf(place),
      address: p.address ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      priceLevel: p.price_level ?? null,
      rating: p.business_rating != null ? Math.round(p.business_rating * 10) / 10 : null,
      distanceKm: place.location ? distanceKm(venue, place.location) : null,
      bearing: place.location ? bearing(venue, place.location) : null,
      gameNightDays: DAYS.filter((d) => openDuring(p.hours, d)),
      fanRank: rank + 1,
    });
  });
  return out;
}
