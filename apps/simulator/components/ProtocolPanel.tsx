"use client";

/**
 * Every MCP request and response, in order (R10.2). Messages are already
 * masked by the client wrapper (R13.6).
 */

import { useEffect, useRef, useState } from "react";
import type { ProtocolEntry } from "@/lib/mcp";

export type ProtocolRow = ProtocolEntry | { divider: string; seq: number };

function summary(e: ProtocolEntry): string {
  const m = e.message as { method?: string; params?: { name?: string }; result?: { isError?: boolean }; error?: { message?: string } };
  if (e.direction === "out") {
    if (m.method === "tools/call") return `tools/call ${m.params?.name ?? ""}`;
    return m.method ?? "message";
  }
  if (m.error) return `error: ${m.error.message ?? ""}`;
  if (m.result?.isError) return `${e.method ?? "result"} (tool error)`;
  return e.method ? `${e.method} result` : (m.method ?? "message");
}

export function ProtocolPanel({ rows }: { rows: ProtocolRow[] }) {
  const end = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [rows.length]);

  return (
    <section className="panel protocol" aria-label="MCP protocol log">
      <header className="panel-head">
        <h2>MCP messages</h2>
        <span className="muted">{rows.filter((r) => !("divider" in r)).length} messages</span>
      </header>
      <div className="panel-body mono">
        {rows.length === 0 && <p className="muted pad">Messages appear here as the host talks to the game server.</p>}
        {rows.map((r) =>
          "divider" in r ? (
            <div key={`d${r.seq}`} className="divider">
              {r.divider}
            </div>
          ) : (
            <div key={r.seq} className={`msg ${r.direction}`}>
              <button
                className="msg-head"
                onClick={() =>
                  setOpen((s) => {
                    const n = new Set(s);
                    if (n.has(r.seq)) n.delete(r.seq);
                    else n.add(r.seq);
                    return n;
                  })
                }
                aria-expanded={open.has(r.seq)}
              >
                <span className="arrow">{r.direction === "out" ? "→" : "←"}</span>
                <span className="msg-summary">{summary(r)}</span>
                {r.id !== undefined && <span className="muted">#{String(r.id)}</span>}
                {r.durationMs !== undefined && <span className="dur">{r.durationMs} ms</span>}
              </button>
              {open.has(r.seq) && <pre>{JSON.stringify(r.message, null, 2)}</pre>}
            </div>
          ),
        )}
        <div ref={end} />
      </div>
    </section>
  );
}
