import type { PlanEntry } from "@/lib/plan/season";

const LABEL: Record<string, string> = { opening: "Opening night", fireworks: "Fireworks", bobblehead: "Bobblehead giveaway", giveaway: "Giveaway", theme: "Theme night" };
const fmt = (n: number) => n.toLocaleString("en-US");

export function SeasonCalendar({ entries }: { entries: PlanEntry[] }) {
  const promoted = entries.filter((e) => e.promo);
  const months = [...new Set(promoted.map((e) => e.date.slice(0, 7)))];
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">2027 calendar</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Promotion nights on your {entries.length} home dates. Start times aren&apos;t set yet, so any date may become a day game; fireworks move if it does.
        Sundays are marked family days: no alcohol presenter on those.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => (
          <div key={m} className="rounded-lg border border-line bg-surface">
            <h3 className="border-b border-line px-4 py-2 text-sm font-medium">
              {new Date(`${m}-01T12:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
            </h3>
            <ul className="divide-y divide-line">
              {promoted.filter((e) => e.date.startsWith(m)).map((e) => (
                <li key={e.date} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-muted">{e.weekday.slice(0, 3)} {Number(e.date.slice(8))}</span>
                  <span className="flex-1">
                    {LABEL[e.promo!]}
                    {e.family && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted">Family</span>}
                  </span>
                  <span className="tabular-nums text-accent">+{fmt(e.addedFans)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
