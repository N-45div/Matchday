import lift from "../../../data/lift/lift.json";
import fit2026 from "../../../data/eval/sponsor-fit.json";
import fit2025 from "../../../data/eval/sponsor-fit-2025.json";
import themes from "../../../data/eval/theme-nights.json";
import { McpUrl } from "./mcp-url";

export const metadata = { title: "Evidence · Matchday Revenue Desk" };

type Effect = { lift_pct: number; ci95?: number[] };
const PROMOS: [string, string][] = [["fireworks", "Fireworks"], ["fireworks_midweek_total", "Fireworks, Mon–Thu"], ["bobblehead", "Bobblehead"], ["giveaway", "Other giveaway"], ["theme", "Theme night"], ["ticket_offer", "Ticket offer"], ["opening", "Opening day"]];
const RANKERS: [string, string][] = [["desk", "Desk: Qloo city taste + fan base"], ["city", "Qloo city taste only"], ["llm", "Assistant only (Claude Haiku 5.5)"], ["hybrid", "Hybrid: assistant top 150 + Desk top 150"], ["placebo", "Placebo: another club's city"]];
const TIER_LABEL: Record<string, string> = { MLB: "MLB", MiLB: "Minor leagues" };
const TOOLS: [string, string][] = [
  ["find_clubs", "Find any of the 150 clubs by name or city."],
  ["plan_season", "Re-plan a club's 2027 nights: change counts, skip months."],
  ["sponsor_board", "Both sponsor lists with Qloo evidence; filter by category."],
  ["nearby_partners", "Family food places near the park, open on a given game night."],
  ["family_themes", "Family theme night ideas your town ranks high for, with dates."],
  ["check_theme_night", "Asks Qloo live how your town leans toward any family theme."],
  ["get_evidence", "These numbers and their limits."],
];

const THEME_ARMS: [keyof typeof themes.spearman_demeaned_residual_vs_score, string][] = [
  ["heatmap", "Qloo: how the area around the ballpark leans toward it"],
  ["qloo", "Qloo: the town's taste (covers fewer subjects)"],
  ["assistant", "Assistant only (Claude Haiku 5.5)"],
  ["heatmap_placebo", "Placebo: another club's area"],
];
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}`;

/** The theme test's result in a sentence, whichever way it came out. */
function themeReading(): string {
  const h = themes.spearman_demeaned_residual_vs_score.heatmap;
  const vsPlacebo = themes.amendment_heatmap.heatmap_minus_placebo;
  const vsAssistant = themes.amendment_heatmap.heatmap_minus_assistant;
  const passed = h.ci95[0] > 0 && h.mean > themes.spearman_demeaned_residual_vs_score.heatmap_placebo.mean;
  const assistantLine = vsAssistant.ci95[0] > 0 ? "It also beat the assistant" : vsAssistant.ci95[1] < 0 ? "The assistant did better" : "Against the assistant it was a draw";
  return passed
    ? `It worked: nights drew more where the area leaned toward the subject (${signed(h.mean)}, range ${ci(h.ci95)}), and more than a placebo (${signed(vsPlacebo.mean)}, range ${ci(vsPlacebo.ci95)}). ${assistantLine} (${signed(vsAssistant.mean)}, range ${ci(vsAssistant.ci95)}). That is why the desk ranks each club's theme ideas this way.`
    : `It didn't show. How the area around a ballpark leaned toward a subject didn't reliably predict which of its theme nights drew more (${signed(h.mean)}, range ${ci(h.ci95)}), and neither did the assistant's ratings (${signed(themes.spearman_demeaned_residual_vs_score.assistant.mean)}) or the town-taste score (${signed(themes.spearman_demeaned_residual_vs_score.qloo.mean)}). Single nights are noisy: even the placebo landed at ${signed(themes.spearman_demeaned_residual_vs_score.heatmap_placebo.mean)}. The desk still suggests theme ideas this way, as a list of things each town likes, and every club page says the ranking is untested.`;
}

const pct = (e: Effect) => `${e.lift_pct > 0 ? "+" : ""}${e.lift_pct}%`;
const ci = (c?: number[]) => (c ? `${c[0]} to ${c[1]}` : "–");
const total = (fit: { totals: Record<string, { found: number; ci95: number[] }> }, key: string) => fit.totals[key];

function Card({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="chunk rounded-3xl bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="led text-[34px] text-accent">{n}</span>
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h2>
      </div>
      <div className="mt-3 space-y-4 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default function Proof() {
  const tiers = lift.tiers as Record<string, { games: Record<string, number>; pooled: Record<string, Effect>; holdout_2026: { mae_with_promotions: number; mae_without_promotions: number; coefficient_2026_inside_2025_ci: Record<string, boolean> } }>;
  const held = Object.values(tiers).flatMap((t) => Object.values(t.holdout_2026.coefficient_2026_inside_2025_ci));
  const promoName = Object.fromEntries(PROMOS);
  const misses = Object.entries(tiers).flatMap(([tier, t]) =>
    Object.entries(t.holdout_2026.coefficient_2026_inside_2025_ci).filter(([, inside]) => !inside).map(([k]) => `${tier === "MiLB" ? "minor league" : (TIER_LABEL[tier] ?? tier)} ${(promoName[k] ?? k).toLowerCase()}s`),
  );
  const fans = (n: number) => Math.round(n).toLocaleString("en-US");
  const head = "px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] text-[#a9bceb]";
  return (
    <article className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="kicker">Evidence</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">How sure is the desk?</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">
          Both tests were written down and committed before they ran (docs/eval-plan.md in the repository). Results are reported as they came out, including the
          one that went against the product.
        </p>
      </header>

      <Card n="01" title="What promotions do to attendance">
        <p className="text-muted">Regular-season games, 2025–26, from the MLB Stats API. Log attendance on promotion flags, with club-season, weekday, month, day/night, temperature and rain controls. Errors clustered by club. Ranges are 95% intervals.</p>
        <div className="overflow-x-auto rounded-2xl bg-navy p-2 text-[#f4f7ff]">
          <table className="w-full min-w-[520px] text-left tabular-nums">
            <thead>
              <tr>
                <th scope="col" className={head}>PROMOTION</th>
                {Object.keys(tiers).map((t) => <th key={t} scope="col" className={head}>{(TIER_LABEL[t] ?? t).toUpperCase()} · {(tiers[t].games["2025"] + tiers[t].games["2026"]).toLocaleString("en-US")} GAMES</th>)}
              </tr>
            </thead>
            <tbody>
              {PROMOS.map(([key, label]) => (
                <tr key={key} className="border-t border-white/10">
                  <th scope="row" className="px-4 py-2.5 font-semibold">{label}</th>
                  {Object.keys(tiers).map((t) => (
                    <td key={t} className="px-4 py-2.5">
                      <span className="led text-xl text-sun">{pct(tiers[t].pooled[key])}</span> <span className="text-xs text-[#a9bceb]">{ci(tiers[t].pooled[key].ci95)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The effects mostly held from one season to the next: {held.filter(Boolean).length} of {held.length} 2026 estimates fell inside their 2025 ranges{misses.length ? ` (outside: ${misses.join(", ")})` : ""}. They don&apos;t make single-game forecasts much better, though: fitted on 2025 and scored on 2026, the typical error moved from{" "}
          {Object.keys(tiers).map((t) => `${fans(tiers[t].holdout_2026.mae_without_promotions)} to ${fans(tiers[t].holdout_2026.mae_with_promotions)} fans (${TIER_LABEL[t] ?? t})`).join(" and ")}. Promotions shift the average; weather, opponents and everything else still dominate any one night.
        </p>
        <p>
          <strong>How the plan compares.</strong> &ldquo;Your 2026 way&rdquo; places exactly the same nights as the Matchday plan, on the weekdays the club used in 2026, so only the dates differ. 2027 start times aren&apos;t published yet, so weekdays a club played mostly in daylight in 2025–26 (usually Sundays) count as day games and get no fireworks.
        </p>
      </Card>

      <Card n="02" title="Does the sponsor board find real sponsors?">
        <p className="text-muted">Labels are the presenting sponsors clubs published for their promotions. A ranked brand counts when its name matches a real presenter. Top 300 brands per club, 2,000 bootstrap resamples of clubs.</p>
        <div className="overflow-x-auto rounded-2xl border-2 border-ink">
          <table className="w-full min-w-[480px] text-left">
            <thead className="bg-bg text-xs font-bold tracking-[0.1em] text-muted">
              <tr><th scope="col" className="px-4 py-2.5">RANKING</th><th scope="col" className="px-4 py-2.5">2026 SPONSORS FOUND</th><th scope="col" className="px-4 py-2.5">2025 SPONSORS FOUND</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {RANKERS.map(([key, label]) => {
                const a = total(fit2026, `${key}_name300`);
                const b = total(fit2025, `${key}_name300`);
                return (
                  <tr key={key} className={key === "hybrid" ? "bg-sun-soft" : ""}>
                    <th scope="row" className="px-4 py-2.5 font-semibold">{label}</th>
                    <td className="led px-4 py-2.5 text-xl">{a ? a.found : <span className="font-sans text-sm text-muted">not run</span>}</td>
                    <td className="led px-4 py-2.5 text-xl">{b ? b.found : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>The pre-registered test failed.</strong> On {fit2026.clubs} clubs and {fit2026.labels.toLocaleString("en-US")} real 2026 sponsors, the Desk ranking found fewer than the assistant alone ({fit2026.differences["desk_name300 minus llm_name300"].value}, range {ci(fit2026.differences["desk_name300 minus llm_name300"].ci95)}). It beat a placebo by {fit2026.differences["desk_name300 minus placebo_name300"].value} (range {ci(fit2026.differences["desk_name300 minus placebo_name300"].ci95)}), so the taste signal is real; most real sponsors are local banks, hospitals and dealers that an assistant can name and Qloo doesn&apos;t cover.</li>
          <li><strong>The two find different sponsors,</strong> so a hybrid test was written down first and run on a different season. On {fit2025.clubs} clubs&apos; 2025 sponsors the hybrid found {fit2025.differences["hybrid_name300 minus llm_name300"].value} more than the assistant alone at the same list length (range {ci(fit2025.differences["hybrid_name300 minus llm_name300"].ci95)}). That is why the sponsor board shows both lists.</li>
          <li><strong>The live board leaves alcohol off.</strong> The tested lists included beer and wine brands; the board you see drops alcohol, gambling, tobacco, cannabis, crypto and firearms brands.</li>
        </ul>
      </Card>

      <Card n="03" title="Do towns turn out for themes they love?">
        <p className="text-muted">
          Written down before it ran (docs/eval-plan.md section 3, with an amendment made before any outcome existed). {themes.theme_games_with_kept_subject} theme nights in
          2025–26 were built on {themes.subjects} family-safe subjects that three or more clubs used, such as Star Wars, Bluey and Harry Potter. Each night&apos;s crowd
          is measured against what the attendance model expects for a theme night at that club on that date, and compared only with nights on the same subject
          elsewhere, so national popularity drops out.
        </p>
        <div className="overflow-x-auto rounded-2xl border-2 border-ink">
          <table className="w-full min-w-[480px] text-left">
            <thead className="bg-bg text-xs font-bold tracking-[0.1em] text-muted">
              <tr><th scope="col" className="px-4 py-2.5">TOWN SCORE</th><th scope="col" className="px-4 py-2.5">CORRELATION WITH THE CROWD</th><th scope="col" className="px-4 py-2.5">NIGHTS</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {THEME_ARMS.map(([key, label]) => {
                const a = themes.spearman_demeaned_residual_vs_score[key];
                return (
                  <tr key={key} className={key === "heatmap" ? "bg-sun-soft" : ""}>
                    <th scope="row" className="px-4 py-2.5 font-semibold">{label}</th>
                    <td className="px-4 py-2.5"><span className="led text-xl">{signed(a.mean)}</span> <span className="text-xs text-muted">{ci(a.ci95)}</span></td>
                    <td className="px-4 py-2.5 tabular-nums">{a.n}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>{themeReading()}</p>
      </Card>

      <Card n="04" title="What this does not establish">
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Lifts are observed associations; clubs choose when to run promotions, so they are not controlled experiments.</li>
          <li>Sponsor labels show who bought, not who should. A suggested brand may never sign.</li>
          <li>Many sponsors renew every year, so the 2025 replication overlaps the 2026 labels; it is a second season, not an independent sample.</li>
          <li>The assistant may remember published sponsor deals from its training data, which favours it in both tests.</li>
        </ul>
      </Card>

      <section id="mcp" className="chunk scroll-mt-6 rounded-3xl bg-navy p-5 text-[#f4f7ff] sm:p-7">
        <p className="text-[13px] font-extrabold tracking-[0.14em] text-sun">USE IT IN CLAUDE</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-[28px]">The desk as a connector</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#dce5fa]">
          The same seven tools the dugout uses are served over MCP, with no sign-in. In Claude, open Settings, then Connectors, add a custom connector, and paste this address:
        </p>
        <McpUrl />
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {TOOLS.map(([name, text]) => (
            <li key={name} className="rounded-2xl border-2 border-white/20 px-4 py-3">
              <code className="text-sm font-bold text-sun">{name}</code>
              <p className="mt-0.5 text-sm text-[#dce5fa]">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
