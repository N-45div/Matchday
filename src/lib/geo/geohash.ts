// Geohash cells from Qloo heatmaps, and a town's pull: the popularity-weighted mean affinity of the cells around a point.

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** The centre of a geohash cell, as [lon, lat]. */
export function geohashCentre(hash: string): [number, number] {
  const lat = [-90, 90];
  const lon = [-180, 180];
  let even = true;
  for (const ch of hash) {
    const bits = BASE32.indexOf(ch);
    if (bits < 0) throw new Error(`not a geohash: ${hash}`);
    for (const mask of [16, 8, 4, 2, 1]) {
      const range = even ? lon : lat;
      const mid = (range[0] + range[1]) / 2;
      if (bits & mask) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return [(lon[0] + lon[1]) / 2, (lat[0] + lat[1]) / 2];
}

export function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * p) / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(((lon2 - lon1) * p) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/** [geohash, affinity, popularity], as Qloo's heatmap returns them. */
export type Cell = [string, number, number];

/** Popularity-weighted mean affinity of the cells within radiusKm of a point; null with fewer than two cells there. */
export function areaPull(cells: Cell[], at: { lat: number; lng: number }, radiusKm = 60): number | null {
  let w = 0, wa = 0, n = 0;
  for (const [hash, affinity, popularity] of cells) {
    const [lon, lat] = geohashCentre(hash);
    if (Math.abs(lat - at.lat) > 1 || Math.abs(lon - at.lng) > 1.5 || km(lat, lon, at.lat, at.lng) > radiusKm) continue;
    w += popularity;
    wa += popularity * affinity;
    n++;
  }
  return n >= 2 && w > 0 ? wa / w : null;
}
