import { convertToModelMessages, isStepCount, streamText, tool, type ToolSet, type UIMessage } from "ai";
import { agentLimit } from "@/lib/agent/limits";
import { DESK_TOOLS } from "@/lib/agent/registry";
import { DeskToolError } from "@/lib/agent/tools";

/**
 * The in-app agent behind "Ask the desk": a model with the desk's tools (the same ones /api/mcp serves), answering about one club.
 * Every fact comes from a tool call over cached data; the model only chooses the calls and writes the answer.
 */

export const maxDuration = 60;

const MODEL = "anthropic/claude-haiku-5.5";
const MAX_MESSAGES = 16;
const MAX_CHARS = 1200;

const tools: ToolSet = Object.fromEntries(
  Object.entries(DESK_TOOLS).map(([name, t]) => [
    name,
    tool({
      description: t.description,
      inputSchema: t.input,
      execute: async (input: unknown) => {
        try {
          return await t.run(input as never);
        } catch (error) {
          if (error instanceof DeskToolError) return { error: error.message };
          throw error;
        }
      },
    }),
  ]),
);

function instructions(club: { id: string; name: string }) {
  return [
    `You are the Matchday Revenue Desk, working for the marketing and sponsorship staff of the ${club.name} (club id ${club.id}). Questions are about this club unless the user names another; use find_clubs for other clubs.`,
    "Get every fact from the tools: sponsor names, partners, dates and fan numbers. Never invent a business, a date or a number the tools didn't return. If the tools can't answer, say so.",
    "Call the tools first without announcing them, then lead with the answer and a short list. Call fan numbers estimates. When you draft a pitch or a promotion-night brief, back each claim with the tool's evidence (for example '#4 in Rochester taste') and promise no outcomes.",
    "The desk leaves alcohol brands, bars and breweries out entirely; don't suggest them.",
    "Write plain text: no Markdown headings, tables or bold. Use '- ' for list items. Keep answers under 200 words unless asked for a draft.",
    "Only help with this desk's work: promotions, sponsors, partners and the evidence behind them.",
  ].join("\n");
}

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { messages?: UIMessage[]; clubId?: string; clubName?: string } | null;
  const messages = body?.messages;
  const clubId = String(body?.clubId ?? "");
  const clubName = String(body?.clubName ?? "").slice(0, 80);
  if (!Array.isArray(messages) || !messages.length || !/^mlb-\d+$/.test(clubId) || !clubName) {
    return Response.json({ error: "Send messages, a clubId and a clubName." }, { status: 400 });
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user" || textOf(last).length > MAX_CHARS) {
    return Response.json({ error: `Keep a question under ${MAX_CHARS} characters.` }, { status: 400 });
  }

  const limited = await agentLimit(request.headers);
  if (limited) return Response.json({ error: limited }, { status: 429 });

  const result = streamText({
    model: MODEL,
    instructions: instructions({ id: clubId, name: clubName }),
    messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES), { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(6),
    reasoning: "none",
    temperature: 0.2,
    maxOutputTokens: 1500,
  });
  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[agent] failed", error);
      return "The desk couldn't finish that answer. Please try again.";
    },
  });
}
