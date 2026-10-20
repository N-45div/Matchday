"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClubSummary } from "@/lib/data/clubs";
import { monogram } from "./ui";

const CAPS = ["bg-accent", "bg-navy", "bg-stitch", "bg-accent", "bg-navy", "bg-grass"];

export function ClubPicker({ clubs, leagues }: { clubs: ClubSummary[]; leagues: readonly string[] }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState<string | null>(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => (!league || c.league === league) && (!q || `${c.name} ${c.city} ${c.region ?? ""} ${c.venue ?? ""}`.toLowerCase().includes(q)));
  }, [clubs, query, league]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="choose" className="font-display text-[32px] font-extrabold tracking-tight">Choose your club</h2>
        <label className="flex w-full max-w-sm flex-col gap-1.5 text-[13px] font-bold">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Club, city or ballpark"
            className="chunk-sm min-h-12 rounded-full bg-surface px-5 text-base font-normal outline-none focus:ring-4 focus:ring-accent/25"
          />
        </label>
      </div>
      <div role="group" aria-label="League" className="mt-5 inline-flex flex-wrap gap-1.5 rounded-[18px] border-2 border-ink bg-surface p-1.5">
        {[null, ...leagues].map((l) => {
          const count = l ? clubs.filter((c) => c.league === l).length : clubs.length;
          return (
            <button
              key={l ?? "all"}
              type="button"
              onClick={() => setLeague(l)}
              aria-pressed={league === l}
              className={`min-h-11 rounded-xl px-4 text-[15px] font-bold transition-colors ${league === l ? "bg-accent text-white" : "hover:bg-bg"}`}
            >
              {l ?? "All"} <span className="led ml-1">{count}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <p className="mt-6 text-muted">No club matches “{query}”.</p>}
      {leagues.map((l) => {
        const list = shown.filter((c) => c.league === l);
        if (!list.length) return null;
        return (
          <section key={l} className="mt-8" aria-label={l}>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted">
              {l} · {list.length} clubs
            </p>
            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3.5">
              {list.map((c, i) => (
                <li key={c.id} className="rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <Link href={`/club/${c.id}`} className="press chunk-sm group flex items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5">
                    <span className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full border-2 border-ink font-display text-lg font-extrabold text-white transition-transform group-hover:rotate-12 ${CAPS[i % CAPS.length]}`}>
                      {monogram(c.name, c.nickname)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{c.name}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted">
                        {c.city}
                        {c.region ? `, ${c.region}` : ""}
                        {c.venue ? ` · ${c.venue}` : ""}
                      </span>
                    </span>
                    <span className="hidden shrink-0 rounded-full border-2 border-ink bg-sun px-2.5 py-1 text-xs font-extrabold tracking-wider group-hover:inline">SELECT</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
