// Daily limits for the public demo, counted in Postgres so every serverless instance shares them.
// Addresses are stored only as salted hashes, and only for the day.

import { createHash } from "node:crypto";
import { sql } from "../db";

export const LIMITS = {
  /** Questions to the in-app agent, per address per day. */
  agentPerAddress: 25,
  /** Questions to the in-app agent from everyone, per day: about $0.60 of model use at most. */
  agentPerDay: 250,
  /** MCP tool calls per address per day. They read the database only, so the limit is loose. */
  mcpPerAddress: 600,
  /** Live Qloo heatmaps the agent may ask for in a day (check_theme_night); subjects already checked are reused free. */
  liveQlooPerDay: 150,
};

export function addressOf(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

const hashed = (address: string) => createHash("sha256").update(`matchday:${address}`).digest("hex").slice(0, 24);

/** Counts one use against a key for today; false once today's count passes the limit. */
export async function take(key: string, limit: number): Promise<boolean> {
  const [row] = (await sql()`insert into usage_counts (key, day, count) values (${key}, current_date, 1)
    on conflict (key, day) do update set count = usage_counts.count + 1 returning count`) as { count: number }[];
  return row.count <= limit;
}

/** A sentence to show when the agent is over a limit, or null to go ahead. */
export async function agentLimit(headers: Headers): Promise<string | null> {
  if (!(await take(`agent:${hashed(addressOf(headers))}`, LIMITS.agentPerAddress))) {
    return `This demo answers ${LIMITS.agentPerAddress} questions per visitor per day. The club pages and the MCP endpoint still work.`;
  }
  if (!(await take("agent:all", LIMITS.agentPerDay))) {
    return "The demo's question budget for today is used up. The club pages and the MCP endpoint still work.";
  }
  return null;
}

export async function mcpLimit(headers: Headers): Promise<string | null> {
  return (await take(`mcp:${hashed(addressOf(headers))}`, LIMITS.mcpPerAddress)) ? null : `This endpoint answers ${LIMITS.mcpPerAddress} tool calls per address per day.`;
}
