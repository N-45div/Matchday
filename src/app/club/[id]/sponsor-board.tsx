import type { BoardItem } from "@/lib/sponsors/board";
import { evidence } from "@/lib/sponsors/rank";

const SHOWN = 20;

function Flags({ item }: { item: BoardItem }) {
  return (
    <>
      {item.source === "both" && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">Both sources</span>}
      {item.restrictions.includes("alcohol") && <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-medium text-warn">Alcohol · 21+ nights only</span>}
    </>
  );
}

export function SponsorBoard({ items, city, team }: { items: BoardItem[]; city: string; team: string }) {
  const assistant = items.filter((i) => i.assistantRank != null).sort((a, b) => a.assistantRank! - b.assistantRank!).slice(0, SHOWN);
  const qloo = items.filter((i) => i.qloo).sort((a, b) => b.qloo!.score - a.qloo!.score).slice(0, SHOWN);
  const nickname = team;

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Sponsor board</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Two lists that find different sponsors. An assistant names local businesses; Qloo ranks consumer brands by how strongly {city} and your fans like them.
        Together they found more of clubs&apos; real 2025 presenting sponsors than the assistant alone.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface">
          <h3 className="border-b border-line px-4 py-2.5 text-sm font-medium">Local businesses <span className="font-normal text-muted">· named by an assistant</span></h3>
          {assistant.length ? (
            <ol className="divide-y divide-line">
              {assistant.map((item, i) => (
                <li key={item.name} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <span className="w-6 shrink-0 text-xs tabular-nums text-muted">{i + 1}</span>
                  <span className="flex-1">{item.name}</span>
                  <Flags item={item} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">The assistant list for this club isn&apos;t ready yet.</p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-surface">
          <h3 className="border-b border-line px-4 py-2.5 text-sm font-medium">Audience-fit brands <span className="font-normal text-muted">· ranked with Qloo</span></h3>
          <ol className="divide-y divide-line">
            {qloo.map((item, i) => (
              <li key={item.name} className="px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-xs tabular-nums text-muted">{i + 1}</span>
                  <span className="flex-1">{item.name}</span>
                  {item.category && <span className="text-[10px] uppercase tracking-wide text-muted">{item.category.replaceAll("_", " ")}</span>}
                  <Flags item={item} />
                </div>
                <p className="ml-8 mt-0.5 text-xs text-muted">{evidence(item.qloo!, city, nickname).join(" · ")}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Banks, health systems and car dealers often sponsor clubs but sit outside Qloo&apos;s consumer data; the assistant list covers them. Gambling, tobacco, cannabis, crypto and firearms brands are hidden.</p>
    </section>
  );
}
