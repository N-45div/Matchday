import type { ThemeIdea } from "@/lib/data/desk";
import { SectionHead } from "../../ui";

const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Family theme nights: subjects other clubs built nights on, where this town ranks high among club towns by Qloo local taste. */
export function ThemeNights({ themes, city, lift, verdict }: { themes: ThemeIdea[]; city: string; lift: number; verdict: string }) {
  return (
    <section aria-labelledby="themes-h" className="chunk rounded-3xl bg-surface p-5 sm:p-7">
      <SectionHead kicker="Family theme nights" title={`Nights ${city} families will love`} id="themes-h">
        Films, shows and characters other clubs built theme nights on, where {city} ranks high among the 150 club towns in Qloo&apos;s taste data. Family-safe only:
        no drinking or gambling nights, nothing rated R.
      </SectionHead>
      {themes.length ? (
        <ol className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
          {themes.map((t, i) => (
            <li key={t.subject} className="rise flex flex-col rounded-2xl border-2 border-ink bg-berry-soft p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-berry">{t.kind}</span>
                <span className="led text-2xl text-berry" aria-label={`Idea ${i + 1}`}>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-2.5 font-display text-[22px] font-extrabold leading-tight">{t.subject}</p>
              <p className="mt-1 text-sm font-semibold">Top {Math.max(1, Math.round((1 - t.percentile) * 100))}% of club towns</p>
              <p className="text-xs text-muted">
                {t.clubsRan} clubs ran one in 2025–26{t.ranHere ? ", yours included" : ""}
              </p>
              {t.date && <p className="mt-auto pt-3 text-sm font-bold text-ink">Try it {date(t.date)}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-muted">Qloo has no local taste data for this town&apos;s theme subjects yet.</p>
      )}
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
        Dates are this plan&apos;s theme nights, family days first, or open family days when it has too few. Theme nights lift crowds here about {lift}% on average. {verdict}
      </p>
    </section>
  );
}
