import Link from "next/link";
import { notFound } from "next/navigation";
import { getClubDesk } from "@/lib/data/desk";
import { CountUp } from "../../count-up";
import { Baseball, PROMO_STYLE, SectionTitle } from "../../ui";
import { AskDesk } from "./ask-desk";
import { PartnerTable } from "./partner-table";
import { SeasonCalendar } from "./season-calendar";
import { SponsorBoard } from "./sponsor-board";

const fmt = (n: number) => n.toLocaleString("en-US");

export async function generateMetadata({ params }: PageProps<"/club/[id]">) {
  const desk = await getClubDesk((await params).id);
  return { title: desk ? `${desk.club.name} · Matchday Revenue Desk` : "Club not found · Matchday Revenue Desk" };
}

export default async function ClubPage({ params }: PageProps<"/club/[id]">) {
  const { id } = await params;
  const desk = await getClubDesk(id);
  if (!desk) notFound();
  const { club, plan, budget } = desk;
  const nights = (Object.entries(budget) as [string, number | undefined][]).filter(([, n]) => n);
  const mine = plan?.clubMixAddedFans ?? null;

  return (
    <div className="space-y-12">
      <header className="scoreboard rise relative overflow-hidden rounded-2xl px-6 py-8 text-white sm:px-10 sm:py-10">
        <Baseball className="spin-slow pointer-events-none absolute -right-14 -top-14 h-56 w-56 opacity-10" />
        <Link href="/" className="text-xs font-medium text-blue-100 hover:text-white">← All clubs</Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{club.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-white px-2.5 py-1 text-navy">{club.league}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">{club.venue ?? "Ballpark"}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">
            {club.city}
            {club.region ? `, ${club.region}` : ""}
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">{club.hasFanSignal ? "Qloo knows this club's fans" : "Qloo city taste (no fan-base entity)"}</span>
        </div>
      </header>

      {plan ? (
        <section className="rise rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8" style={{ animationDelay: "120ms" }}>
          <SectionTitle kicker="2027 promotion plan" title="Your nights, on better dates">
            The same nights as your 2026 schedule, placed on 2027 home dates where measured lift adds the most fans.
          </SectionTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {nights.map(([kind, n]) => (
              <span key={kind} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PROMO_STYLE[kind].chip}`}>
                {n} {PROMO_STYLE[kind].nights}
              </span>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            <Bar label="Matchday plan" value={plan.addedFans} max={plan.addedFans} strong />
            {mine != null && <Bar label="Same nights on your 2026 weekdays" value={mine} max={plan.addedFans} />}
          </div>
          {mine != null && mine > 0 && plan.addedFans > mine && (
            <p className="pop mt-5 inline-flex items-center gap-2 rounded-full bg-sun-soft px-3 py-1.5 text-sm font-semibold text-[#b45309]" style={{ animationDelay: "900ms" }}>
              +{fmt(plan.addedFans - mine)} more fans · {(plan.addedFans / mine).toFixed(1)}× your 2026 placement
            </p>
          )}
          <p className="mt-4 text-xs leading-5 text-muted">
            Added fans are estimates from 2025–26 games at every MLB and affiliated minor league park, scaled to your own crowds. They are observed
            associations, not guarantees. <Link href="/proof" className="font-medium text-accent hover:underline">See the evidence</Link>.
          </p>
        </section>
      ) : (
        <p className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">This club has no 2027 home dates or no attendance history in the data, so there is no promotion plan.</p>
      )}

      <AskDesk clubId={club.id} clubName={club.name} nickname={club.nickname} />
      <SponsorBoard items={desk.board} city={club.city} team={club.nickname} />
      <PartnerTable partners={desk.partners} venue={club.venue} reason={desk.partnersReason} />
      {plan && <SeasonCalendar entries={plan.entries} />}
    </div>
  );
}

function Bar({ label, value, max, strong }: { label: string; value: number; max: number; strong?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={strong ? "font-semibold" : "text-muted"}>{label}</span>
        <span className={`font-display tabular-nums ${strong ? "text-2xl font-extrabold text-accent" : "text-lg font-bold text-muted"}`}>
          <CountUp value={value} prefix="+" /> <span className="text-xs font-medium">fans</span>
        </span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-accent-soft">
        <div
          className={`bar-grow h-full rounded-full ${strong ? "bg-gradient-to-r from-accent to-accent-2" : "bg-[#9db4dc]"}`}
          style={{ width: `${Math.max(2, (value / Math.max(max, 1)) * 100)}%`, animationDelay: strong ? "200ms" : "450ms" }}
        />
      </div>
    </div>
  );
}
