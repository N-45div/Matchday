// Local food and drink partners near a ballpark, ranked by how much the club's own fans like them
// (Qloo place affinity to the club entity). Used for concession tie-ins, partner nights and small sponsors.

import type { QueryParams } from "../qloo/client";

export const PARTNER_TAGS = [
  "urn:tag:genre:place:restaurant",
  "urn:tag:genre:place:restaurant:cafe",
  "urn:tag:genre:place:restaurant:coffee_shop",
  "urn:tag:genre:place:restaurant:bakery",
  "urn:tag:genre:place:brewery",
  "urn:tag:genre:place:bar",
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
  [/brew/i, "Brewery"],
  [/coffee|cafe|café/i, "Coffee"],
  [/bakery|dessert|ice cream/i, "Bakery & dessert"],
  [/bar|pub|tavern|lounge/i, "Bar"],
];

export function kindOf(place: QlooPlace): string {
  const names = (place.tags ?? []).filter((t) => (t.id ?? t.tag_id ?? "").startsWith("urn:tag:genre:place")).map((t) => t.name ?? "");
  for (const [re, kind] of KINDS) if (names.some((n) => re.test(n))) return kind;
  return "Restaurant";
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
    if (place.properties?.is_closed || seen.has(key)) return;
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
      gameNightDays: DAYS.filter((d) => openDuring(p.hours, d)),
      fanRank: rank + 1,
    });
  });
  return out;
}
