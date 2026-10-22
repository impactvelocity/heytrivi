"use client";

/**
 * Five moments at the table, each played out line by line: the conversation
 * on one side, and on the other the MCP calls the host makes to Hey Trivi's
 * server and what comes back. Tool names and arguments match the real tools
 * in services/mcp-server/src/tools. The moments run one after another; a tab
 * jumps to one.
 */

import type { ReactNode } from "react";
import { Glow } from "@/components/avatars/Glow";
import { Avatar } from "@/components/demo/Avatar";
import { COLORS, SectionHead, member, shapeOf, useLoop } from "./shared";

type Speaker = "dad" | "mom" | "sally" | "trivi";
type Event = { who: Speaker; text: ReactNode } | { tool: string; args: string; result: string };

const SCENES: { label: string; events: Event[] }[] = [
  {
    label: "Ask Anything",
    events: [
      { who: "dad", text: "Trivi, which planet has the most moons? Mom says Jupiter, I say Saturn, Billy says Saturn, and Sally says Uranus." },
      {
        tool: "record_round",
        args: `{ question: "Which planet has the most moons?",
  correctAnswer: "Saturn",
  guesses: [
    { player: "Mom", guess: "Jupiter", verdict: "wrong" },
    { player: "Dad", guess: "Saturn", verdict: "correct" },
    { player: "Billy", guess: "Saturn", verdict: "correct" },
    { player: "Sally", guess: "Uranus", verdict: "wrong" } ] }`,
        result: "Dad +10 · Billy +10 · Billy leads the week with 125",
      },
      { who: "trivi", text: "It's Saturn! Dad and Billy are right, and Billy leads the week with 125." },
    ],
  },
  {
    label: "For the Garbage",
    events: [
      { who: "dad", text: "Trivi, ask us one for the garbage." },
      { tool: "start_round", args: `{ mode: "hosted",\n  stake: { type: "chore", label: "take out the garbage" } }`, result: "roundId r_81 · a history question for everyone" },
      { who: "trivi", text: "For the garbage: which came first, the pyramids in Egypt or the last woolly mammoths?" },
      { who: "dad", text: "Mom and Billy say pyramids. Sally and I say mammoths." },
      {
        tool: "record_round",
        args: `{ roundId: "r_81",\n  guesses: [ …4 guesses ] }`,
        result: "tiebreak_needed · Dad and Sally both lost",
      },
      { who: "trivi", text: "Pyramids! Mom and Billy are safe. Dad and Sally, one more question decides the garbage." },
    ],
  },
  {
    label: "Movie Night",
    events: [
      { who: "dad", text: "Sally's spending 50 points to pick the movie." },
      { tool: "spend_points", args: `{ player: "Sally", amount: 50,\n  reason: "pick the movie" }`, result: "Needs the parent phrase" },
      { who: "trivi", text: "I need a parent's OK for that. What's the phrase?" },
      { who: "mom", text: <i>Says the phrase, out of the kids' earshot</i> },
      {
        tool: "spend_points",
        args: `{ player: "Sally", amount: 50,\n  reason: "pick the movie",\n  parentPhrase: "•••••••••••••" }`,
        result: "Sally 142 → 92 points",
      },
      { who: "trivi", text: "Done! Sally picks tonight's movie, and she has 92 points left." },
    ],
  },
  {
    label: "The Deal",
    events: [
      { who: "dad", text: "Billy will give Sally 20 points to take out the garbage for him." },
      { who: "trivi", text: "Sally, is it a deal?" },
      { who: "sally", text: "Deal!" },
      {
        tool: "transfer_points",
        args: `{ from: "Billy", to: "Sally", amount: 20,\n  reason: "taking the garbage for me",\n  chore: "garbage" }`,
        result: "20 points and the garbage move to Sally",
      },
      { who: "trivi", text: "Deal! 20 points to Sally, and the garbage is hers tonight." },
    ],
  },
  {
    label: "Theme Week",
    events: [
      { who: "dad", text: "Trivi, give us a riddle from dinosaur week." },
      { tool: "start_round", args: `{ mode: "riddle", pack: "Dinosaur week" }`, result: "roundId r_90 · a riddle from Dinosaur week" },
      { who: "trivi", text: "I have three horns and a big frill, but I only eat plants. What am I?" },
      { who: "sally", text: "Triceratops!" },
      {
        tool: "record_round",
        args: `{ roundId: "r_90",\n  guesses: [ { player: "Sally",\n    guess: "Triceratops", verdict: "correct" } ] }`,
        result: "Sally +10",
      },
      { who: "trivi", text: "Sally got it! Triceratops means “three-horned face.”" },
    ],
  },
];

/** Each event holds for this long (ms); the last one in a scene holds longer. */
const EVENT_MS = 1700;
const LAST_MS = 3600;
const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + SCENES[i - 1]!.events.length], []);
const TIMELINE = SCENES.flatMap((s) => s.events.map((_, i) => (i === s.events.length - 1 ? LAST_MS : EVENT_MS)));

export function Playbook() {
  const { ref, step, setStep } = useLoop<HTMLDivElement>(TIMELINE.length, TIMELINE);
  const scene = STARTS.reduce((at, start, i) => (step >= start ? i : at), 0);
  const shown = SCENES[scene]!.events.slice(0, step - STARTS[scene]! + 1);

  return (
    <section className="lp-section" id="play" aria-labelledby="lp-pb-title">
      <div className="lp-wrap">
        <SectionHead
          kicker="See It Play"
          tone="green"
          title={
            <>
              What Trivi hears, <br className="lp-br" />
              and what the server does
            </>
          }
          id="lp-pb-title"
        >
          Pick a moment. The conversation is on the left. On the right are the MCP calls the host makes to Hey Trivi's server, and what
          comes back.
        </SectionHead>
        <div className="lp-pb" ref={ref}>
          <div className="lp-pb-tabs" role="tablist" aria-label="Moments">
            {SCENES.map((s, i) => (
              <button key={s.label} type="button" role="tab" aria-selected={i === scene} onClick={() => setStep(STARTS[i]!)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="lp-pb-panes" role="tabpanel" aria-live="polite">
            <div className="lp-pb-chat">
              <p className="lp-pane-head">
                <span className="lp-live-dot" aria-hidden /> At the Table
              </p>
              {shown.map((e, i) =>
                "who" in e ? (
                  <div key={`${scene}-${i}`} className="lp-line" data-who={e.who === "trivi" ? "trivi" : "dad"}>
                    <span className="lp-line-face" aria-hidden>
                      {e.who === "trivi" ? (
                        <Glow mood={i === shown.length - 1 ? "speaking" : "idle"} color="grape" />
                      ) : (
                        <Avatar look={member(e.who).look} size={34} shape={shapeOf(e.who)} color={COLORS[e.who]} />
                      )}
                    </span>
                    <div className="lp-line-body">
                      <p className="lp-bubble">{e.text}</p>
                    </div>
                  </div>
                ) : null,
              )}
            </div>
            <div className="lp-pb-log">
              <p className="lp-pane-head">
                <span className="lp-log-dot" aria-hidden /> POST /mcp · Streamable HTTP
              </p>
              {shown.filter((e) => "tool" in e).length === 0 && <p className="lp-log-idle">Listening…</p>}
              {shown.map((e, i) =>
                "tool" in e ? (
                  <div key={`${scene}-${i}`} className="lp-log-call">
                    <p className="lp-log-req">
                      <span>→</span> tools/call <b>{e.tool}</b>
                    </p>
                    <pre>{e.args}</pre>
                    <p className="lp-log-res">
                      <span>←</span> {e.result}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
