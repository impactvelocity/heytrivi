/**
 * The /demo game-show stage as the video plays it: the same header, marquee
 * frame, Glow, heard pill, caption card, dock, leaderboard and settings
 * drawer markup as DemoApp, driven by the video time instead of a live game.
 * The 1600×900 page is drawn 1.2× to fill 1080p and stays fully in frame;
 * the only camera move is the reveal settling into the page.
 */

import type { CSSProperties, ReactNode } from "react";
import { Glow, type Mood } from "@/components/avatars/Glow";
import { FamilyPicker } from "@/components/demo/FamilyPicker";
import { Broom, Cards, Check, ChevronRight, Close, Crown, Mic, Palette, Send, Sliders, Sparkle, Stop, Users } from "@/components/demo/icons";
import { MarqueeLights, type LightsMode } from "@/components/demo/MarqueeLights";
import { StageBackdrop } from "@/components/demo/StageBackdrop";
import { at, centered, easeInOut, easeOut, keyed, lerp, life, pause, pop, ramp, SCENES, typed, v } from "./anim";
import { FAMILY, Face, NAME, type Who } from "./family";

/* ------------------------------------------------------------- timeline */

const MOODS: [number, Mood][] = [
  [0, "idle"],
  [v(8.88), "celebrating"],
  [v(9.9), "speaking"],
  [v(15.3), "listening"],
  [v(23.6), "thinking"],
  [v(25.05), "speaking"],
  [v(28.36), "correct"],
  [v(30.2), "speaking"],
  [v(32.3), "idle"],
  [v(52.3), "listening"],
  [v(58.55), "correct"],
  [v(59.5), "speaking"],
  [v(66.3), "idle"],
  [v(79.25), "listening"],
  [v(81.3), "speaking"],
  [v(84.75), "listening"],
  [v(85.6), "correct"],
  [v(86.9), "listening"],
  [v(89.05), "speaking"],
  [v(91.6), "listening"],
  [v(92.9), "celebrating"],
  [v(93.4), "speaking"],
  [v(95.0), "celebrating"],
];

const LIGHTS: [number, LightsMode][] = [
  [0, "chase"],
  [v(8.88), "celebrate"],
  [v(10.0), "chase"],
  [v(23.6), "fast"],
  [v(25.05), "glow"],
  [v(28.36), "celebrate"],
  [v(30.6), "chase"],
  [v(58.55), "celebrate"],
  [v(60.2), "chase"],
  [v(85.6), "celebrate"],
  [v(86.9), "chase"],
  [v(92.9), "celebrate"],
  [v(95.5), "chase"],
];

/** What the stage hears, word by word: who, the words, and when (transcript times). */
const HEARD: { who: Who; text?: ReactNode; words: string; from: number; to: number; end: number }[] = [
  { who: "dad", words: "Trivi, how many teeth does a snail have?", from: 15.46, to: 17.3, end: 17.95 },
  { who: "dad", words: "I say zero, Mom says 10, John says 100, Sally says 10,000", from: 18.02, to: 22.6, end: 23.6 },
  { who: "dad", words: "Trivi, let's settle it", from: 52.36, to: 53.3, end: 53.7 },
  { who: "dad", words: "Which came first, sharks or trees?", from: 53.76, to: 55.4, end: 56.1 },
  { who: "dad", words: "I say sharks, Sally says trees", from: 56.16, to: 57.8, end: 58.55 },
  { who: "dad", words: "Trivi, let's learn about space", from: 79.34, to: 80.7, end: 81.3 },
  { who: "sally", words: "The sun!", from: 84.88, to: 85.1, end: 85.65 },
  { who: "dad", words: "Sally's spending 5 points to pick the movie", from: 86.98, to: 88.6, end: 89.05 },
  { who: "dad", text: <span className="bv-secret">🔒 Parent phrase: •••••• ••••••••</span>, words: "", from: 91.76, to: 92.6, end: 92.95 },
];

const IDLE = "Say “Hey Trivi, let's play” to start a game";
/** The caption card: Trivi's lines, or the question on the table (transcript times). */
const CAPTIONS: [number, { label: string; text: ReactNode }][] = [
  [0, { label: "Trivi", text: "Listening…" }],
  [17.3, { label: "Dad asks", text: "How many teeth does a snail have?" }],
  [23.72, { label: "Trivi", text: "Drumroll…" }],
  [25.1, { label: "Trivi", text: <>A garden snail has about <b>14,000</b> tiny teeth</> }],
  [28.36, { label: "Trivi", text: <>Sally is closest! That's a point for Sally, and she's tied with John for the lead</> }],
  [40, { label: "Trivi", text: IDLE }],
  [53.76, { label: "Dad asks", text: "Which came first, sharks or trees?" }],
  [58.6, { label: "Trivi", text: <>Dad's right! Sharks have been around for more than <b>400 million years</b></> }],
  [62.76, { label: "Trivi", text: "That's older than the first trees" }],
  [64.56, { label: "Trivi", text: <>Sally, the dishes are yours tonight</> }],
  [70, { label: "Trivi", text: IDLE }],
  [81.38, { label: "Trivi asks", text: "I'm a star, but you'll never see me at night. What am I?" }],
  [85.68, { label: "Trivi", text: <>You got it, Sally! <b>+1</b></> }],
  [89.12, { label: "Trivi", text: "I need a parent's OK for that. What's the phrase?" }],
  [92.96, { label: "Trivi", text: <>Done! Sally picks tonight's movie</> }],
];

const ROUNDS: { items: { who: Who; text: string; at: number }[]; win: Who; result: number; drum?: number; end: number }[] = [
  {
    items: [
      { who: "dad", text: "0", at: 18.3 },
      { who: "mom", text: "10", at: 19.6 },
      { who: "john", text: "100", at: 21.05 },
      { who: "sally", text: "10,000", at: 22.4 },
    ],
    win: "sally",
    result: 28.36,
    drum: 23.72,
    end: 40,
  },
  {
    items: [
      { who: "dad", text: "Sharks", at: 56.3 },
      { who: "sally", text: "Trees", at: 57.7 },
    ],
    win: "dad",
    result: 58.6,
    end: 70,
  },
];

/** Tool calls the host makes, as the MCP pill reports them (transcript times). */
const TOOLS: { at: number; name: string; note: string; warn?: boolean }[] = [
  { at: 29.7, name: "record_round", note: "Sally +1" },
  { at: 54.0, name: "start_round", note: "stake: dishes tonight" },
  { at: 58.7, name: "record_round", note: "Sally owes the dishes" },
  { at: 80.0, name: "start_round", note: "theme: Space Explorers" },
  { at: 85.8, name: "record_round", note: "Sally +1" },
  { at: 89.3, name: "spend_points", note: "needs the parent phrase", warn: true },
  { at: 93.0, name: "spend_points", note: "Sally −5 · picks the movie" },
];

/** When a leaderboard row changes: a badge, and a glow on the row so the eye finds it. */
const FLASHES: { at: number; who: Who; text?: string }[] = [
  { at: 29.95, who: "sally", text: "+1" },
  { at: 64.56, who: "sally" },
  { at: 85.68, who: "sally", text: "+1" },
  { at: 92.96, who: "sally", text: "−5" },
];

function scores(t: number): Record<Who, number> {
  const s: Record<Who, number> = { mom: 5, dad: 3, john: 6, sally: 5 };
  if (t >= v(29.95)) s.sally += 1;
  if (t >= v(85.68)) s.sally += 1;
  if (t >= v(92.96)) s.sally -= 5;
  return s;
}

/* ---------------------------------------------------------------- parts */

function Heard({ t }: { t: number }) {
  const line = HEARD.find((h) => t >= v(h.from) - 0.05 && t < v(h.end) + 0.45);
  if (!line) return <p className="dm-status bv-status-empty" />;
  const words = line.text ?? `“${typed(t, line.words, line.from, line.to)}”`;
  return (
    <p className="dm-status dm-status-heard bv-heard" style={pop(t, v(line.from) - 0.05, v(line.end) + 0.45, { y: 10, s: 0.94, dur: 0.45 })}>
      <Face who={line.who} size={36} />
      <b>{NAME[line.who]}</b>
      {words}
    </p>
  );
}

const SLOT = 216;

function Guesses({ t }: { t: number }) {
  const round = ROUNDS.find((r) => t >= v(r.items[0]!.at) - 0.1 && t < v(r.end));
  if (!round) return <div className="bv-guesses" />;
  const decided = t >= v(round.result);
  const xs = centered(t, round.items.map((g) => v(g.at)), SLOT, 16);
  return (
    <div className="bv-guesses">
      {round.items.map((g, i) => {
        const win = decided && g.who === round.win;
        const drum = round.drum !== undefined && t >= v(round.drum) && !decided;
        const shake = drum ? Math.sin((t - v(round.drum!)) * 20 + i * 1.7) * 2.2 : 0;
        const k = win ? 1 + 0.1 * easeOut(ramp(t, v(round.result), 0.45)) : 1;
        return (
          <div key={g.who} className="bv-slot" style={{ left: `calc(50% + ${xs[i]! - SLOT / 2}px)`, width: SLOT }}>
            <div className="bv-guess" data-win={win || undefined} data-lose={(decided && !win) || undefined} style={pop(t, v(g.at), Infinity, { y: 30, s: 0.6 })}>
              <div className="bv-guess-in" style={{ transform: `rotate(${shake}deg) scale(${k})` }}>
                <Face who={g.who} size={46} />
                <span className="bv-guess-text">
                  <small>{NAME[g.who]}</small>
                  <strong>{g.text}</strong>
                </span>
                {win && (
                  <span className="bv-guess-check" style={pop(t, v(round.result) + 0.15, Infinity, { y: 0, s: 0.2, dur: 0.45 })}>
                    <Check width={18} height={18} strokeWidth={3.5} />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Board({ t }: { t: number }) {
  const s = scores(t);
  const ids = FAMILY.members.map((m) => m.id as Who);
  const ranked = [...ids].sort((a, b) => s[b] - s[a]);
  const top = Math.max(1, s[ranked[0]!]);
  const meta: Partial<Record<Who, { at: number; node: ReactNode }>> = {};
  if (t >= v(64.56) && t < v(92.96))
    meta.sally = {
      at: v(64.56),
      node: (
        <>
          <Broom width={14} height={14} /> Owes: dishes tonight
        </>
      ),
    };
  if (t >= v(92.96))
    meta.sally = {
      at: v(92.96),
      node: (
        <>
          <Sparkle width={14} height={14} /> Picks tonight's movie
        </>
      ),
    };
  const flash = FLASHES.find((f) => t >= v(f.at) && t < v(f.at) + 2.4);
  return (
    <section className="dm-board">
      <div className="dm-board-head">
        <h2>Leaderboard</h2>
        <div className="dm-seg">
          <button type="button" aria-pressed>
            This week
          </button>
          <button type="button" aria-pressed={false}>
            All time
          </button>
        </div>
      </div>
      <ol className="dm-board-list" style={{ height: 4 * 82 - 10 }}>
        {ids.map((id) => {
          const i = ranked.indexOf(id);
          const glow = flash?.who === id ? 1 - ramp(t, v(flash.at) + 0.6, 1.8) : 0;
          return (
            <li
              key={id}
              className={`dm-row${i === 0 ? " dm-row-lead" : ""}`}
              style={{
                transform: `translateY(${i * 82}px)`,
                boxShadow: glow > 0 ? `0 0 0 3px rgb(255 200 0 / ${glow}), 0 0 34px rgb(255 200 0 / ${glow * 0.55})` : undefined,
              }}
            >
              <span className="dm-rank">{i === 0 ? <Crown width={22} height={22} /> : i + 1}</span>
              <Face who={id} size={48} mood={i as 0 | 1 | 2 | 3} />
              <span className="dm-row-main">
                <span className="dm-row-name">{NAME[id]}</span>
                {meta[id] ? (
                  <span className="dm-row-meta bv-meta" style={pop(t, meta[id]!.at, Infinity, { y: 6, s: 0.9 })}>
                    {meta[id]!.node}
                  </span>
                ) : (
                  <span className="dm-meter">
                    <span style={{ width: `${(s[id] / top) * 100}%` }} />
                  </span>
                )}
              </span>
              <span className="dm-score">
                {s[id]}
                <small>pts</small>
              </span>
              {flash?.who === id && flash.text && (
                <span key={flash.at} className="dm-flash bv-flash" data-minus={flash.text.startsWith("−") || undefined}>
                  {flash.text}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The MCP message count in the header. */
function McpPill({ t }: { t: number }) {
  const done = TOOLS.filter((x) => t >= v(x.at));
  return (
    <span className="dm-mcp-pill" data-status="live">
      <span className="dm-mcp-dot" />
      MCP · {16 + done.length * 2}
    </span>
  );
}

/** The latest tool call, in the bottom-right corner under the leaderboard. */
function McpToast({ t }: { t: number }) {
  const last = TOOLS.filter((x) => t >= v(x.at)).pop();
  if (!last || t >= v(last.at) + 3.2) return null;
  return (
    <div key={last.at} className="bv-toast" data-warn={last.warn || undefined} style={pop(t, v(last.at), v(last.at) + 3.2, { y: 16, s: 0.94, dur: 0.5 })}>
      <span className="bv-toast-head">MCP tool call</span>
      <span className="bv-toast-call">
        <i>→</i> tools/call <b>{last.name}</b>
      </span>
      <span className="bv-toast-note">
        <i>←</i> {last.note}
      </span>
    </div>
  );
}

/** Family chatter before anyone asks Trivi: speech bubbles over the stage. */
function Chatter({ t }: { t: number }) {
  const lines: { who: Who; text: string; at: number; end: number; side: "l" | "r" }[] = [
    { who: "dad", text: "Sharks are older than trees", at: 49.68, end: 52.3, side: "l" },
    { who: "sally", text: "No way", at: 51.46, end: 52.3, side: "r" },
  ];
  return (
    <>
      {lines.map((l) => {
        const a = Math.max(v(l.at), SCENES.stage2[0] + 0.55);
        return t >= a - 0.1 && t < v(l.end) + 0.5 ? (
          <div key={l.text} className="bv-chat" data-side={l.side} style={pop(t, a, v(l.end) + 0.5, { y: 20, s: 0.75 })}>
            <Face who={l.who} size={56} />
            <p>
              <small>{NAME[l.who]}</small>
              {l.text}
            </p>
          </div>
        ) : null;
      })}
    </>
  );
}

const REVEAL_SLOT = 300;

/** Scene 2: the reveal, inside the frame before the page settles around it. */
function Reveal({ t }: { t: number }) {
  // Gone before the page settles around the frame.
  const end = pause(1).from - 0.05;
  if (t < v(8.7) || t > end + 0.1) return null;
  const chips: { at: number; label: ReactNode; tone: string }[] = [
    { at: 11.34, label: <>Everyone guesses</>, tone: "a" },
    { at: 12.19, label: <>Trivi judges</>, tone: "b" },
    { at: 13.87, label: <>Score kept day to day</>, tone: "c" },
  ];
  const xs = centered(t, chips.map((c) => v(c.at)), REVEAL_SLOT, 14);
  return (
    <div className="bv-reveal">
      <div className="bv-reveal-logo dm-logo" style={pop(t, v(8.88), end, { y: -20, s: 0.7 })}>
        Hey<b>Trivi</b>
      </div>
      <h2 className="bv-reveal-line" style={pop(t, v(9.45), end, { y: 24 })}>
        turns those arguments
        <br />
        into a <em>game show</em>
      </h2>
      <div className="bv-reveal-chips">
        {chips.map((c, i) => (
          <div key={c.tone} className="bv-slot" style={{ left: `calc(50% + ${xs[i]! - REVEAL_SLOT / 2}px)`, width: REVEAL_SLOT }}>
            <span className="bv-rchip" data-tone={c.tone} style={pop(t, v(c.at), end, { y: 30, s: 0.6 })}>
              {c.tone === "a" && (
                <span className="dm-stack">
                  {(["mom", "dad", "john", "sally"] as Who[]).map((w) => (
                    <span key={w} className="dm-stack-item">
                      <Face who={w} size={28} />
                    </span>
                  ))}
                </span>
              )}
              {c.tone === "b" && <span className="dm-mark dm-mark-sm" />}
              {c.tone === "c" && <Crown width={24} height={24} />}
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Scene 6: Ask Trivi in the settings drawer, as Mom uses it. */
const MOM_ASK = "The kids are into space this week. Make 6 questions and riddles for a 9 and a 12 year old. And rest the dinosaur theme";
const DRAFT = [
  { q: "Which planet is the hottest?", a: "Venus" },
  { q: "I'm a star, but you'll never see me at night. What am I?", a: "The Sun" },
  { q: "How many moons does Mars have?", a: "Two" },
];

function Drawer({ t }: { t: number }) {
  const open = t >= pause(5).from + 0.1 && t < pause(6).from + 0.05;
  const sent = t >= v(72.84);
  const checking = t >= v(74.54);
  const ready = t >= v(76.6);
  const pressed = t >= v(78.4) && t < v(78.6);
  const saved = t >= v(78.6);
  const draftText = sent ? "" : keyed(t, MOM_ASK, v(66.75), v(72.4));
  const dots = ".".repeat(1 + (Math.floor(t * 2.5) % 3));
  return (
    <>
      <div className="dm-scrim" data-open={open} />
      <aside className="dm-drawer" data-open={open}>
        <header className="dm-drawer-head">
          <div>
            <span className="dm-eyebrow">Jones Family</span>
            <h2>Settings</h2>
          </div>
          <span className="dm-close">
            <Close />
          </span>
        </header>
        <div className="dm-tabs">
          {[
            { id: "players", label: "Players", Icon: Users },
            { id: "questions", label: "Questions", Icon: Cards },
            { id: "themes", label: "Look", Icon: Palette },
            { id: "ask", label: "Ask Trivi", Icon: Sparkle },
          ].map(({ id, label, Icon }) => (
            <span key={id} role="tab" aria-selected={id === "ask"} className="dm-tab">
              <Icon width={17} height={17} />
              {label}
            </span>
          ))}
        </div>
        <div className="dm-drawer-body bv-drawer-body">
          <div className="dm-chat">
            <div className="dm-msg">
              <span className="dm-mark dm-mark-sm" />
              <div className="dm-bubble">
                <p>Hi! I can write themes, add players, or change the house rules. What should we set up?</p>
              </div>
            </div>
            {sent && (
              <div className="dm-msg dm-msg-me" style={pop(t, v(72.84), Infinity, { y: 20, s: 0.92, dur: 0.5 })}>
                <p>{MOM_ASK}</p>
              </div>
            )}
            {t >= v(73.2) && (
              <div className="dm-msg" style={pop(t, v(73.2), Infinity, { y: 20, s: 0.92, dur: 0.5 })}>
                <span className="dm-mark dm-mark-sm" />
                <div className="dm-bubble">
                  {!checking && <p className="dm-thinking">Writing the questions{dots}</p>}
                  {checking && (
                    <>
                      <p>{ready ? "Here's a draft. I answered each one without peeking and checked the facts" : `Double-checking the answers${dots}`}</p>
                      <div className="dm-draft" style={pop(t, v(74.54), Infinity, { y: 16, s: 0.95 })}>
                        <div className="dm-draft-head">
                          <strong>Space Explorers</strong>
                          <span>6 questions</span>
                        </div>
                        <ol>
                          {DRAFT.map((d, i) => (
                            <li key={d.q}>
                              {d.q} <em>{d.a}</em>
                              <span className="bv-tick" data-ok={t >= v(75.0 + i * 0.6) || undefined}>
                                <Check width={13} height={13} strokeWidth={3.5} />
                              </span>
                            </li>
                          ))}
                        </ol>
                        <span className="dm-draft-more">and 3 more · all checked</span>
                        <div className="dm-draft-actions" style={{ opacity: ready ? 1 : 0.35 }}>
                          <span className="dm-btn dm-btn-primary dm-btn-sm" style={{ transform: pressed ? "translateY(4px)" : undefined, boxShadow: pressed ? "none" : undefined }}>
                            {saved ? (
                              <>
                                <Check width={14} height={14} /> Saved
                              </>
                            ) : (
                              "Save theme"
                            )}
                          </span>
                          <span className="dm-btn dm-btn-ghost dm-btn-sm">Make it easier</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {saved && (
              <div className="dm-msg" style={pop(t, v(78.75), Infinity, { y: 16, s: 0.92, dur: 0.5 })}>
                <span className="dm-mark dm-mark-sm" />
                <div className="dm-bubble">
                  <p>
                    Saved Space Explorers. <b>Dinosaur Detectives</b> is paused
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="dm-composer">
          <div className="dm-input bv-composer" data-empty={!draftText || undefined}>
            {draftText || "Ask Trivi to set something up…"}
            {!sent && draftText && <i className="bv-caret" style={{ opacity: Math.floor(t * 2.5) % 2 ? 0 : 1 }} />}
          </div>
          <span className="dm-send dm-send-solid" style={{ transform: t >= v(72.6) && t < v(72.84) ? "scale(0.9)" : undefined }}>
            <Send />
          </span>
        </div>
      </aside>
    </>
  );
}

/** Scene 6's left side, over the dimmed stage: who's asking, then the narration building. */
function DrawerNarration({ t }: { t: number }) {
  const start = pause(5).from + 0.35;
  // Gone before the drawer slides away, so it never sits over the stage.
  const end = pause(6).from - 0.05;
  if (t < start || t > end) return null;
  const lines: [number, ReactNode][] = [
    [72.84, <>Parents pick what the kids learn about</>],
    [74.54, <>Trivi writes the questions and <em>double-checks</em> the answers,</>],
    [76.92, <>and nothing gets asked until Mom or Dad <em>approves it</em></>],
  ];
  return (
    <div className="bv-narr">
      {t < v(72.84) && (
        <div className="bv-asker" style={pop(t, start, v(72.7), { y: 24, s: 0.9 })}>
          <Face who="mom" size={120} />
          <p>
            <small>Settings · Ask Trivi</small>
            Mom asks Trivi for a space theme
          </p>
        </div>
      )}
      {t >= v(72.7) && (
        <div className="bv-narr-lines">
          {lines.map(([a, text], i) => (
            <p key={i} style={pop(t, v(a), end, { y: 24, s: 0.96 })}>
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- stage */

/** The frame's center on the page, and the zoom that fits it to the screen for the reveal. */
const FRAME = { x: 564, y: 471, s: 1.1 };

export function StageScene({ t, level }: { t: number; level: number }) {
  const mood = at(t, MOODS, "idle");
  const lights = at(t, LIGHTS, "chase");
  const capIdx = CAPTIONS.reduce((n, [a], i) => (t >= v(a) ? i : n), 0);
  const caption = CAPTIONS[capIdx]![1];

  // The reveal shows the frame alone, centered; then the page settles in around it, once.
  const settleAt = pause(1).from - 0.1;
  const settle = easeInOut(ramp(t, settleAt, 1.2));
  const inReveal = t < settleAt + 0.85;
  // Room under Glow for the heard pill and guesses opens as the page settles, so Glow glides up.
  const room = easeInOut(ramp(t, settleAt, 0.8));
  const frameIn = easeOut(ramp(t, SCENES.stage1[0], 0.8));
  const k = lerp(FRAME.s, 1, settle) * (t < settleAt ? lerp(0.94, 1, frameIn) : 1);
  const cx = lerp(FRAME.x, 800, settle);
  const cy = lerp(FRAME.y, 450, settle);
  const chrome = easeOut(ramp(t, settleAt + 0.35, 0.75));
  const ui = easeOut(ramp(t, settleAt + 0.5, 0.6));

  const vis = Math.max(life(t, SCENES.stage1[0], SCENES.stage1[1], 0.4, 0.5), life(t, SCENES.stage2[0], SCENES.stage2[1], 0.5, 0.5));
  const listening = mood === "listening";
  const pack = t >= v(79.9) ? { name: "Space Explorers", color: "#8b6bff" } : null;

  const camera: CSSProperties = {
    transform: `translate(960px, 540px) scale(${1.2 * k}) translate(${-cx}px, ${-cy}px)`,
    opacity: vis,
    visibility: vis <= 0 ? "hidden" : undefined,
  };

  return (
    <div className="bv-cam" style={camera}>
      <div className="dm-page">
        <header className="dm-header bv-header" style={{ opacity: chrome, transform: `translateY(${(1 - chrome) * -20}px)` }}>
          <div className="dm-header-stage">
            <div className="dm-logo">
              <span>
                Hey<b>Trivi</b>
              </span>
            </div>
            <p className="dm-event">Alexa+ Hackathon Demo</p>
          </div>
          <div className="dm-header-end">
            <p className="dm-disclaimer">Alexa+ simulator · Not an Amazon product</p>
            <McpPill t={t} />
          </div>
        </header>

        <main className="dm-main">
          <section className="dm-frame">
            <MarqueeLights mode={lights} />
            <div className="dm-stage">
              <div className="dm-stage-bg">
                <span className="dm-rays" />
                <span className="dm-floor" />
                <StageBackdrop kind="quiz" />
              </div>

              <div className="dm-stage-top" style={{ opacity: ui }}>
                <div className="dm-chips">
                  {pack && (
                    <span className="dm-chip" style={pop(t, v(79.9), Infinity, { y: -10 })}>
                      <span className="dm-chip-dot" style={{ background: pack.color, color: pack.color }} />
                      {pack.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="dm-stage-center">
                <div className="dm-glow bv-glow" data-sync={mood === "speaking" || undefined} style={{ "--lvl": level } as CSSProperties}>
                  <Glow mood={mood} color="grape" />
                </div>
                {!inReveal ? (
                  <>
                    <Heard t={t} />
                    <Guesses t={t} />
                  </>
                ) : (
                  <>
                    <p className="dm-status bv-status-empty" style={{ minHeight: 54 * room, height: 54 * room }} />
                    <div className="bv-guesses" style={{ height: 84 * room }} />
                  </>
                )}
              </div>

              <div className="dm-caption" style={{ opacity: ui, transform: `translateY(${(1 - ui) * 30}px)` }}>
                <span className="dm-caption-label">
                  <span className="dm-mark dm-mark-xs" />
                  {caption.label}
                </span>
                <p key={capIdx} className="dm-caption-text">
                  <span>{caption.text}</span>
                </p>
              </div>

              <div className="dm-dock" style={{ opacity: ui }}>
                <span className="dm-mic" data-active={listening}>
                  {listening ? <Stop width={24} height={24} /> : <Mic width={26} height={26} />}
                </span>
                <span className="dm-type">
                  <input readOnly placeholder="Or type what the family says…" />
                  <span className="dm-send">
                    <Send />
                  </span>
                </span>
              </div>

              <Reveal t={t} />
              <Chatter t={t} />
            </div>
          </section>

          <aside className="dm-side" style={{ opacity: chrome, transform: `translateX(${(1 - chrome) * 40}px)` }}>
            <FamilyPicker families={[FAMILY]} current={FAMILY} onPick={() => {}} />
            <Board t={t} />
            <span className="dm-card dm-settings" data-on={t >= pause(5).from - 0.2 && t < pause(6).from + 0.2 ? "" : undefined}>
              <span className="dm-settings-icon">
                <Sliders width={18} height={18} />
              </span>
              <span className="dm-settings-text">
                <strong>Settings</strong>
              </span>
              <ChevronRight className="dm-settings-chev" />
            </span>
          </aside>
        </main>
      </div>
      <McpToast t={t} />
      <DrawerNarration t={t} />
      <Drawer t={t} />
    </div>
  );
}
