import type { BoardItem } from "@/lib/sponsors/board";
import { evidence } from "@/lib/sponsors/rank";
import { SectionTitle } from "../../ui";

const SHOWN = 20;

function Both() {
  return <span className="shrink-0 rounded-full bg-sun-soft px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">★ Both lists</span>;
}

export function SponsorBoard({ items, city, team }: { items: BoardItem[]; city: string; team: string }) {
  const assistant = items.filter((i) => i.assistantRank != null).sort((a, b) => a.assistantRank! - b.assistantRank!).slice(0, SHOWN);
  const qloo = items.filter((i) => i.qloo).sort((a, b) => b.qloo!.score - a.qloo!.score).slice(0, SHOWN);

  return (
    <section>
      <SectionTitle kicker="Sponsor board" title="Who to pitch">
        Two lists that find different sponsors. An assistant names local businesses; Qloo ranks consumer brands by how strongly {city} and your fans
        like them. Together they found more of clubs&apos; real 2025 presenting sponsors than the assistant alone.
      </SectionTitle>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rise overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <h3 className="border-b border-line bg-accent-soft/60 px-5 py-3 text-sm font-semibold">
            Local businesses <span className="font-normal text-muted">· named by an assistant</span>
          </h3>
          {assistant.length ? (
            <ol className="divide-y divide-line">
              {assistant.map((item, i) => (
                <li key={item.name} className="rise flex items-center gap-3 px-5 py-2.5 text-sm" style={{ animationDelay: `${i * 30}ms` }}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold tabular-nums text-accent">{i + 1}</span>
                  <span className="flex-1 font-medium">{item.name}</span>
                  {item.source === "both" && <Both />}
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">The assistant list for this club isn&apos;t ready yet.</p>
          )}
        </div>
        <div className="rise overflow-hidden rounded-2xl border border-line bg-surface shadow-sm" style={{ animationDelay: "80ms" }}>
          <h3 className="border-b border-line bg-accent-soft/60 px-5 py-3 text-sm font-semibold">
            Audience-fit brands <span className="font-normal text-muted">· ranked with Qloo</span>
          </h3>
          {qloo.length ? (
            <ol className="divide-y divide-line">
              {qloo.map((item, i) => (
                <li key={item.name} className="rise px-5 py-2.5 text-sm" style={{ animationDelay: `${80 + i * 30}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold tabular-nums text-accent-ink">{i + 1}</span>
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.category && <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted sm:inline">{item.category.replaceAll("_", " ")}</span>}
                    {item.source === "both" && <Both />}
                  </div>
                  <div className="ml-9 mt-1 flex flex-wrap gap-1">
                    {evidence(item.qloo!, city, team).map((line) => (
                      <span key={line} className="rounded bg-bg px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">{line}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">No Qloo brand data is cached for this club yet.</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Banks, health systems and car dealers often sponsor clubs but sit outside Qloo&apos;s consumer data; the assistant list covers them. Alcohol, gambling,
        tobacco, cannabis, crypto and firearms brands are left off.
      </p>
    </section>
  );
}
