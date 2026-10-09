"use client";

import { useEffect, useRef } from "react";
import { maskText } from "@/lib/mask";

export type Turn =
  | { kind: "user"; speaker?: string; text: string }
  | { kind: "host"; text: string }
  | { kind: "tool"; name: string; isError: boolean; summary: string }
  | { kind: "note"; text: string };

/** The conversation, with any parent phrase replaced by dots (R13.6). */
export function Conversation({ turns, secrets, interim }: { turns: Turn[]; secrets: string[]; interim: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns.length, interim]);
  const m = (t: string) => maskText(t, secrets);

  return (
    <section className="panel conversation" aria-label="Conversation">
      <header className="panel-head">
        <h2>Conversation</h2>
      </header>
      <div className="panel-body">
        {turns.length === 0 && !interim && (
          <p className="muted pad">
            Tap the speaker button and say something like “Hey Trivi, let’s play for the garbage.” Or type below, or play a replay script.
          </p>
        )}
        {turns.map((t, i) => {
          if (t.kind === "user")
            return (
              <div key={i} className="bubble user">
                {t.speaker && <span className="who">{t.speaker}</span>}
                {m(t.text)}
              </div>
            );
          if (t.kind === "host")
            return (
              <div key={i} className="bubble host">
                {m(t.text)}
              </div>
            );
          if (t.kind === "tool")
            return (
              <div key={i} className={`chip ${t.isError ? "chip-error" : ""}`} title={m(t.summary)}>
                {t.isError ? "⚠︎" : "⚙︎"} {t.name}
              </div>
            );
          return (
            <div key={i} className="note">
              {t.text}
            </div>
          );
        })}
        {interim && <div className="bubble user interim">{m(interim)}</div>}
        <div ref={end} />
      </div>
    </section>
  );
}
