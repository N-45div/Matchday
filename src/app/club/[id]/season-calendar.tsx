import type { PlanEntry } from "@/lib/plan/season";
import { PROMO_STYLE, SectionTitle } from "../../ui";

const fmt = (n: number) => n.toLocaleString("en-US");

export function SeasonCalendar({ entries }: { entries: PlanEntry[] }) {
  const promoted = entries.filter((e) => e.promo);
  const months = [...new Set(promoted.map((e) => e.date.slice(0, 7)))];
  const kinds = Object.keys(PROMO_STYLE).filter((k) => promoted.some((e) => e.promo === k));
  return (
    <section>
      <SectionTitle kicker="2027 calendar" title="Night by night">
        Promotion nights on your {entries.length} home dates. Start times aren&apos;t set yet, so any date may become a day game; fireworks move if it
        does. Sundays and day games are family days.
      </SectionTitle>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        {kinds.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${PROMO_STYLE[k].dot}`} />
            {PROMO_STYLE[k].label}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m, i) => (
          <div key={m} className="rise overflow-hidden rounded-2xl border border-line bg-surface shadow-sm" style={{ animationDelay: `${i * 60}ms` }}>
            <h3 className="border-b border-line bg-accent-soft/60 px-4 py-2.5 font-display text-sm font-bold">
              {new Date(`${m}-01T12:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
            </h3>
            <ul className="divide-y divide-line">
              {promoted.filter((e) => e.date.startsWith(m)).map((e) => (
                <li key={e.date} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-12 shrink-0 text-xs tabular-nums text-muted">
                    {e.weekday.slice(0, 3)} <span className="font-semibold text-ink">{Number(e.date.slice(8))}</span>
                  </span>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PROMO_STYLE[e.promo!].dot}`} />
                  <span className="flex-1">
                    {PROMO_STYLE[e.promo!].label}
                    {e.family && <span className="ml-2 rounded-full bg-grass-soft px-1.5 py-0.5 text-[10px] font-semibold text-grass">Family</span>}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-accent">+{fmt(e.addedFans)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
