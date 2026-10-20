import Link from "next/link";
import lift from "../../data/lift/lift.json";
import { LEAGUE_ORDER, listClubs } from "@/lib/data/clubs";
import { getClubDesk } from "@/lib/data/desk";
import { planView } from "@/lib/plan/view";
import { ClubPicker } from "./club-picker";
import { Baseball } from "./ui";

/** The club the home page uses as a worked example: its real 2027 line score. */
const EXAMPLE = "mlb-534";

const PLAYS = [
  { n: "01", title: "Plan the season", body: "Your fireworks, bobbleheads and giveaways, moved to the 2027 dates where measured lift adds the most fans.", tint: "bg-sun", icon: "plan" },
  { n: "02", title: "Pitch sponsors", body: "Trading cards for brands your city and fans rank high, plus the local businesses an assistant knows.", tint: "bg-sky", icon: "pitch" },
  { n: "03", title: "Sign food partners", body: "Family restaurants, cafes and bakeries around the ballpark, ranked by your fans. No bars.", tint: "bg-grass-soft", icon: "partner" },
  { n: "04", title: "Ask the desk", body: "An agent with the desk's tools: re-plan, filter, draft a pitch. It also works inside Claude.", tint: "bg-bg", icon: "ask" },
] as const;

function PlayIcon({ icon }: { icon: (typeof PLAYS)[number]["icon"] }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "#0b1a3a", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (icon === "plan") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
  if (icon === "pitch") return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="3" /><path d="m12 8 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4z" /></svg>;
  if (icon === "partner") return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 18 6" /></svg>;
  return <svg {...common}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></svg>;
}

export default async function Home() {
  const [clubs, example] = await Promise.all([listClubs(), getClubDesk(EXAMPLE)]);
  const tiers = lift.tiers as Record<string, { games: Record<string, number> }>;
  const games = Object.values(tiers).reduce((s, t) => s + Object.values(t.games).reduce((a, b) => a + b, 0), 0);
  const plan = example?.plan;
  const view = plan ? planView(plan) : null;
  const k = (n: number) => (n / 1000).toFixed(1);
  const fmt = (n: number) => n.toLocaleString("en-US");
  const nights = example ? Object.entries(example.budget).filter(([, n]) => n).map(([kind, n]) => `${n} ${kind === "theme" ? "theme nights" : kind === "fireworks" ? "fireworks" : `${kind}s`}`) : [];

  return (
    <div className="space-y-14">
      <section className="flex flex-wrap items-center gap-12 pt-4">
        <div className="min-w-0 flex-[1_1_460px]">
          <span className="chunk-sm inline-block -rotate-2 rounded-full bg-sun px-3.5 py-1.5 text-[13px] font-extrabold tracking-[0.08em]">2027 SEASON PLANNER</span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.96] tracking-tight sm:text-[76px]">
            Fill <span className="text-accent">more seats</span> next season.
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-muted">
            For marketing and sponsorship staff at MLB and minor league clubs. Pick your club: Matchday moves your promotion nights to the 2027 dates where measured
            lift adds the most fans, deals you a hand of sponsors your city really likes, and maps family food partners around the ballpark.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a href="#clubs" className="press chunk inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-accent px-6 text-[17px] font-extrabold text-white">
              Pick your club
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            {example && <Link href={`/club/${EXAMPLE}`} className="font-bold text-accent hover:underline">See the {example.club.name}&apos; desk</Link>}
          </div>
          <p className="mt-6 text-sm text-muted">{fmt(games)} real games measured · {clubs.length} clubs · taste data from Qloo</p>
        </div>

        {example && view && plan && (
          <div className="min-w-0 flex-[1_1_560px]">
            <div className="chunk relative overflow-hidden rounded-3xl bg-navy p-5 text-[#f4f7ff] shadow-[8px_8px_0_var(--ink)]">
              <Baseball className="spin-slow pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 opacity-10" />
              <div className="flex flex-wrap items-baseline justify-between gap-3 text-[13px] font-bold tracking-[0.14em] text-[#a9bceb]">
                <span>{example.club.name.toUpperCase()} · 2027</span>
                <span className="text-xs tracking-[0.1em]">ADDED FANS, THOUSANDS</span>
              </div>
              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full min-w-[520px] border-separate border-spacing-1 tabular-nums">
                  <thead>
                    <tr className="text-[11px] font-bold tracking-[0.12em] text-[#a9bceb]">
                      <th scope="col" className="text-left">MONTH</th>
                      {view.months.map((m) => <th key={m.key} scope="col">{m.label}</th>)}
                      <th scope="col" className="text-sun">FANS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.clubMixAddedFans != null && (
                      <tr>
                        <th scope="row" className="whitespace-nowrap pr-1.5 text-left text-xs font-bold tracking-[0.08em] text-led-dim">YOUR 2026 WAY</th>
                        {view.months.map((m, i) => <td key={m.key} className="led roll rounded-lg bg-led py-2.5 text-center text-2xl text-led-dim" style={{ animationDelay: `${i * 60}ms` }}>{k(m.mine ?? 0)}</td>)}
                        <td className="led rounded-lg bg-led px-1.5 py-2.5 text-center text-[26px] text-led-dim">{k(plan.clubMixAddedFans)}</td>
                      </tr>
                    )}
                    <tr>
                      <th scope="row" className="whitespace-nowrap pr-1.5 text-left text-xs font-extrabold tracking-[0.08em] text-white">MATCHDAY</th>
                      {view.months.map((m, i) => (
                        <td key={m.key} className={`led roll rounded-lg bg-led py-2.5 text-center text-2xl ${m.mine != null && m.desk > m.mine ? "text-sun" : ""}`} style={{ animationDelay: `${300 + i * 60}ms` }}>{k(m.desk)}</td>
                      ))}
                      <td className="led pop rounded-lg bg-sun px-1.5 py-2.5 text-center text-[26px] text-navy" style={{ animationDelay: "800ms" }}>{k(plan.addedFans)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[15px] text-[#dce5fa]">Same {nights.join(", ")}. Different nights.</p>
                {plan.clubMixAddedFans != null && plan.addedFans > plan.clubMixAddedFans && (
                  <span className="pop rounded-full bg-sun px-3 py-1.5 text-sm font-extrabold text-navy" style={{ animationDelay: "1000ms" }}>+{fmt(plan.addedFans - plan.clubMixAddedFans)} fans</span>
                )}
              </div>
            </div>
            <p className="mx-1 mt-3.5 text-[13px] text-muted">Months are innings. Yellow digits: months the Matchday plan wins. Estimates from 2025–26 games, not guarantees.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="plays">
        <h2 id="plays" className="font-display text-[32px] font-extrabold tracking-tight">Four plays, one desk</h2>
        <ul className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {PLAYS.map((p, i) => (
            <li key={p.n} className="chunk rise flex flex-col gap-2.5 rounded-[20px] bg-surface p-5" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between">
                <span className="led text-[34px] text-accent">{p.n}</span>
                <span className={`grid h-11 w-11 place-items-center rounded-[14px] border-2 border-ink ${p.tint}`}><PlayIcon icon={p.icon} /></span>
              </div>
              <h3 className="font-display text-[22px] font-extrabold">{p.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="clubs" aria-labelledby="choose" className="scroll-mt-6">
        <ClubPicker clubs={clubs} leagues={LEAGUE_ORDER} />
      </section>
    </div>
  );
}
