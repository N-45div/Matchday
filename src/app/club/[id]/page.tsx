import Link from "next/link";
import { notFound } from "next/navigation";
import fit2025 from "../../../../data/eval/sponsor-fit-2025.json";
import lift from "../../../../data/lift/lift.json";
import { getClubDesk } from "@/lib/data/desk";
import { planView } from "@/lib/plan/view";
import { monogram } from "../../ui";
import { Dugout } from "./dugout";
import { PartnerRadar } from "./partner-radar";
import { PlanBoard } from "./plan-board";
import { SponsorHand, type Scout, type SponsorCard } from "./sponsor-hand";

// The assistant sometimes names a kind of business instead of one ("similar independent restaurants"); those aren't prospects.
const GENERIC = /\b(similar|various|other local|local (eateries|restaurants|businesses|shops)|style local)\b/i;

export async function generateMetadata({ params }: PageProps<"/club/[id]">) {
  const desk = await getClubDesk((await params).id);
  return { title: desk ? `${desk.club.name} · Matchday Revenue Desk` : "Club not found · Matchday Revenue Desk" };
}

export default async function ClubPage({ params }: PageProps<"/club/[id]">) {
  const { id } = await params;
  const desk = await getClubDesk(id);
  if (!desk) notFound();
  const { club, plan } = desk;

  const cards: SponsorCard[] = desk.board
    .filter((i) => i.qloo)
    .sort((a, b) => b.qloo!.score - a.qloo!.score)
    .slice(0, 18)
    .map((i) => ({
      name: i.name,
      category: i.category,
      cityRank: i.qloo!.cityRank != null ? i.qloo!.cityRank + 1 : null,
      fanRank: i.qloo!.teamRank != null ? i.qloo!.teamRank + 1 : null,
      lift: i.qloo!.localLift,
      both: i.source === "both",
    }));
  const assistant = desk.board.filter((i) => i.assistantRank != null && !GENERIC.test(i.name)).sort((a, b) => a.assistantRank! - b.assistantRank!);
  const scouts: Scout[] = assistant.slice(0, 10).map((i) => ({ name: i.name.replace(/\s*\([^)]*\)/g, "").trim(), both: i.source === "both" }));

  const pooled = (lift.tiers as Record<string, { pooled: Record<string, { lift_pct: number; ci95?: number[] }> }>)[desk.tier].pooled;
  const where = desk.tier === "MLB" ? "in MLB" : "in the minors";
  const hybrid = fit2025.differences["hybrid_name300 minus llm_name300"];
  const pitchTo = cards.find((c) => c.both)?.name ?? cards[0]?.name ?? scouts[0]?.name;
  const suggestions = [
    "Plan 10 fireworks nights with nothing in April",
    pitchTo ? `Draft a pitch to ${pitchTo} for a family Sunday` : "Who should we pitch for a family Sunday?",
    "Which partners stay open on Tuesday game nights?",
  ];

  return (
    <div className="space-y-7">
      <section aria-label="Club" className="chunk rise flex flex-wrap items-center justify-between gap-5 rounded-[26px] bg-accent px-5 py-6 text-white sm:px-7">
        <div className="flex min-w-0 flex-wrap items-center gap-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[3px] border-white bg-navy font-display text-2xl font-extrabold shadow-[0_0_0_2px_var(--ink)] sm:h-[88px] sm:w-[88px] sm:text-[32px]">
            {monogram(club.name, club.nickname)}
          </span>
          <div className="min-w-0">
            <Link href="/" className="text-sm font-semibold text-[#dce6ff] hover:text-white">← All clubs</Link>
            <h1 className="mt-1 font-display text-4xl font-extrabold leading-none tracking-tight sm:text-[54px]">{club.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-white px-3 py-1 text-ink">{club.league}</span>
              {club.venue && <span className="rounded-full bg-white/20 px-3 py-1">{club.venue}</span>}
              <span className="rounded-full bg-white/20 px-3 py-1">
                {club.city}
                {club.region ? `, ${club.region}` : ""}
              </span>
            </div>
          </div>
        </div>
        <span className="chunk-sm rotate-3 rounded-2xl bg-sun px-3.5 py-2.5 text-sm font-extrabold tracking-wide text-ink">
          {club.hasFanSignal ? "QLOO KNOWS YOUR FANS" : "QLOO CITY TASTE"}
        </span>
      </section>

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-7 pb-24 lg:pb-0">
          {plan ? (
            <PlanBoard
              view={planView(plan)}
              totals={{ desk: plan.addedFans, mine: plan.clubMixAddedFans }}
              lifts={desk.lifts}
              tier={desk.tier}
            />
          ) : (
            <p className="chunk rounded-3xl bg-surface p-6 text-muted">This club has no 2027 home dates or no attendance history in the data, so there is no promotion plan.</p>
          )}
          <SponsorHand cards={cards} scouts={scouts} scoutTotal={assistant.length} city={club.city} nickname={club.nickname} />
          <PartnerRadar partners={desk.partners} venue={club.venue} reason={desk.partnersReason} />
          <section aria-labelledby="ev-h">
            <h2 id="ev-h" className="font-display text-[26px] font-extrabold">How sure is this?</h2>
            <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
              <Tile value={`+${pooled.fireworks.lift_pct}%`} text={`Crowd lift on fireworks nights ${where}, 2025–26. 95% range ${pooled.fireworks.ci95?.[0]} to ${pooled.fireworks.ci95?.[1]}.`} />
              <Tile value={`+${Math.round(pooled.fireworks_midweek_total.lift_pct)}%`} text="The same lift Monday to Thursday, when crowds are small. That is why midweek dates win." />
              <Tile value={`+${hybrid.value}`} text={`More real 2025 sponsors found by the two-list board than by the assistant alone. Range +${hybrid.ci95[0]} to +${hybrid.ci95[1]}.`} />
            </div>
            <Link href="/proof" className="mt-3 inline-block text-sm font-bold text-accent hover:underline">All the evidence and its limits</Link>
          </section>
        </div>
        <Dugout clubId={club.id} clubName={club.name} suggestions={suggestions} />
      </div>
    </div>
  );
}

function Tile({ value, text }: { value: string; text: string }) {
  return (
    <div className="rounded-[18px] border-2 border-ink bg-navy p-4 text-[#f4f7ff]">
      <span className="led text-[34px] text-sun">{value}</span>
      <p className="mt-1.5 text-sm leading-snug">{text}</p>
    </div>
  );
}
