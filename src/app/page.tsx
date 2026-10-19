import lift from "../../data/lift/lift.json";
import { LEAGUE_ORDER, listClubs } from "@/lib/data/clubs";
import { ClubPicker } from "./club-picker";
import { CountUp } from "./count-up";
import { Baseball } from "./ui";

const FEATURES = [
  ["Promotion plan", "Next season's fireworks, bobbleheads and giveaways on the 2027 dates where they add the most fans."],
  ["Sponsor board", "Local businesses an assistant can name, plus the brands your city and fans like most, with Qloo evidence."],
  ["Food partners", "Family restaurants, cafes and bakeries near the ballpark, ranked by your fans' taste."],
  ["Ask the desk", "An agent that re-plans the season, filters prospects and drafts pitches from the evidence."],
];

export default async function Home() {
  const clubs = await listClubs();
  const tiers = lift.tiers as Record<string, { games: Record<string, number>; pooled: Record<string, { lift_pct: number }> }>;
  const games = Object.values(tiers).reduce((s, t) => s + Object.values(t.games).reduce((a, b) => a + b, 0), 0);
  const stats = [
    { value: clubs.length, prefix: "", suffix: "", label: "MLB and minor league clubs" },
    { value: games, prefix: "", suffix: "", label: "real games measured" },
    { value: Math.round(tiers.MiLB.pooled.fireworks_midweek_total.lift_pct), prefix: "+", suffix: "%", label: "crowds on midweek fireworks nights, minors" },
  ];

  return (
    <div className="space-y-10">
      <section className="scoreboard rise relative overflow-hidden rounded-2xl px-6 py-10 text-white sm:px-10 sm:py-12">
        <Baseball className="fly pointer-events-none absolute left-0 top-0 h-7 w-7" />
        <Baseball className="spin-slow pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 opacity-10" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">For club marketing and sponsorship staff</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Fill more seats next season.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
          Pick your club. Matchday plans your 2027 promotion nights from measured attendance lift, lines up sponsors your city actually likes, and
          finds family food partners near the ballpark.
        </p>
        <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={s.label} className="pop rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/15 backdrop-blur" style={{ animationDelay: `${200 + i * 120}ms` }}>
              <dd className="font-display text-2xl font-extrabold sm:text-3xl">
                <CountUp value={s.value} prefix={s.prefix} />
                {s.suffix}
              </dd>
              <dt className="mt-0.5 text-[11px] leading-4 text-blue-100 sm:text-xs">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([title, body], i) => (
          <div key={title} className="rise rounded-xl border border-line bg-surface p-4" style={{ animationDelay: `${120 + i * 70}ms` }}>
            <p className="font-display text-base font-bold">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Pick your club</h2>
        <div className="mt-4">
          <ClubPicker clubs={clubs} leagues={LEAGUE_ORDER} />
        </div>
      </section>
    </div>
  );
}
