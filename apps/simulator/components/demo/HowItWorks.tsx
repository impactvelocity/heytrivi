"use client";

/**
 * How this demo works, as a drawer from the left: how to play a round, what
 * the public page fakes, and the real loop behind it (speech, the host model,
 * the MCP server, Polly). The public page plays the script so its link can't
 * run up model and voice bills, so judges who want the real thing are told to
 * ask on Devpost, and get a code for UnlockDialog.
 */

import { useEffect, useRef } from "react";
import { Close, Play } from "./icons";

/** Each part of the game: what it is on the scripted page, and what it is live. */
const PARTS = [
  { part: "Hearing", here: "A canned answer, or whatever you type", live: "Speech recognition in Chrome (Alexa, on a device)" },
  { part: "The host", here: "Canned replies", live: "Amazon Nova 2 Lite, calling MCP tools" },
  { part: "Questions and points", here: "Three scripted rounds", live: "The MCP server's start_round and record_round" },
  { part: "Trivi's voice", here: "Captions only", live: "Amazon Polly" },
  { part: "The family", here: "Made-up families, kept in this tab", live: "A parent's family, saved in DynamoDB" },
];

/** One live turn, start to finish. */
const LOOP = [
  { title: "The family talks.", body: "Speech recognition in Chrome turns it into text. On Alexa+, Alexa does this part." },
  {
    title: "The host picks a tool.",
    body: "Amazon Nova 2 Lite reads what was said and calls a tool on the Hey Trivi MCP server, over Streamable HTTP. On Alexa+, Alexa+ is the host.",
  },
  {
    title: "The server runs the game.",
    body: "It judges every guess, awards points, and settles whatever was at stake. It runs on AWS Lambda and saves to DynamoDB, so the score carries over to tomorrow.",
  },
  { title: "Trivi answers.", body: "The host turns the tool result into a line and Amazon Polly says it. The leaderboard redraws from the same result." },
];

/** The MCP tools, each with something a family says that calls it. */
const TOOLS = [
  ["get_household", "Let's play Hey Trivi"],
  ["start_round", "Ask us one, for the garbage"],
  ["record_round", "Mom says Saturn, Dad says Mars"],
  ["show_scoreboard", "Show the scores"],
  ["add_player", "Add Grandma to the game"],
  ["complete_chore", "John took out the garbage"],
  ["spend_points", "Sally spends 3 points to pick the movie"],
  ["transfer_points", "I'll give Sally 3 points to take the garbage"],
  ["list_packs", "What themes do we have?"],
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  /** The mic plays the real loop (useLiveGame), not the script. */
  live: boolean;
  /** Does what the mic does: plays a scripted round, or listens when live. */
  onStart: () => void;
  canStart: boolean;
  /** Opens the code prompt (UnlockDialog). Only when the site has a demo lock a code can open. */
  onUnlock?: () => void;
}

export function HowItWorks({ open, onClose, live, onStart, canStart, onUnlock }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className="dm-scrim" data-open={open} onClick={onClose} aria-hidden />
      <aside id="dm-guide" className="dm-drawer dm-guide" data-open={open} role="dialog" aria-modal="true" aria-labelledby="dm-guide-title" inert={!open}>
        <header className="dm-drawer-head">
          <div>
            <span className="dm-eyebrow">Alexa+ Hackathon Demo</span>
            <h2 id="dm-guide-title">How this demo works</h2>
          </div>
          <button ref={closeRef} type="button" className="dm-close" onClick={onClose} aria-label="Close how this demo works">
            <Close />
          </button>
        </header>

        <div className="dm-drawer-body">
          <p className="dm-notice" data-kind={live ? "live" : "script"}>
            {live
              ? "Live play is on in this browser. The mic talks to the real MCP server, host model, and voice."
              : "This is the scripted demo. Rounds play from a script in your browser, so nothing here calls the model, the voice, or the game server."}
          </p>

          <section className="dm-dsec">
            <h3>Play a round</h3>
            <ol className="dm-guide-steps">
              {live ? (
                <>
                  <li>
                    <b>Tap the mic and say “Hey Trivi, let’s play.”</b> Trivi looks up the family and asks the first question.
                  </li>
                  <li>
                    <b>Everyone answers out loud,</b> like “Mom says Saturn, Dad says Mars.” Trivi judges each guess and the points land.
                  </li>
                  <li>
                    <b>Open the MCP button</b> at the top right to see every message between this page and the server.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <b>Tap the mic.</b> Someone in the family answers, Trivi checks the answer, and the points land on the leaderboard.
                  </li>
                  <li>
                    <b>Press Next question</b> at the top of the stage to skip ahead, or type any answer in the box and the round plays with yours.
                  </li>
                  <li>
                    <b>Pick another family,</b> or open <b>Settings</b> to add players, change the stage look, and try Ask Trivi.
                  </li>
                </>
              )}
            </ol>
            <div className="dm-guide-start">
              <button type="button" className="dm-btn dm-btn-primary" onClick={onStart} disabled={!canStart}>
                <Play width={16} height={16} />
                {live ? "Start talking" : "Start a round"}
              </button>
              <span className="dm-help">Keys 1 to 8 show each of Trivi’s moods.</span>
            </div>
          </section>

          {!live && (
            <section className="dm-dsec">
              <h3>What’s scripted here</h3>
              <div className="dm-guide-parts" role="table" aria-label="The scripted page and the live game">
                <div className="dm-guide-part dm-guide-part-head" role="row">
                  <span role="columnheader">On this page</span>
                  <span role="columnheader">In the live game</span>
                </div>
                {PARTS.map((p) => (
                  <div key={p.part} className="dm-guide-part" role="row">
                    <b role="rowheader">{p.part}</b>
                    <span role="cell">{p.here}</span>
                    <span role="cell">{p.live}</span>
                  </div>
                ))}
              </div>
              <p className="dm-help">
                Why: every live turn costs model, voice, and server time, and an open link would be a free AI model for anyone. So this public page plays the
                script, and live play stays behind a code.
              </p>
            </section>
          )}

          {!live && (
            <section className="dm-guide-ask">
              <h3>Judges: see it live</h3>
              <p>Message us on Devpost and we’ll turn on live play for you, with the real MCP server, model, and voice.</p>
              {onUnlock && (
                <p>
                  Have a code?{" "}
                  <button type="button" className="dm-guide-link" onClick={onUnlock}>
                    Unlock live play
                  </button>
                </p>
              )}
            </section>
          )}

          <section className="dm-dsec">
            <h3>How it really works</h3>
            <ol className="dm-guide-loop">
              {LOOP.map((s) => (
                <li key={s.title}>
                  <b>{s.title}</b> {s.body}
                </li>
              ))}
            </ol>
          </section>

          <section className="dm-dsec">
            <h3>The MCP tools</h3>
            <p className="dm-help">Nine tools run the whole game. Here’s something a family might say for each.</p>
            <ul className="dm-guide-tools">
              {TOOLS.map(([name, said]) => (
                <li key={name}>
                  <code>{name}</code>
                  <span>“{said}”</span>
                </li>
              ))}
            </ul>
            <p className="dm-help">
              On Alexa+, Alexa+ links a parent’s account through Amazon Cognito and calls this same server. Hackathon entrants can’t reach Alexa+, so
              this page stands in for the device.
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
