import Link from "next/link";
import { notFound } from "next/navigation";
import { getClubDesk } from "@/lib/data/desk";
import { SponsorBoard } from "./sponsor-board";
import { PartnerTable } from "./partner-table";
import { SeasonCalendar } from "./season-calendar";

const fmt = (n: number) => n.toLocaleString("en-US");

export default async function ClubPage({ params }: PageProps<"/club/[id]">) {
  const { id } = await params;
  const desk = await getClubDesk(id);
  if (!desk) notFound();
  const { club, plan, budget } = desk;
  const nights = Object.entries(budget).filter(([, n]) => n).map(([kind, n]) => `${n} ${kind === "theme" ? "theme nights" : kind === "fireworks" ? "fireworks nights" : `${kind}s`}`);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-ink">← All clubs</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{club.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {club.league} · {club.venue ?? "Ballpark"} · {club.city}
          {club.region ? `, ${club.region}` : ""}
          {club.hasFanSignal ? " · Qloo knows this club's fan base" : " · Qloo city taste only (no fan-base entity for this club)"}
        </p>
      </div>

      {plan && (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">2027 promotion plan</h2>
          <p className="mt-1 text-sm text-muted">Same nights as your 2026 schedule{nights.length ? `: ${nights.join(", ")}` : ""}. Placed on 2027 home dates where measured lift adds the most fans.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Added fans, this plan" value={`+${fmt(plan.addedFans)}`} strong />
            {plan.clubMixAddedFans != null && <Stat label="Same nights, your 2026 weekdays" value={`+${fmt(plan.clubMixAddedFans)}`} />}
            {plan.clubMixAddedFans != null && <Stat label="Difference" value={`${plan.addedFans >= plan.clubMixAddedFans ? "+" : ""}${fmt(plan.addedFans - plan.clubMixAddedFans)} fans`} />}
          </div>
          <p className="mt-3 text-xs text-muted">Estimates from 2025–26 games at every MLB and affiliated minor league park. They are observed associations, not guarantees; see the Evidence page.</p>
        </section>
      )}

      <SponsorBoard items={desk.board} city={club.city} team={club.name} />
      <PartnerTable partners={desk.partners} venue={club.venue} />
      {plan && <SeasonCalendar entries={plan.entries} />}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className={`text-xl tabular-nums ${strong ? "font-semibold text-accent" : "font-medium"}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
