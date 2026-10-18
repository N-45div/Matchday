// The sponsor board, as evaluated (docs/eval-plan.md, amendment 2): an assistant's local businesses plus
// Qloo's audience-fit brands. On 2025 sponsors this hybrid beat the assistant alone (+29, 95% CI +12 to +48).

import { nameRestrictions, OFF_BY_DEFAULT, type Restriction } from "./categories";
import type { SponsorCandidate } from "./rank";

export interface BoardItem {
  name: string;
  /** "assistant" = named by the language model; "qloo" = audience-fit brand; "both" = both sources agree. */
  source: "assistant" | "qloo" | "both";
  restrictions: Restriction[];
  category: string | null;
  qloo: SponsorCandidate | null;
  /** Position in the assistant's list (0 = first), if the assistant named it. */
  assistantRank: number | null;
}

const key = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").replace(/\b(brewing|brewery|brewers)\b/g, "brew").replace(/\b(inc|llc|co|company|the)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function buildBoard(assistantNames: string[], qlooBoard: SponsorCandidate[], perSource = 150, enabled: Restriction[] = []): BoardItem[] {
  const blocked = OFF_BY_DEFAULT.filter((r) => !enabled.includes(r));
  const byKey = new Map<string, BoardItem>();
  assistantNames.slice(0, perSource).forEach((name, rank) => {
    const k = key(name);
    if (!k || byKey.has(k)) return;
    byKey.set(k, { name, source: "assistant", restrictions: nameRestrictions(name), category: null, qloo: null, assistantRank: rank });
  });
  for (const c of qlooBoard.slice(0, perSource)) {
    const k = key(c.brand.name);
    const existing = byKey.get(k);
    if (existing) {
      existing.source = "both";
      existing.qloo = c;
      existing.category = c.profile.category;
      existing.restrictions = [...new Set([...existing.restrictions, ...c.profile.restrictions])];
    } else {
      byKey.set(k, { name: c.brand.name, source: "qloo", restrictions: c.profile.restrictions, category: c.profile.category, qloo: c, assistantRank: null });
    }
  }
  return [...byKey.values()].filter((item) => !item.restrictions.some((r) => blocked.includes(r)));
}
