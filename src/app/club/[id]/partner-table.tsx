import type { Partner } from "@/lib/partners/partners";
import { SectionTitle } from "../../ui";

const SHOWN = 12;
const DAYS: [string, string][] = [["monday", "M"], ["tuesday", "T"], ["wednesday", "W"], ["thursday", "T"], ["friday", "F"], ["saturday", "S"], ["sunday", "S"]];

export function PartnerTable({ partners, venue, reason }: { partners: Partner[]; venue: string | null; reason: "no-coordinates" | "none-nearby" | null }) {
  return (
    <section>
      <SectionTitle kicker="Food partners" title="Near the ballpark">
        Family restaurants, cafes and bakeries within 3 km of {venue ?? "the ballpark"}, ordered by how much your fans like them. Use them for
        concession tie-ins, ticket-stub deals and small local sponsorships. Bars, pubs and breweries are left out.
      </SectionTitle>
      {partners.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partners.slice(0, SHOWN).map((p, i) => (
            <li key={p.id} className="rise lift flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug">
                  {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{p.name}</a> : p.name}
                </p>
                <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">{p.kind}</span>
              </div>
              {p.address && <p className="mt-0.5 text-xs text-muted">{p.address}</p>}
              <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted">
                {p.distanceKm != null && <span className="tabular-nums">{p.distanceKm} km away</span>}
                {p.priceLevel ? <span>{"$".repeat(p.priceLevel)}</span> : null}
                {p.rating != null && <span className="tabular-nums"><span className="text-sun">★</span> {p.rating}</span>}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <div className="flex gap-1" aria-label={p.gameNightDays.length ? `Open through night games on ${p.gameNightDays.join(", ")}` : "Game-night hours unknown"}>
                  {DAYS.map(([day, letter]) => (
                    <span key={day} title={day} className={`grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold ${p.gameNightDays.includes(day) ? "bg-grass text-white" : "bg-bg text-muted ring-1 ring-line"}`}>
                      {letter}
                    </span>
                  ))}
                </div>
                {p.phone && <a href={`tel:${p.phone}`} className="text-xs font-medium tabular-nums text-accent hover:underline">{p.phone}</a>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-line bg-surface p-5 text-sm text-muted">
          {reason === "no-coordinates" ? "This ballpark has no map coordinates in the data yet, so nearby partners aren't available." : "Qloo lists no family food places within 3 km of this ballpark."}
        </p>
      )}
      {partners.length > 0 && <p className="mt-3 text-xs text-muted">Green days: open from 17:30 to 22:00, through a night game. Hours come from Qloo and can be out of date.</p>}
    </section>
  );
}
