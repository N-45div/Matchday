"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClubSummary } from "@/lib/data/clubs";

const initials = (name: string) =>
  name
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .slice(-2)
    .map((w) => w[0])
    .join("");

export function ClubPicker({ clubs, leagues }: { clubs: ClubSummary[]; leagues: readonly string[] }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState<string | null>(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => (!league || c.league === league) && (!q || `${c.name} ${c.city} ${c.region ?? ""} ${c.venue ?? ""}`.toLowerCase().includes(q)));
  }, [clubs, query, league]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by club, city or ballpark"
          aria-label="Search clubs"
          className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by league">
          {[null, ...leagues].map((l) => (
            <button
              key={l ?? "all"}
              type="button"
              onClick={() => setLeague(l)}
              aria-pressed={league === l}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${league === l ? "bg-accent text-accent-ink shadow" : "bg-surface text-muted ring-1 ring-line hover:text-accent"}`}
            >
              {l ?? "All"}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && <p className="mt-6 text-sm text-muted">No club matches “{query}”.</p>}
      {leagues.map((l) => {
        const list = shown.filter((c) => c.league === l);
        if (!list.length) return null;
        return (
          <section key={l} className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {l} · {list.length}
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c, i) => (
                <li key={c.id} className="rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <Link href={`/club/${c.id}`} className="lift group flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 hover:border-accent">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent transition group-hover:bg-accent group-hover:text-accent-ink">
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {c.city}
                        {c.region ? `, ${c.region}` : ""}
                        {c.venue ? ` · ${c.venue}` : ""}
                      </span>
                    </span>
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
