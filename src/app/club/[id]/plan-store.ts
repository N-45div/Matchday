"use client";

// Shared between the plan board and the dugout: which placement the board shows, and the agent's latest re-plan,
// so a re-plan the agent makes moves the tokens on the board.

import { useSyncExternalStore } from "react";

export type Mode = "desk" | "mine" | "agent";

export interface AgentPlan {
  nights: { date: string; weekday: string; promotion: string; addedFans: number }[];
  addedFans: number;
  /** The same nights on the club's 2026 weekdays, for the fair comparison. */
  mine: number | null;
  summary: string;
}

interface PlanState {
  mode: Mode;
  agent: AgentPlan | null;
}

let state: PlanState = { mode: "desk", agent: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const planStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  setMode(mode: Mode) {
    state = { ...state, mode };
    emit();
  },
  showAgent(agent: AgentPlan) {
    state = { mode: "agent", agent };
    emit();
  },
};

export function usePlanStore(): PlanState {
  return useSyncExternalStore(planStore.subscribe, planStore.get, planStore.get);
}

/** Reads a plan_season tool result into an agent plan, if it's for this club and has nights. */
export function agentPlanFrom(output: unknown, clubId: string): AgentPlan | null {
  const o = output as { club?: { id?: string }; nights?: AgentPlan["nights"]; addedFans?: number; sameNightsOnClubs2026Weekdays?: number | null; nightsPlaced?: Record<string, number> } | null;
  if (!o || o.club?.id !== clubId || !Array.isArray(o.nights) || typeof o.addedFans !== "number") return null;
  const placed = Object.entries(o.nightsPlaced ?? {}).filter(([, n]) => n > 0).map(([kind, n]) => `${n} ${kind}`);
  return { nights: o.nights, addedFans: o.addedFans, mine: o.sameNightsOnClubs2026Weekdays ?? null, summary: placed.length ? `Agent's re-plan: ${placed.join(", ")} nights.` : "Agent's re-plan." };
}
