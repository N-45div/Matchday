"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { type FormEvent, useMemo, useState } from "react";
import { Baseball } from "../../ui";

const TOOL_LABELS: Record<string, [running: string, done: string]> = {
  find_clubs: ["Finding the club", "Found the club"],
  sponsor_board: ["Reading the sponsor board", "Read the sponsor board"],
  nearby_partners: ["Looking up food partners", "Looked up food partners"],
  plan_season: ["Re-planning the season", "Re-planned the season"],
  get_evidence: ["Reading the evidence", "Read the evidence"],
};

/** The error body is JSON ({ error }) for limits and bad requests; anything else gets a plain sentence. */
function readable(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {}
  return error.message && error.message.length < 200 ? error.message : "The desk couldn't answer just now. Please try again.";
}

function Message({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <p className="rise ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2 text-sm text-accent-ink shadow-sm">
        {message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
      </p>
    );
  }
  return (
    <div className="rise flex gap-3">
      <Baseball className="mt-0.5 h-7 w-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {message.parts.filter(isToolUIPart).map((part, i) => {
            const [running, done] = TOOL_LABELS[getToolName(part)] ?? ["Working", "Done"];
            const finished = part.state === "output-available" || part.state === "output-error";
            return (
              <span key={i} className="pop inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                <span className={`h-1.5 w-1.5 rounded-full ${finished ? "bg-grass" : "animate-pulse bg-accent"}`} />
                {finished ? done : `${running}…`}
              </span>
            );
          })}
        </div>
        {message.parts.map((part, i) =>
          part.type === "text" && part.text.trim() ? (
            <p key={i} className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-bg px-4 py-3 text-sm leading-6 ring-1 ring-line">
              {part.text.trim()}
            </p>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function AskDesk({ clubId, clubName, nickname }: { clubId: string; clubName: string; nickname: string }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/agent", body: { clubId, clubName } }), [clubId, clubName]);
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const suggestions = [
    "Plan 10 fireworks nights with nothing in April",
    `Draft a pitch email to the best family-night sponsor for the ${nickname}`,
    "Which food places near the park stay open through Tuesday night games?",
  ];

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    void sendMessage({ text: question });
    setInput("");
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <section className="rise relative overflow-hidden rounded-2xl border-2 border-accent/25 bg-surface p-5 shadow-[0_18px_40px_-24px_rgb(37_99_235/0.6)] sm:p-6" style={{ animationDelay: "200ms" }}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-2 to-sun" />
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft">
          <Baseball className={`h-6 w-6 ${busy ? "animate-spin" : ""}`} />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Ask the desk</h2>
          <p className="text-xs text-muted">An agent with this page&apos;s tools. Every name and number comes from a tool call.</p>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="mt-5 space-y-4" aria-live="polite">
          {messages.map((m) => <Message key={m.id} message={m} />)}
          {status === "submitted" && (
            <div className="flex gap-3">
              <Baseball className="h-7 w-7 shrink-0 animate-spin" />
              <span className="shimmer h-9 w-48 rounded-2xl" />
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-4 rounded-xl bg-warn-soft px-4 py-2.5 text-sm text-warn">{readable(error)}</p>}

      {messages.length === 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="pop rounded-full border border-accent/30 bg-accent-soft/50 px-3.5 py-1.5 text-left text-xs font-medium text-accent transition hover:-translate-y-0.5 hover:bg-accent hover:text-accent-ink"
              style={{ animationDelay: `${300 + i * 90}ms` }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1200}
          placeholder="Ask about promotions, sponsors or food partners"
          aria-label="Question for the desk"
          className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        {busy ? (
          <button type="button" onClick={() => stop()} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">Stop</button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink shadow transition hover:brightness-110 disabled:opacity-40">
            Ask
          </button>
        )}
      </form>
    </section>
  );
}
