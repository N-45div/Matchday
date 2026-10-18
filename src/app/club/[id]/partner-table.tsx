import type { Partner } from "@/lib/partners/partners";

const SHOWN = 12;
const DAY = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" } as Record<string, string>;

export function PartnerTable({ partners, venue }: { partners: Partner[]; venue: string | null }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Food and drink partners</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Places within 3 km of {venue ?? "the ballpark"}, ordered by how much your fans like them. Use them for concession tie-ins, partner nights and small local sponsorships.
      </p>
      {partners.length ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Place</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Distance</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Open on game nights</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {partners.slice(0, SHOWN).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{p.name}</a> : p.name}
                    {p.address && <div className="text-xs text-muted">{p.address}</div>}
                  </td>
                  <td className="px-4 py-2 text-muted">{p.kind}</td>
                  <td className="px-4 py-2 tabular-nums">{p.distanceKm != null ? `${p.distanceKm} km` : "–"}</td>
                  <td className="px-4 py-2">{p.priceLevel ? "$".repeat(p.priceLevel) : "–"}</td>
                  <td className="px-4 py-2 tabular-nums">{p.rating ?? "–"}</td>
                  <td className="px-4 py-2 text-xs text-muted">{p.gameNightDays.length ? p.gameNightDays.map((d) => DAY[d]).join(" ") : "Hours unknown"}</td>
                  <td className="px-4 py-2 text-xs tabular-nums">{p.phone ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">This ballpark has no map coordinates yet, so nearby partners aren&apos;t available.</p>
      )}
    </section>
  );
}
