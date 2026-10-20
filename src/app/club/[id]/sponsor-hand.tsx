"use client";

import { useState } from "react";

export interface SponsorCard {
  name: string;
  category: string | null;
  cityRank: number | null;
  fanRank: number | null;
  /** How many times stronger the brand ranks here than in a typical club city. */
  lift: number | null;
  both: boolean;
}

export interface Scout {
  name: string;
  both: boolean;
}

const FIRST = 6;
const DEAL = 6;

function tier(lift: number | null) {
  if (lift != null && lift >= 25) return { name: "Hometown legend", band: "holo" };
  if (lift != null && lift >= 5) return { name: "Local favorite", band: "bg-sky" };
  return { name: "Crowd pleaser", band: "bg-[#e3e9f6]" };
}

const rankWidth = (r: number | null) => (r ? `${Math.max(4, Math.round((1 - (r - 1) / 300) * 100))}%` : "0%");
const liftWidth = (x: number | null) => (x ? `${Math.max(6, Math.min(100, Math.round((Math.log(x) / Math.log(100)) * 100)))}%` : "0%");

function Stat({ label, value, width, color }: { label: string; value: string; width: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-[#e3e9f6]">
        <div className={`bar-grow h-full rounded ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

export function SponsorHand({ cards, scouts, scoutTotal, city, nickname }: { cards: SponsorCard[]; scouts: Scout[]; scoutTotal: number; city: string; nickname: string }) {
  const [shown, setShown] = useState(FIRST);
  return (
    <section aria-labelledby="pitch-h" className="space-y-4">
      <div>
        <p className="kicker">Sponsor board</p>
        <h2 id="pitch-h" className="mt-1 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Your hand of sponsors</h2>
        <p className="mt-1.5 max-w-3xl text-base leading-relaxed text-muted">
          Brands are cards. Rarity is how much more {city} likes a brand than a typical club city does; the stats are its Qloo ranks. The scouting list is the
          local businesses an assistant can name. Together they found more of clubs&apos; real 2025 sponsors than the assistant alone. No alcohol, gambling or tobacco.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <div className="chunk-sm w-full max-w-[300px] flex-[1_1_250px] rounded-[20px] bg-surface p-4">
          <p className="text-xs font-extrabold tracking-[0.14em] text-muted">SCOUTING LIST · ASSISTANT</p>
          {scouts.length ? (
            <ol className="mt-3 space-y-0.5">
              {scouts.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2.5 border-b border-dashed border-line py-1.5 text-[15px]">
                  <span className="led w-6 text-base text-accent">{i + 1}</span>
                  <span className="flex-1 font-semibold">{s.name}</span>
                  {s.both && <span className="rounded-full border-[1.5px] border-ink bg-sun px-1.5 text-[11px] font-extrabold">BOTH</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted">The assistant list for this club isn&apos;t ready yet.</p>
          )}
          {scoutTotal > scouts.length && <p className="mt-2.5 text-[13px] text-muted">{scoutTotal - scouts.length} more on the full list.</p>}
        </div>

        <div className="min-w-0 flex-[999_1_520px]">
          {cards.length ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {cards.slice(0, shown).map((c, i) => {
                const t = tier(c.lift);
                return (
                  <li key={c.name} className="card-tilt token-in flex flex-col overflow-hidden rounded-[20px] border-2 border-ink bg-surface shadow-[5px_5px_0_var(--ink)]" style={{ animationDelay: `${(i % DEAL) * 70}ms` }}>
                    <div className={`flex items-center justify-between border-b-2 border-ink px-3.5 py-2.5 ${t.band}`}>
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]">{t.name}</span>
                      <span className="led text-[22px]">{c.lift ? `${Math.round(c.lift)}×` : "–"}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                      <div>
                        <h3 className="font-display text-[22px] font-extrabold leading-tight">{c.name}</h3>
                        {c.category && <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-muted">{c.category.replaceAll("_", " ")}</p>}
                      </div>
                      <Stat label="CITY TASTE" value={c.cityRank ? `#${c.cityRank}` : "not ranked"} width={rankWidth(c.cityRank)} color="bg-accent" />
                      <Stat label={`${nickname.toUpperCase()} FANS`} value={c.fanRank ? `#${c.fanRank}` : "not ranked"} width={rankWidth(c.fanRank)} color="bg-navy" />
                      <Stat label="LOCAL PULL" value={c.lift ? `${Math.round(c.lift)}×` : "–"} width={liftWidth(c.lift)} color="bg-sun" />
                      {c.both && <span className="mt-auto self-start rounded-full border-[1.5px] border-ink bg-sun px-2 py-0.5 text-[11px] font-extrabold">ON BOTH LISTS</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border-2 border-ink bg-surface p-5 text-sm text-muted">No Qloo brand data is cached for this club yet.</p>
          )}
          {cards.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + DEAL)} className="press chunk-sm mt-5 min-h-11 rounded-full bg-surface px-5 text-[15px] font-extrabold">
              Deal {Math.min(DEAL, cards.length - shown)} more cards
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
