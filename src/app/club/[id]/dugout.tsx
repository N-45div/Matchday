"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Baseball } from "../../ui";

const noop = () => () => {};

const PLAYS: Record<string, [running: string, done: string]> = {
  find_clubs: ["Finding the club", "Found the club"],
  sponsor_board: ["Reading the sponsor board", "Read the sponsor board"],
  nearby_partners: ["Scouting food partners", "Scouted food partners"],
  plan_season: ["Re-planning the season", "Re-planned the season"],
  get_evidence: ["Checking the evidence", "Checked the evidence"],
};

/** Limits and bad requests come back as JSON ({ error }); anything else gets a plain sentence. */
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
      <p className="rise ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-sm border-2 border-ink bg-accent px-3.5 py-2.5 text-[15px] text-white">
        {message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
      </p>
    );
  }
  const plays = message.parts.filter(isToolUIPart);
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
  return (
    <div className="rise space-y-2">
      {plays.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plays.map((part) => {
            const [running, done] = PLAYS[getToolName(part)] ?? ["Working", "Done"];
            const finished = part.state === "output-available" || part.state === "output-error";
            return (
              <span key={part.toolCallId} className="pop inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-bg px-2.5 py-1 text-xs font-bold">
                <span className={`h-2 w-2 rounded-full ${finished ? "bg-grass" : "animate-pulse bg-accent"}`} />
                {finished ? done : `${running}…`}
              </span>
            );
          })}
        </div>
      )}
      {text && <p className="whitespace-pre-wrap rounded-[18px] rounded-tl-sm border-2 border-ink bg-bg px-3.5 py-3 text-[15px] leading-relaxed">{text}</p>}
    </div>
  );
}

export function Dugout({ clubId, clubName, suggestions }: { clubId: string; clubName: string; suggestions: string[] }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/agent", body: { clubId, clubName } }), [clubId, clubName]);
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const busy = status === "submitted" || status === "streaming";

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    void sendMessage({ text: question });
    setInput("");
  };
  const onSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <>
      {!open && (
        <div className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="chunk flex w-full items-center gap-3 rounded-[20px] bg-navy py-2.5 pl-4 pr-2.5 text-left text-white">
            <span className="flex-1">
              <span className="block text-[10px] font-extrabold tracking-[0.16em] text-sun">DUGOUT</span>
              <span className="block text-[15px] font-bold">Ask the desk anything</span>
            </span>
            <span className="rounded-full border-2 border-ink bg-sun px-4 py-2 text-[15px] font-extrabold text-ink">Ask</span>
          </button>
        </div>
      )}
      <aside
        aria-labelledby="ask-h"
        className={`chunk min-w-0 flex-col overflow-hidden rounded-3xl bg-surface lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-3rem)] lg:max-w-[420px] lg:flex-[1_1_340px] ${open ? "fixed inset-x-2 bottom-2 top-16 z-50 flex" : "hidden"}`}
      >
        <div className="flex items-center gap-3 bg-navy px-4 py-3.5 text-white">
          <Baseball className={`h-9 w-9 ${busy ? "animate-spin" : ""}`} />
          <div className="flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-sun">DUGOUT</p>
            <h2 id="ask-h" className="font-display text-2xl font-extrabold leading-tight">Ask the desk</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white/40 lg:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4" aria-live="polite">
          <p className="text-[13px] text-muted">An agent with the desk&apos;s five tools. Every name and number comes from a tool call.</p>
          {messages.map((m) => <Message key={m.id} message={m} />)}
          {status === "submitted" && <span className="shimmer h-10 w-2/3 rounded-[18px]" />}
          {error && <p className="rounded-xl border-2 border-ink bg-warn-soft px-3.5 py-2.5 text-sm text-warn">{readable(error)}</p>}
          {!busy && (
            <div className="flex flex-col gap-2">
              {(messages.length ? suggestions.slice(1) : suggestions).map((s, i) => (
                <button key={s} type="button" onClick={() => ask(s)} className="press chunk-sm pop min-h-11 rounded-2xl bg-surface px-3.5 py-2 text-left text-sm font-semibold" style={{ animationDelay: `${i * 80}ms` }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t-2 border-ink p-3.5">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold">
            Your question
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1200}
              placeholder="Promotions, sponsors or partners"
              className="min-h-[46px] w-full min-w-0 rounded-full border-2 border-ink bg-surface px-4 text-[15px] font-normal outline-none focus:ring-4 focus:ring-accent/25"
            />
          </label>
          {busy ? (
            <button type="button" onClick={() => stop()} className="press chunk-sm min-h-[46px] shrink-0 rounded-full bg-surface px-5 font-extrabold">Stop</button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="press chunk-sm min-h-[46px] shrink-0 rounded-full bg-sun px-5 font-extrabold disabled:opacity-50">Ask</button>
          )}
        </form>
        <p className="border-t border-dashed border-line px-4 py-2.5 text-[13px] text-muted">
          Also in Claude: add <code className="rounded bg-bg px-1 text-xs">{origin || ""}/api/mcp</code> as a custom connector.
        </p>
      </aside>
    </>
  );
}
