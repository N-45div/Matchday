"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClubSummary } from "@/lib/data/clubs";

export function ClubPicker({ clubs, leagues }: { clubs: ClubSummary[]; leagues: readonly string[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clubs.filter((c) => `${c.name} ${c.city} ${c.region ?? ""} ${c.venue ?? ""}`.toLowerCase().includes(q)) : clubs;
  }, [clubs, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by club, city or ballpark"
        aria-label="Search clubs"
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {shown.length === 0 && <p className="mt-6 text-sm text-muted">No club matches “{query}”.</p>}
      {leagues.map((league) => {
        const list = shown.filter((c) => c.league === league);
        if (!list.length) return null;
        return (
          <section key={league} className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {league} · {list.length}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.id}>
                  <Link href={`/club/${c.id}`} className="block rounded-md border border-line bg-surface px-3 py-2.5 hover:border-accent">
                    <span className="block text-sm font-medium">{c.name}</span>
                    <span className="block text-xs text-muted">
                      {c.city}
                      {c.region ? `, ${c.region}` : ""}
                      {c.venue ? ` · ${c.venue}` : ""}
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
