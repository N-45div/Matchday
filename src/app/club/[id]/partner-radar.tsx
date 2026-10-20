"use client";

import { useMemo, useState } from "react";
import type { Partner } from "@/lib/partners/partners";

const SHOWN = 12;
const RANGE_KM = 3;
const RING = 44; // percent of the box from the center to the 3 km ring
const DAYS: [string, string][] = [["monday", "M"], ["tuesday", "T"], ["wednesday", "W"], ["thursday", "T"], ["friday", "F"], ["saturday", "S"], ["sunday", "S"]];

/** Pin positions in percent of the box. Pins that would sit on top of each other are turned a few degrees apart. */
function place(partners: Partner[]) {
  const placed: { x: number; y: number }[] = [];
  return partners.map((p) => {
    let angle = p.bearing ?? 0;
    const r = (Math.min(p.distanceKm ?? RANGE_KM, RANGE_KM) / RANGE_KM) * RING;
    let x = 50, y = 50;
    for (let i = 0; i < 12; i++) {
      x = 50 + r * Math.sin((angle * Math.PI) / 180);
      y = 50 - r * Math.cos((angle * Math.PI) / 180);
      if (!placed.some((q) => Math.hypot(q.x - x, q.y - y) < 6.5)) break;
      angle += 9;
    }
    placed.push({ x, y });
    return { x, y };
  });
}

export function PartnerRadar({ partners, venue, reason }: { partners: Partner[]; venue: string | null; reason: "no-coordinates" | "none-nearby" | null }) {
  const shown = useMemo(() => partners.slice(0, SHOWN), [partners]);
  const spots = useMemo(() => place(shown), [shown]);
  const [active, setActive] = useState<string | null>(null);

  return (
    <section aria-labelledby="partners-h" className="chunk rounded-3xl bg-surface p-5 sm:p-6">
      <p className="kicker">Food partners</p>
      <h2 id="partners-h" className="mt-1 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Around {venue ?? "the ballpark"}</h2>
      <p className="mt-1.5 max-w-3xl text-base leading-relaxed text-muted">
        Family restaurants, cafes and bakeries within 3 km, ranked by how much your fans like them. Use them for ticket-stub deals, food nights and small local
        sponsorships. Bars, pubs and breweries are left out.
      </p>
      {shown.length ? (
        <div className="mt-5 flex flex-wrap items-start gap-6">
          <div className="relative aspect-square w-full max-w-[340px] shrink-0 rounded-full border-2 border-ink bg-grass-soft sm:sticky sm:top-6" role="img" aria-label={`Map of ${shown.length} food partners within 3 km of ${venue ?? "the ballpark"}`}>
            {[88, 58.7, 29.3].map((d) => (
              <span key={d} className="absolute rounded-full border-[1.5px] border-dashed border-[#7fbf97]" style={{ inset: `${(100 - d) / 2}%` }} />
            ))}
            <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[11px] font-extrabold">N</span>
            <span className="absolute left-[52%] top-[5.5%] text-[10px] font-bold text-[#2e6b45]">3 km</span>
            <span className="absolute left-[52%] top-[35.5%] text-[10px] font-bold text-[#2e6b45]">1 km</span>
            <span className="absolute left-1/2 top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white bg-navy" title={venue ?? "Ballpark"} />
            {shown.map((p, i) => (
              <span
                key={p.id}
                aria-hidden="true"
                className={`pop absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink text-[11px] font-extrabold text-white transition-transform ${i < 3 ? "bg-accent" : "bg-navy"} ${active === p.id ? "z-10 scale-125" : ""}`}
                style={{ left: `${spots[i].x}%`, top: `${spots[i].y}%`, width: 24, height: 24, animationDelay: `${150 + i * 50}ms` }}
              >
                {active === p.id && <span className="ping absolute inset-0 rounded-full bg-accent" />}
                <span className="relative">{i + 1}</span>
              </span>
            ))}
          </div>
          <ol className="grid min-w-0 flex-[1_1_320px] grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">
            {shown.map((p, i) => (
              <li
                key={p.id}
                onMouseEnter={() => setActive(p.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p.id)}
                onBlur={() => setActive(null)}
                className={`flex gap-2.5 rounded-2xl border-2 border-ink px-3 py-2.5 transition-colors ${active === p.id ? "bg-accent-soft" : "bg-surface"}`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink text-[11px] font-extrabold text-white ${i < 3 ? "bg-accent" : "bg-navy"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-start justify-between gap-2 font-bold leading-snug">
                    {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{p.name}</a> : p.name}
                    <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">{p.kind}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2.5 text-[13px] text-muted">
                    {p.distanceKm != null && <span className="tabular-nums">{p.distanceKm} km</span>}
                    {p.priceLevel ? <span>{"$".repeat(p.priceLevel)}</span> : null}
                    {p.rating != null && <span className="tabular-nums"><span className="text-[#b07d00]">★</span> {p.rating}</span>}
                    {p.phone && <a href={`tel:${p.phone}`} className="tabular-nums text-accent hover:underline">{p.phone}</a>}
                  </p>
                  <div className="mt-1.5 flex gap-1" aria-label={p.gameNightDays.length ? `Open through night games on ${p.gameNightDays.join(", ")}` : "Game-night hours not listed"}>
                    {DAYS.map(([day, letter]) => (
                      <span key={day} title={day} className={`grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold ${p.gameNightDays.includes(day) ? "bg-grass text-white" : "bg-bg text-muted ring-1 ring-line"}`}>{letter}</span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border-2 border-ink bg-bg p-5 text-sm text-muted">
          {reason === "no-coordinates" ? "This ballpark has no map coordinates in the data yet, so nearby partners aren't available." : "Qloo lists no family food places within 3 km of this ballpark."}
        </p>
      )}
      {shown.length > 0 && <p className="mt-3 text-xs text-muted">Green days: open from 17:30 to 22:00, through a night game. Hours come from Qloo and can be out of date.</p>}
    </section>
  );
}
