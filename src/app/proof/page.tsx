import lift from "../../../data/lift/lift.json";
import fit2026 from "../../../data/eval/sponsor-fit.json";
import fit2025 from "../../../data/eval/sponsor-fit-2025.json";

export const metadata = { title: "Evidence · Matchday Revenue Desk" };

type Effect = { lift_pct: number; ci95?: number[] };
const PROMOS: [string, string][] = [["fireworks", "Fireworks"], ["fireworks_midweek_total", "Fireworks, Mon–Thu"], ["bobblehead", "Bobblehead"], ["giveaway", "Other giveaway"], ["theme", "Theme night"], ["ticket_offer", "Ticket offer"], ["opening", "Opening day"]];
const RANKERS: [string, string][] = [["desk", "Desk, Qloo city taste + fan base"], ["city", "Qloo city taste only"], ["llm", "Assistant only (Claude Haiku 5.5)"], ["hybrid", "Hybrid: assistant top 150 + Desk top 150"], ["placebo", "Placebo: another club's city"]];

const pct = (e: Effect) => `${e.lift_pct > 0 ? "+" : ""}${e.lift_pct}%`;
const ci = (c?: number[]) => (c ? `${c[0]} to ${c[1]}` : "–");
const total = (fit: { totals: Record<string, { found: number; ci95: number[] }> }, key: string) => fit.totals[key];

export default function Proof() {
  const tiers = lift.tiers as Record<string, { games: Record<string, number>; pooled: Record<string, Effect>; holdout_2026: { mae_with_promotions: number; mae_without_promotions: number } }>;
  return (
    <article className="max-w-3xl space-y-10 text-sm leading-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence</h1>
        <p className="mt-2 text-muted">
          Both tests were written down and committed before they were run (docs/eval-plan.md in the repository). Results are reported as they came out, including the one that went against the product.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">1. What promotions do to attendance</h2>
        <p className="mt-1 text-muted">Regular-season games, 2025–26, from the MLB Stats API. Log attendance on promotion flags, with club-season, weekday, month, day/night, temperature and rain controls. Errors clustered by club. Ranges are 95% intervals.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-line text-xs text-muted"><tr><th className="px-4 py-2 font-medium">Promotion</th>{Object.keys(tiers).map((t) => <th key={t} className="px-4 py-2 font-medium">{t} ({tiers[t].games["2025"] + tiers[t].games["2026"]} games)</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {PROMOS.map(([key, label]) => (
                <tr key={key}><td className="px-4 py-2">{label}</td>{Object.keys(tiers).map((t) => <td key={t} className="px-4 py-2 tabular-nums">{pct(tiers[t].pooled[key])} <span className="text-xs text-muted">{ci(tiers[t].pooled[key].ci95)}</span></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          The effects held from one season to the next. They don&apos;t make single-game forecasts much better, though: fitted on 2025 and scored on 2026, the typical error moved from {Object.keys(tiers).map((t) => `${tiers[t].holdout_2026.mae_without_promotions.toLocaleString("en-US")} to ${tiers[t].holdout_2026.mae_with_promotions.toLocaleString("en-US")} fans (${t})`).join(" and ")}. Promotions shift the average; weather, opponents and everything else still dominate any one night.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">2. Does the sponsor board name brands that really sponsor clubs?</h2>
        <p className="mt-1 text-muted">Labels are the presenting sponsors clubs published for their promotions. A ranked brand counts when its name matches a real presenter. Top 300 brands per club, 2,000 bootstrap resamples of clubs.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-line text-xs text-muted"><tr><th className="px-4 py-2 font-medium">Ranking</th><th className="px-4 py-2 font-medium">2026 sponsors found</th><th className="px-4 py-2 font-medium">2025 sponsors found</th></tr></thead>
            <tbody className="divide-y divide-line">
              {RANKERS.map(([key, label]) => {
                const a = total(fit2026, `${key}_name300`);
                const b = total(fit2025, `${key}_name300`);
                return <tr key={key}><td className="px-4 py-2">{label}</td><td className="px-4 py-2 tabular-nums">{a ? a.found : "not run"}</td><td className="px-4 py-2 tabular-nums">{b ? b.found : "–"}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><strong>The pre-registered test failed.</strong> On {fit2026.clubs} clubs and {fit2026.labels.toLocaleString("en-US")} real 2026 sponsors, the Desk ranking found fewer than the assistant alone ({fit2026.differences["desk_name300 minus llm_name300"].value}, range {ci(fit2026.differences["desk_name300 minus llm_name300"].ci95)}). It did beat a placebo by {fit2026.differences["desk_name300 minus placebo_name300"].value} (range {ci(fit2026.differences["desk_name300 minus placebo_name300"].ci95)}), so the taste signal is real; most real sponsors are simply local banks, hospitals and dealers that an assistant can name and Qloo doesn&apos;t cover.</li>
          <li><strong>The two find different sponsors,</strong> so a hybrid test was written down first and then run on a different season. On {fit2025.clubs} clubs&apos; 2025 sponsors the hybrid found {fit2025.differences["hybrid_name300 minus llm_name300"].value} more than the assistant alone, at the same list length (range {ci(fit2025.differences["hybrid_name300 minus llm_name300"].ci95)}). That is why the sponsor board shows both lists.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">What this does not establish</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
          <li>Lifts are observed associations; clubs choose when to run promotions, so they are not controlled experiments.</li>
          <li>Sponsor labels show who bought, not who should. A suggested brand may never sign.</li>
          <li>Many sponsors renew every year, so the 2025 replication overlaps the 2026 labels; it is a second season, not an independent sample.</li>
          <li>The assistant may remember published sponsor deals from its training data, which favours it in both tests.</li>
        </ul>
      </section>
    </article>
  );
}
