/**
 * The video's explainer scenes, drawn at 1920×1080 on the calm night
 * background: the hook, Trivi's three parts, how it's built, and the end
 * card. Groups build from the center: each new piece arrives and the rest
 * slide over to keep the whole thing centered.
 */

import type { CSSProperties, ReactNode } from "react";
import { Glow, type Mood } from "@/components/avatars/Glow";
import { AvatarStack } from "@/components/demo/FamilyPicker";
import { Broom, Check, Close, Crown, Sparkle, Trophy } from "@/components/demo/icons";
import { MarqueeLights, type LightsMode } from "@/components/demo/MarqueeLights";
import { StageBackdrop } from "@/components/demo/StageBackdrop";
import { FAMILIES } from "@/lib/demo-data";
import { at, centered, DURATION, easeInOut, easeOut, keyed, lerp, life, pause, pop, ramp, SCENES, stepTo, v } from "./anim";
import { Face, type Who } from "./family";

/** Words that pop in one at a time at their transcript times; "\n" breaks the line. */
function Words({ t, words, end = Infinity }: { t: number; words: [number, ReactNode][]; end?: number }) {
  return (
    <>
      {words.map(([a, w], i) =>
        w === "\n" ? (
          <br key={i} />
        ) : (
          <span key={i} className="bv-word" style={pop(t, v(a), end, { y: 30, s: 0.7, dur: 0.5 })}>
            {w}{" "}
          </span>
        ),
      )}
    </>
  );
}

function GlowBox({ mood, level, size }: { mood: Mood; level: number; size: number }) {
  return (
    <div className="bv-glow" data-sync={mood === "speaking" || undefined} style={{ "--s": `${size}px`, "--lvl": level } as CSSProperties}>
      <Glow mood={mood} color="grape" />
    </div>
  );
}

/** Absolutely placed slots from `centered()`, around the middle of their row. */
const slot = (x: number, w: number): CSSProperties => ({ left: `calc(50% + ${x - w / 2}px)`, width: w });

const TICKET = <path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3ZM14 4v12" transform="translate(0 2)" />;

/* ------------------------------------------------------------ 1. hook */

const ARG_W = 500;

export function Hook({ t }: { t: number }) {
  const end = SCENES.hook[1];
  const leave = v(5.45);
  const gone = easeInOut(ramp(t, leave, 0.45));
  const cards: { at: number; title: string; who: Who[]; icon: ReactNode }[] = [
    { at: 2.38, title: "Who's right?", who: ["dad", "mom"], icon: <span className="bv-vs">vs</span> },
    { at: 3.1, title: "Whose turn is it?", who: ["john", "sally"], icon: <Broom width={34} height={34} /> },
    {
      at: 4.14,
      title: "Who picks the movie?",
      who: ["mom", "dad", "john", "sally"],
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          {TICKET}
        </svg>
      ),
    },
  ];
  const xs = centered(t, cards.map((c) => v(c.at)), ARG_W, 44);
  const query = "how many teeth does a snail have";
  return (
    <div className="bv-scene bv-hook" style={{ opacity: 1 - ramp(t, end - 0.5, 0.5) }}>
      {gone < 1 && (
        <div className="bv-hook-a" style={{ opacity: 1 - gone, transform: `translateY(${gone * -50}px)` }}>
          <h1 className="bv-h1 bv-hook-h1">
            <Words
              t={t}
              words={[
                [-1.2, "Every"],
                [-1.05, "family"],
                [0.66, "has"],
                [0.83, "the"],
                [1.02, "same"],
                [1.2, "\n"],
                [1.26, <em key="a">three</em>],
                [1.6, <em key="b">arguments</em>],
              ]}
            />
          </h1>
          <div className="bv-row bv-args">
            {cards.map((c, i) => (
              <div key={c.title} className="bv-slot" style={slot(xs[i]!, ARG_W)}>
                <div className="bv-arg" style={pop(t, v(c.at), Infinity, { y: 60, s: 0.75, dur: 0.7 })}>
                  <div className="bv-arg-who" data-n={c.who.length}>
                    {c.who.map((w, k) => (
                      <span key={w} style={{ transform: `translateY(${Math.sin((t - v(c.at)) * 4 + k * 2 + i) * 5}px) rotate(${(k % 2 ? 1 : -1) * 6}deg)` }}>
                        <Face who={w} size={c.who.length > 2 ? 86 : 124} mood={k % 2 ? 3 : 2} />
                      </span>
                    ))}
                    <span className="bv-arg-icon">{c.icon}</span>
                  </div>
                  <p>{c.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {t >= leave + 0.4 && (
        <div className="bv-phone-wrap">
          <p className="bv-side-line bv-side-l" style={pop(t, Math.max(v(5.88), leave + 0.55), Infinity, { x: -40, y: 0 })}>
            Usually someone looks it up on a phone…
          </p>
          <div className="bv-phone" style={pop(t, leave + 0.45, Infinity, { y: 120, s: 0.85, dur: 0.8 })}>
            <div className="bv-phone-screen">
              <div className="bv-search">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <span>{keyed(t, query, v(6.2), v(7.2))}</span>
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bv-result" style={pop(t, v(7.25) + i * 0.12, Infinity, { y: 16, s: 0.95, dur: 0.45 })}>
                  <i style={{ width: `${[62, 80, 54, 70][i]}%` }} />
                  <i style={{ width: "92%" }} />
                  <i style={{ width: `${[74, 58, 86, 40][i]}%` }} />
                </div>
              ))}
            </div>
          </div>
          <p className="bv-side-line bv-side-r" style={pop(t, v(7.38), Infinity, { x: 40, y: 0 })}>
            …and nobody <em>learns a thing</em>
          </p>
          <div className="bv-bored">
            {(["mom", "dad", "john", "sally"] as Who[]).map((w, i) => (
              <span key={w} style={pop(t, v(7.6) + i * 0.1, Infinity, { y: 30, s: 0.8 })}>
                <Face who={w} size={88} mood={3} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- 4. three parts */

const PART_W = 540;

export function ThreeParts({ t, level }: { t: number; level: number }) {
  const [start, end] = SCENES.parts;
  const quoteAt = pause(3).to;
  const out = easeInOut(ramp(t, pause(3).from - 0.25, 0.55));
  const active = at(t, [[v(33.9), 0], [v(39.2), 1], [v(44.54), 2]], -1);
  const lit = (a: number) => (t >= v(a) ? "" : undefined);
  const glowMood: Mood = at(t, [[0, "idle" as Mood], [v(33.9), "speaking"], [v(39.1), "idle"]], "idle");
  const quoteMood: Mood = at(t, [[0, "thinking" as Mood], [v(47.6), "wrong"], [v(49.0), "correct"]], "thinking");
  const times = [v(33.9), v(39.2), v(44.54)];
  const xs = centered(t, times, PART_W, 40);
  return (
    <div className="bv-scene" style={{ opacity: life(t, start, end, 0.55, 0.5) }}>
      {out < 1 && (
        <div className="bv-parts-wrap" style={{ opacity: 1 - out, transform: `translateY(${out * 40}px)` }}>
          <h1 className="bv-h1 bv-parts-h1" style={pop(t, Math.max(v(32.44), start + 0.3), Infinity, { y: 30 })}>
            Trivi has <em>three parts</em>
          </h1>
          <div className="bv-row bv-parts">
            <div className="bv-slot" style={slot(xs[0]!, PART_W)}>
              <div className="bv-part" data-active={active === 0 || undefined} style={pop(t, times[0]!, Infinity, { y: 70, s: 0.85, dur: 0.7 })}>
                <div className="bv-part-art">
                  <GlowBox mood={glowMood} level={level} size={190} />
                </div>
                <h3>The host</h3>
                <p>The voice assistant asks, listens, and judges every guess</p>
                <div className="bv-tags">
                  <span data-lit={lit(35.52)}>Asks</span>
                  <span data-lit={lit(35.88)}>Listens</span>
                  <span data-lit={lit(36.61)}>Judges</span>
                  <span data-lit={lit(37.93)}>Fair for every age</span>
                </div>
              </div>
            </div>
            <div className="bv-slot" style={slot(xs[1]!, PART_W)}>
              <div className="bv-part" data-active={active === 1 || undefined} style={pop(t, times[1]!, Infinity, { y: 70, s: 0.85, dur: 0.7 })}>
                <div className="bv-part-art bv-mini-board">
                  {([["john", 6], ["sally", 6], ["mom", 5]] as [Who, number][]).map(([w, n], i) => (
                    <div key={w} className="bv-mini-row" data-lead={i === 0 || undefined} style={pop(t, times[1]! + 0.3 + i * 0.15, Infinity, { y: 16, s: 0.9 })}>
                      <span className="bv-mini-rank">{i === 0 ? <Crown width={18} height={18} /> : i + 1}</span>
                      <Face who={w} size={38} mood={i as 0 | 1 | 2} />
                      <b>{w === "john" ? "John" : w === "sally" ? "Sally" : "Mom"}</b>
                      {w === "sally" && (
                        <small>
                          <Broom width={13} height={13} /> dishes
                        </small>
                      )}
                      <strong>{n}</strong>
                    </div>
                  ))}
                </div>
                <h3>The scoreboard</h3>
                <p>Keeps every point and deal, so nothing gets made up or forgotten</p>
                <div className="bv-tags bv-tags-tech">
                  <span data-lit={lit(40.03)}>MCP server</span>
                  <span data-lit={lit(40.7)}>AWS Lambda</span>
                  <span data-lit={lit(41.24)}>DynamoDB</span>
                </div>
              </div>
            </div>
            <div className="bv-slot" style={slot(xs[2]!, PART_W)}>
              <div className="bv-part" data-active={active === 2 || undefined} style={pop(t, times[2]!, Infinity, { y: 70, s: 0.85, dur: 0.7 })}>
                <div className="bv-part-art bv-parent">
                  <div className="bv-parent-row">
                    <span>Reset points</span>
                    <b>Weekly</b>
                  </div>
                  <div className="bv-parent-row">
                    <span>Parent phrase</span>
                    <b className="bv-ok">
                      <Check width={14} height={14} strokeWidth={3} /> Set
                    </b>
                  </div>
                  <div className="bv-parent-row">
                    <span>Space Explorers</span>
                    <i className="bv-switch" data-on />
                  </div>
                  <div className="bv-parent-row">
                    <span>Dinosaur Detectives</span>
                    <i className="bv-switch" />
                  </div>
                </div>
                <h3>The parent page</h3>
                <p>Sets the rules: themes, point resets, and the parent phrase</p>
                <div className="bv-tags">
                  <span data-lit={lit(45.47)}>Sets the rules</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {t >= quoteAt - 0.1 && (
        <div className="bv-quote">
          <div style={pop(t, quoteAt, Infinity, { y: 40, s: 0.6, dur: 0.7 })}>
            <GlowBox mood={quoteMood} level={level} size={270} />
          </div>
          <h2 className="bv-h1">
            <span className="bv-qline">
              <Words t={t} words={[[46.42, "Guessing"], [46.87, "first,"]]} />
            </span>
            <span className="bv-qline bv-qsoft">
              <Words t={t} words={[[47.18, "even"], [47.38, "guessing"], [47.79, <em key="w" className="bv-wrong">wrong,</em>]]} />
            </span>
            <span className="bv-qline">
              <Words t={t} words={[[48.18, "is"], [48.3, "what"], [48.55, "makes"], [48.75, "a"], [48.95, "fact"], [49.17, <em key="s" className="bv-stick">stick</em>]]} />
            </span>
          </h2>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- 9. how it's built */

const HEADLINES: [number, ReactNode][] = [
  [95.06, <>Hey Trivi is an <em>MCP server</em> on AWS Lambda</>],
  [98.44, <>The assistant hosts and <em>calls our tools</em></>],
  [103.34, <>The server applies the rules and keeps score in <em>DynamoDB</em>,</>],
  [106.24, <>so nobody can sweet-talk Trivi into a <em>bonus point</em></>],
  [110.28, <>Parents sign in with <em>Amazon Cognito</em></>],
  [112.24, <>One sign-in links the account: <em>one URL</em>, a household per family</>],
  [117.32, <>Our simulator stands in for <em>Alexa+</em></>],
  [119.52, <><em>Amazon Nova</em> hosts, <em>Amazon Polly</em> speaks</>],
  [122.12, <>Deployed with <em>CDK</em>, hosted on <em>Amplify</em></>],
];

const TOOLS: [string, number][] = [
  ["start_round", 100.36],
  ["record_round", 101.29],
  ["spend_points", 101.88],
  ["transfer_points", 102.34],
];

type Box = { x: number; y: number; w: number; h: number };
const edge = (b: Box) => ({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.h / 2, b: b.y + b.h / 2 });

/** Where every part of the diagram sits at time `t`: it grows from the middle as parts are named. */
function layout(t: number) {
  const s = (steps: [number, number][]) => stepTo(t, steps.map(([a, x]) => [a === 0 ? 0 : v(a) - 0.25, x]), 0.8);
  const row1 = s([[0, 520], [110.28, 440]]);
  const row2 = 735;
  const mcp: Box = { x: s([[0, 960], [98.44, 1250], [103.34, 990]]), y: row1, w: 480, h: s([[0, 170], [100.2, 290]]) };
  const asst: Box = { x: s([[0, 660], [103.34, 400]]), y: row1, w: 460, h: s([[0, 170], [119.3, 280]]) };
  const db: Box = { x: 1550, y: row1, w: 400, h: 170 };
  const parent: Box = { x: 400, y: row2, w: 460, h: 150 };
  const cognito: Box = { x: 990, y: row2, w: 480, h: 150 };
  return { mcp, asst, db, parent, cognito };
}

/** A wire that draws itself on at `at`, then carries a slow flow of dashes. */
function Wire({ t, from, to, at: a, label, lx = 0, ly = -16, live }: { t: number; from: [number, number]; to: [number, number]; at: number; label?: string; lx?: number; ly?: number; live: boolean }) {
  const p = easeOut(ramp(t, a, 0.6));
  if (p <= 0) return null;
  const d = `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`;
  return (
    <g>
      <path d={d} className="bv-wire-base" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />
      {p >= 1 && <path d={d} className="bv-wire-flow" style={{ strokeDashoffset: -(t * 50) % 40, opacity: live ? 1 : 0.45 }} />}
      {label && (
        <text x={(from[0] + to[0]) / 2 + lx} y={(from[1] + to[1]) / 2 + ly} textAnchor="middle" style={{ opacity: easeOut(ramp(t, a + 0.3, 0.4)) }}>
          {label}
        </text>
      )}
    </g>
  );
}

const HOUSE_W = 380;

function Households({ t }: { t: number }) {
  // In after the diagram has faded away, out before it comes back.
  const from = v(112.24) + 0.45;
  const to = v(116.35) + 0.4;
  if (t < from || t > to) return null;
  const fams = FAMILIES.slice(0, 4);
  const times = fams.map((_, i) => v(113.98) + i * 0.4);
  const xs = centered(t, times, HOUSE_W, 40);
  return (
    <div className="bv-houses" style={{ opacity: life(t, from, to, 0.4, 0.4) }}>
      <div className="bv-url" style={pop(t, from + 0.1, Infinity, { y: -20, s: 0.8 })}>
        <span className="dm-mcp-dot" style={{ background: "#3ee0c5", boxShadow: "0 0 10px #3ee0c5" }} />
        One MCP server URL
      </div>
      <svg className="bv-house-wires" viewBox="0 0 1920 1080">
        {fams.map((f, i) => {
          const x = 960 + xs[i]!;
          const p = easeOut(ramp(t, times[i]!, 0.6));
          return p > 0 ? <path key={f.id} d={`M960 476 C 960 560, ${x} 540, ${x} 636`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} /> : null;
        })}
      </svg>
      <div className="bv-row bv-house-row">
        {fams.map((f, i) => (
          <div key={f.id} className="bv-slot" style={slot(xs[i]!, HOUSE_W)}>
            <div className="bv-house" style={pop(t, times[i]! + 0.2, Infinity, { y: 40, s: 0.8 })}>
              <AvatarStack members={f.members} size={46} />
              <strong>{f.name}</strong>
              <small>
                <Trophy width={14} height={14} /> Own scoreboard
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Architecture({ t }: { t: number }) {
  const [start, end] = SCENES.built;
  const L = layout(t);
  const E = { mcp: edge(L.mcp), asst: edge(L.asst), db: edge(L.db), parent: edge(L.parent), cognito: edge(L.cognito) };
  const away = Math.min(easeInOut(ramp(t, v(112.24) + 0.05, 0.4)), 1 - easeInOut(ramp(t, v(116.35) + 0.4, 0.45)));
  const hlIdx = HEADLINES.reduce((n, [a], i) => (t >= v(a) ? i : n), 0);
  const cur = (spans: [number, number][]) => spans.some(([a, z]) => t >= v(a) && t < v(z));
  const sim = t >= v(117.32);
  const simX = easeInOut(ramp(t, v(117.32), 0.5));

  // The bonus point: flies at the server, bounces off with a red ✕, and drops below the row.
  const bonusAt = v(106.4);
  const hit = bonusAt + 0.7;
  const fly = easeInOut(ramp(t, bonusAt, 0.7));
  const drop = ramp(t, hit, 0.65);
  const startP = [E.asst.r - 130, E.asst.t - 110];
  const hitP = [E.mcp.l - 105, L.mcp.y - 110];
  const restP = [(E.asst.r + E.mcp.l) / 2, E.mcp.b + 70];
  const bx = t < hit ? lerp(startP[0]!, hitP[0]!, fly) : lerp(hitP[0]!, restP[0]!, easeOut(drop));
  const by = t < hit ? lerp(startP[1]!, hitP[1]!, fly) - Math.sin(fly * Math.PI) * 40 : lerp(hitP[1]!, restP[1]!, drop * drop) - Math.sin(drop * Math.PI) * 50;
  const shake = t >= hit && t < hit + 0.4 ? Math.sin((t - hit) * 60) * 6 * (1 - (t - hit) / 0.4) : 0;

  const boxes: { id: keyof typeof L; at: number; current: boolean; body: ReactNode }[] = [
    {
      id: "mcp",
      at: 95.06,
      current: cur([[95.06, 98.44], [100.36, 103.34], [106.24, 110.28]]),
      body: (
        <>
          <strong>MCP server</strong>
          <small>AWS Lambda · Streamable HTTP</small>
          <div className="bv-tools">
            {TOOLS.map(([n, a]) =>
              t >= v(a) - 0.05 ? (
                <code key={n} style={pop(t, v(a), Infinity, { y: 10, s: 0.6, dur: 0.45 })}>
                  {n}
                </code>
              ) : null,
            )}
          </div>
        </>
      ),
    },
    {
      id: "asst",
      at: 98.44,
      current: cur([[98.44, 100.36], [117.32, 122.12]]),
      body: (
        <>
          <div className="bv-asst-head">
            <div className="bv-asst-glow">
              <Glow mood={t >= v(119.52) ? "speaking" : "idle"} color="grape" />
            </div>
            <div className="bv-swap">
              <span style={{ opacity: 1 - simX }}>
                <strong>Voice assistant</strong>
                <small>The host: asks, listens, judges</small>
              </span>
              {sim && (
                <span style={{ opacity: simX }}>
                  <strong>Alexa+ simulator</strong>
                  <small>Not an Amazon product</small>
                </span>
              )}
            </div>
          </div>
          <div className="bv-subs">
            {t >= v(119.52) - 0.05 && (
              <span style={pop(t, v(119.52), Infinity, { y: 10, s: 0.7, dur: 0.5 })}>
                <b>Amazon Nova 2 Lite</b> hosts
              </span>
            )}
            {t >= v(120.66) - 0.05 && (
              <span style={pop(t, v(120.66), Infinity, { y: 10, s: 0.7, dur: 0.5 })}>
                <b>Amazon Polly</b> speaks
              </span>
            )}
          </div>
        </>
      ),
    },
    {
      id: "db",
      at: 103.34,
      current: cur([[103.34, 106.24]]),
      body: (
        <>
          <strong>Amazon DynamoDB</strong>
          <small>Every point, chore and deal</small>
        </>
      ),
    },
    {
      id: "cognito",
      at: 110.28,
      current: cur([[110.28, 112.24]]),
      body: (
        <>
          <strong>Amazon Cognito</strong>
          <small>Parent sign-in and account linking</small>
        </>
      ),
    },
    {
      id: "parent",
      at: 110.6,
      current: cur([[110.6, 112.24]]),
      body: (
        <>
          <strong>Parent page</strong>
          <small>Themes, rules, the parent phrase</small>
        </>
      ),
    },
  ];

  return (
    <div className="bv-scene bv-arch" style={{ opacity: life(t, start, end, 0.55, 0.5) }}>
      <div className="bv-arch-head">
        {HEADLINES.map(([a, h], i) =>
          Math.abs(i - hlIdx) <= 1 ? (
            <h2 key={i} className="bv-h2" style={pop(t, Math.max(v(a), start + 0.3), i < HEADLINES.length - 1 ? v(HEADLINES[i + 1]![0]) : Infinity, { y: 26, s: 0.97, dur: 0.55 })}>
              {h}
            </h2>
          ) : null,
        )}
      </div>

      <div className="bv-diagram" style={{ opacity: 1 - away, filter: away > 0 ? `blur(${away * 6}px)` : undefined }}>
        <svg className="bv-wires" viewBox="0 0 1920 1080">
          <Wire t={t} at={v(98.44) + 0.45} from={[E.asst.r, L.asst.y]} to={[E.mcp.l, L.mcp.y]} label="tools/call" live={cur([[98.44, 103.34], [117.32, 122.12]])} />
          <Wire t={t} at={v(103.34) + 0.45} from={[E.mcp.r, L.mcp.y]} to={[E.db.l, L.db.y]} label="keeps score" live={cur([[103.34, 106.24]])} />
          <Wire t={t} at={v(110.6) + 0.45} from={[E.parent.r, L.parent.y]} to={[E.cognito.l, L.cognito.y]} label="sign in" live={cur([[110.28, 112.24]])} />
          <Wire t={t} at={v(110.28) + 0.75} from={[L.cognito.x, E.cognito.t]} to={[L.mcp.x, E.mcp.b]} label="token" lx={44} ly={6} live={cur([[110.28, 112.24]])} />
          {TOOLS.map(([n, a]) => {
            const p = ramp(t, v(a) - 0.45, 0.45);
            return p > 0 && p < 1 ? <circle key={n} className="bv-packet" cx={lerp(E.asst.r, E.mcp.l, easeInOut(p))} cy={L.mcp.y} r={9} /> : null;
          })}
        </svg>

        {boxes.map((b) => {
          const box = L[b.id];
          if (t < v(b.at) - 0.05) return null;
          return (
            <div key={b.id} className="bv-box-at" style={{ left: box.x - box.w / 2 + (b.id === "mcp" ? shake : 0), top: box.y - box.h / 2, width: box.w, height: box.h }}>
              <div className="bv-box" data-id={b.id} data-cur={b.current || undefined} style={pop(t, v(b.at) + (b.id === "mcp" ? 0 : 0.25), Infinity, { y: 30, s: 0.85, dur: 0.7 })}>
                {b.body}
              </div>
            </div>
          );
        })}

        {t >= bonusAt && t < v(110.28) && (
          <div className="bv-bonus" style={{ opacity: 1 - ramp(t, v(109.85), 0.4) }}>
            <span className="bv-bonus-chip" style={{ left: bx, top: by, transform: `translate(-50%, -50%) rotate(${t >= hit ? 10 * easeOut(drop) : -4 * fly}deg)`, opacity: ramp(t, bonusAt, 0.2) }}>
              +1 bonus point
              {t >= hit && (
                <i style={pop(t, hit, Infinity, { y: 0, s: 0.2, dur: 0.4 })}>
                  <Close width={18} height={18} strokeWidth={3.4} />
                </i>
              )}
            </span>
            {t >= v(108.88) && (
              <div className="bv-tried" style={{ right: 1920 - restP[0]! + 140, top: restP[1]! - 36, ...pop(t, v(108.88), Infinity, { y: 30, s: 0.6 }) }}>
                <Face who="sally" size={60} mood={3} />
                <span>Sally tried</span>
              </div>
            )}
          </div>
        )}

        <div className="bv-ship">
          {t >= v(122.89) && <span style={pop(t, v(122.89), Infinity, { y: 20, s: 0.8 })}>AWS CDK</span>}
          {t >= v(123.8) && <span style={pop(t, v(123.8), Infinity, { y: 20, s: 0.8 })}>AWS Amplify</span>}
        </div>
      </div>
      <Households t={t} />
    </div>
  );
}

/* ------------------------------------------------------------ 10. end */

export function EndCard({ t, level }: { t: number; level: number }) {
  const start = SCENES.end[0];
  const lights: LightsMode = at(t, [[0, "celebrate" as LightsMode], [v(125.8), "chase"], [v(127.6), "celebrate"]], "celebrate");
  const mood: Mood = at(t, [[0, "celebrating" as Mood], [v(124.6), "speaking"], [v(128.2), "celebrating"]], "celebrating");
  const fadeOut = ramp(t, DURATION - 0.5, 0.5);
  return (
    <div className="bv-scene bv-end" style={{ opacity: Math.min(ramp(t, start, 0.6), 1 - fadeOut) }}>
      <div className="dm-frame bv-end-frame" style={pop(t, start, Infinity, { y: 40, s: 0.88, dur: 0.8 })}>
        <MarqueeLights mode={lights} />
        <div className="dm-stage">
          <div className="dm-stage-bg">
            <span className="dm-rays" />
            <span className="dm-floor" />
            <StageBackdrop kind="quiz" />
          </div>
          <div className="bv-end-in">
            <div style={pop(t, start + 0.15, Infinity, { y: -30, s: 0.5, dur: 0.7 })}>
              <GlowBox mood={mood} level={level} size={240} />
            </div>
            <div className="dm-logo bv-end-logo" style={pop(t, Math.max(v(124.5), start + 0.25), Infinity, { y: 30, s: 0.7, dur: 0.7 })}>
              Hey<b>Trivi</b>
            </div>
            <p className="bv-end-tag">
              <span style={pop(t, v(125.2), Infinity, { y: 24, s: 0.92 })}>Where everyone learns,</span>{" "}
              <span style={pop(t, v(126.3), Infinity, { y: 24, s: 0.92 })}>
                and the winner picks <em>what's for dinner</em>
              </span>
            </p>
            <div className="bv-end-foot" style={pop(t, v(128.1), Infinity, { y: 20, s: 0.92 })}>
              <span>
                <Sparkle width={18} height={18} /> github.com/impactvelocity/heytrivi
              </span>
              <span>Built on AWS · Alexa+ Hackathon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
