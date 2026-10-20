"use client";

import { useMemo, useState } from "react";
import type { Lifts } from "@/lib/plan/season";
import type { NightView, PlanView } from "@/lib/plan/view";
import { PROMO_STYLE, type Promo } from "../../ui";

type Mode = "desk" | "mine";

const fmt = (n: number) => n.toLocaleString("en-US");
const thousands = (n: number) => (n / 1000).toFixed(1);
const MIDWEEK = new Set(["Monday", "Tuesday", "Wednesday", "Thursday"]);

function why(night: NightView, promo: Promo | null, lifts: Lifts, tier: "MLB" | "MiLB"): string {
  const league = tier === "MLB" ? "MLB" : "minor league";
  const mid = MIDWEEK.has(night.weekday);
  const pct = (k: Promo) => Math.round(mid ? lifts[k].midweek : lifts[k].weekend);
  switch (promo) {
    case "fireworks":
      return mid
        ? `Midweek fireworks lift ${league} crowds about ${pct("fireworks")}%: small crowds, big jump.`
        : `Weekend fireworks lift ${league} crowds about ${pct("fireworks")}% on top of crowds that are already big.`;
    case "bobblehead":
      return `Bobblehead nights lift ${league} crowds about ${pct("bobblehead")}%.`;
    case "giveaway":
      return `Giveaways lift ${league} crowds about ${pct("giveaway")}%.${night.family ? " A family day, so a good fit for kids' items." : ""}`;
    case "theme":
      return `Theme nights lift ${league} crowds about ${pct("theme")}%.`;
    case "opening":
      return `Opening night draws about ${pct("opening")}% more on its own.`;
    default:
      return night.dayGame ? "Likely a day game from your 2025–26 pattern, so no fireworks here." : "No promotion on this date in this plan.";
  }
}

export function PlanBoard({ view, totals, lifts, tier, counts }: { view: PlanView; totals: { desk: number; mine: number | null }; lifts: Lifts; tier: "MLB" | "MiLB"; counts: [Promo, number][] }) {
  const [mode, setMode] = useState<Mode>("desk");
  const [pick, setPick] = useState(view.bestDate ?? view.nights[0]?.date);
  const hasMine = totals.mine != null;
  const months = useMemo(() => {
    const byMonth = new Map<string, NightView[]>();
    for (const n of view.nights) byMonth.set(n.date.slice(0, 7), [...(byMonth.get(n.date.slice(0, 7)) ?? []), n]);
    return [...byMonth];
  }, [view.nights]);
  const picked = view.nights.find((n) => n.date === pick) ?? null;
  const slot = (n: NightView) => (mode === "mine" && n.mine ? n.mine : n.desk);
  const pickedSlot = picked ? slot(picked) : null;
  const gain = totals.mine != null ? totals.desk - totals.mine : null;
  const label = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <section aria-labelledby="plan-h" className="chunk rise rounded-3xl bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">2027 promotion plan</p>
          <h2 id="plan-h" className="mt-1 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Same nights, better dates</h2>
        </div>
        {hasMine && (
          <div role="group" aria-label="Which placement to show" className="inline-flex gap-1 rounded-2xl border-2 border-ink bg-bg p-1">
            {(["mine", "desk"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`min-h-11 rounded-xl px-4 text-[15px] font-bold transition-colors ${mode === m ? (m === "desk" ? "bg-accent text-white" : "bg-navy text-white") : "text-ink hover:bg-surface"}`}
              >
                {m === "desk" ? "Matchday plan" : "Your 2026 way"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-navy px-4 py-3.5 text-[#f4f7ff] sm:hidden">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-[#a9bceb]">ADDED FANS, 2027</p>
          <p className="led text-[40px] leading-tight text-sun">{fmt(totals.desk)}</p>
        </div>
        {totals.mine != null && (
          <div className="text-right">
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#a9bceb]">YOUR WAY</p>
            <p className="led text-2xl text-led-dim">{fmt(totals.mine)}</p>
          </div>
        )}
      </div>
      <div className="mt-2 overflow-x-auto rounded-2xl bg-navy p-4 text-[#f4f7ff] sm:mt-5">
        <table className="w-full min-w-[600px] border-separate border-spacing-1 tabular-nums">
          <caption className="px-1 pb-2 text-left text-xs font-bold tracking-[0.12em] text-[#a9bceb]">ADDED FANS BY MONTH, THOUSANDS (ESTIMATES)</caption>
          <thead>
            <tr className="text-[11px] font-bold tracking-[0.12em] text-[#a9bceb]">
              <th scope="col" className="text-left">MONTH</th>
              {view.months.map((m) => <th key={m.key} scope="col">{m.label}</th>)}
              <th scope="col" className="text-sun">FANS</th>
            </tr>
          </thead>
          <tbody>
            {hasMine && (
              <tr className={`transition-opacity ${mode === "mine" ? "opacity-100" : "opacity-50"}`}>
                <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-bold tracking-[0.08em] text-led-dim">YOUR 2026 WAY</th>
                {view.months.map((m, i) => (
                  <td key={m.key} className="led roll rounded-lg bg-led px-1 py-2.5 text-center text-2xl text-led-dim" style={{ animationDelay: `${i * 60}ms` }}>{thousands(m.mine ?? 0)}</td>
                ))}
                <td className="led rounded-lg bg-led px-2 py-2.5 text-center text-[26px] text-led-dim">{thousands(totals.mine!)}</td>
              </tr>
            )}
            <tr className={`transition-opacity ${mode === "desk" ? "opacity-100" : "opacity-50"}`}>
              <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-extrabold tracking-[0.08em] text-white">MATCHDAY</th>
              {view.months.map((m, i) => (
                <td key={m.key} className={`led roll rounded-lg bg-led px-1 py-2.5 text-center text-2xl ${m.mine != null && m.desk > m.mine ? "text-sun" : "text-[#f4f7ff]"}`} style={{ animationDelay: `${200 + i * 60}ms` }}>
                  {thousands(m.desk)}
                </td>
              ))}
              <td className="led pop rounded-lg bg-sun px-2 py-2.5 text-center text-[26px] text-navy" style={{ animationDelay: "700ms" }}>{thousands(totals.desk)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        {gain != null && gain > 0 && (
          <span className="pop rounded-full border-2 border-ink bg-sun px-3 py-1.5 text-sm font-extrabold" style={{ animationDelay: "900ms" }}>
            +{fmt(gain)} fans · {(totals.desk / Math.max(totals.mine!, 1)).toFixed(1)}×
          </span>
        )}
        <span className="text-[15px] text-muted">{mode === "mine" && view.mineLine ? view.mineLine : view.deskLine}</span>
      </div>
      {hasMine && <p className="mt-2 text-xs text-muted">Yellow months: the Matchday plan wins. Both placements use the same nights; only the dates change.</p>}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-[22px] font-extrabold">Season board</h3>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold" aria-label="Legend">
          {counts.map(([kind, n]) => (
            <li key={kind} className="inline-flex items-center gap-1.5">
              <span className={`h-3.5 w-3.5 rounded-full border-2 border-ink ${PROMO_STYLE[kind].fill}`} />
              {PROMO_STYLE[kind].label} · {n}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5"><span className="h-1 w-3.5 rounded-sm bg-grass" />Family day</li>
        </ul>
      </div>
      <div className="mt-3.5 space-y-2.5">
        {months.map(([key, nights]) => (
          <div key={key} className="flex items-start gap-3">
            <span className="w-11 shrink-0 pt-4 text-[13px] font-extrabold tracking-[0.1em] text-muted">{view.months.find((m) => m.key === key)?.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {nights.map((n, i) => {
                const promo = slot(n).promo as Promo | null;
                const selected = n.date === pick;
                const day = Number(n.date.slice(8));
                return (
                  <button
                    key={`${mode}-${n.date}`}
                    type="button"
                    onClick={() => setPick(n.date)}
                    aria-pressed={selected}
                    aria-label={`${label(n.date)}${promo ? `, ${PROMO_STYLE[promo].label}` : ", no promotion"}`}
                    className={`relative flex h-[54px] w-[46px] flex-col items-center justify-center gap-px rounded-xl ${promo ? `token-in border-2 border-ink ${PROMO_STYLE[promo].fill} ${PROMO_STYLE[promo].fg}` : "border-[1.5px] border-line bg-surface"} ${selected ? "outline-3 outline-offset-2 outline-ink" : ""}`}
                    style={promo ? { animationDelay: `${i * 22}ms` } : undefined}
                  >
                    <span className="text-[10px] font-bold opacity-80">{n.weekday[0]}</span>
                    <span className="text-base font-extrabold leading-none">{day}</span>
                    {n.family && <span className="absolute inset-x-2.5 bottom-1 h-[3px] rounded-sm bg-grass" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {picked && (
        <div aria-live="polite" className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-ink bg-bg px-4 py-4">
          <span className={`h-12 w-12 shrink-0 rounded-full border-2 border-ink ${pickedSlot?.promo ? PROMO_STYLE[pickedSlot.promo as Promo].fill : "bg-surface"}`} />
          <div className="min-w-0 flex-[1_1_260px]">
            <p className="text-lg font-extrabold">
              {label(picked.date)} · {pickedSlot?.promo ? PROMO_STYLE[pickedSlot.promo as Promo].label : "home game"}
            </p>
            <p className="mt-1 text-[15px] text-muted">{why(picked, (pickedSlot?.promo as Promo | null) ?? null, lifts, tier)}</p>
          </div>
          {pickedSlot && pickedSlot.fans > 0 && <span key={`${mode}-${pick}`} className="led roll text-3xl text-accent">+{fmt(pickedSlot.fans)}</span>}
        </div>
      )}
    </section>
  );
}
