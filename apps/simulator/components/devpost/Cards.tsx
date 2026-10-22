"use client";

/**
 * The images for the hackathon write-up (/devpost?card=hero), drawn at
 * 1920×1280 (3:2) in the demo video's Duo / Showtime look. Every card shares
 * one frame: the logo top left, the hackathon line top right, a short
 * headline, and one picture of the feature happening to the demo family.
 * The hero reuses the video's stage at the moment Sally wins the snail round.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Glow, type Mood } from "@/components/avatars/Glow";
import { v } from "@/components/brag/anim";
import { Face, NAME, type Who } from "@/components/brag/family";
import { StageScene } from "@/components/brag/StageScene";
import { Check, Crown, Sparkle, Trophy } from "@/components/demo/icons";
import { StageBackdrop } from "@/components/demo/StageBackdrop";

declare global {
  interface Window {
    __ready?: boolean;
  }
}

export const CARDS = ["hero", "round", "bet", "themes", "spend", "built", "tools", "stats"] as const;
type Card = (typeof CARDS)[number];

export function DevpostCards() {
  const [card, setCard] = useState<Card | null>(null);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("card") as Card | null;
    setCard(want && CARDS.includes(want) ? want : "hero");
    void document.fonts.ready.then(() => {
      window.__ready = true;
    });
  }, []);
  if (!card) return null;
  const Body = { hero: Hero, round: Round, bet: Bet, themes: Themes, spend: Spend, built: Built, tools: Tools, stats: Stats }[card];
  return <Body />;
}

/* ---------------------------------------------------------------- frame */

function Frame({ title, children, quiet }: { title: ReactNode; children: ReactNode; quiet?: boolean }) {
  return (
    <div className="dm bv dp" data-skin="duo" data-theme="showtime">
      <div className="bv-bg">
        <span className="dm-rays bv-bg-rays" />
        {!quiet && (
          <span className="bv-bg-quiz dp-quiz">
            <StageBackdrop kind="quiz" />
          </span>
        )}
      </div>
      <header className="dp-top">
        <div className="dm-logo dp-logo">
          <span>
            Hey<b>Trivi</b>
          </span>
        </div>
        <span className="dp-made">
          <Trophy width={20} height={20} />
          Built for Alexa+ Hackathon
        </span>
      </header>
      <div className="dp-head">
        <h1 className="bv-h1 dp-h1">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function GlowBox({ mood, size }: { mood: Mood; size: number }) {
  return (
    <div className="bv-glow" style={{ "--s": `${size}px` } as CSSProperties}>
      <Glow mood={mood} color="grape" />
    </div>
  );
}

/** A panel in a three-step row, like the video's "three parts" cards. */
function Step({ title, art, tone }: { title: string; art: ReactNode; tone?: string }) {
  return (
    <div className="bv-part dp-step">
      <div className="bv-part-art dp-step-art" data-tone={tone}>
        {art}
      </div>
      <h3>{title}</h3>
    </div>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <div className="dp-steps">{children}</div>;
}

/** A white speech bubble with the speaker's face, as the video's family chatter. */
function Said({ who, children, side = "l", size = 64 }: { who: Who; children: ReactNode; side?: "l" | "r"; size?: number }) {
  return (
    <div className="bv-chat dp-said" data-side={side}>
      <Face who={who} size={size} />
      <p>
        <small>{NAME[who]}</small>
        {children}
      </p>
    </div>
  );
}

function Guess({ who, text, win }: { who: Who; text: string; win?: boolean }) {
  return (
    <div className="bv-guess dp-guess" data-win={win || undefined}>
      <div className="bv-guess-in">
        <Face who={who} size={58} />
        <span className="bv-guess-text">
          <small>{NAME[who]}</small>
          <strong>{text}</strong>
        </span>
        {win && (
          <span className="bv-guess-check">
            <Check width={20} height={20} strokeWidth={3.5} />
          </span>
        )}
      </div>
    </div>
  );
}

/** Trivi's line, in the stage's caption card style. */
function TriviSays({ children, label = "Trivi" }: { children: ReactNode; label?: string }) {
  return (
    <div className="dp-trivi">
      <span className="dp-trivi-label">
        <span className="dm-mark dm-mark-xs" />
        {label}
      </span>
      <p>{children}</p>
    </div>
  );
}

function Row({ who, rank, pts, note, flash }: { who: Who; rank: number; pts: number; note?: ReactNode; flash?: string }) {
  return (
    <div className="bv-mini-row dp-row" data-lead={rank === 1 || undefined} data-lit>
      <span className="bv-mini-rank">{rank === 1 ? <Crown width={20} height={20} /> : rank}</span>
      <Face who={who} size={48} mood={0} />
      <span className="dp-row-main">
        <b>{NAME[who]}</b>
        {note && <small>{note}</small>}
      </span>
      <strong>{pts}</strong>
      {flash && <span className="dp-row-flash">{flash}</span>}
    </div>
  );
}

const Speaker = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

/* ----------------------------------------------------------------- hero */

const USPS: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <Speaker />, title: "Alexa+ Hosts", body: "Everyone guesses, Trivi judges" },
  { icon: <Crown width={32} height={32} />, title: "Score That Lasts", body: "Points carry over day to day" },
  { icon: <Sparkle width={32} height={32} />, title: "Learning Kids Can Win", body: "Themes parents approve" },
];

function Hero() {
  return (
    <Frame quiet title={<>The family game show that <em>keeps score</em></>}>
      <div className="dp-hero-shot">
        <div className="dp-hero-cam">
          <StageScene t={v(29.95) + 0.9} level={0} />
        </div>
      </div>
      <div className="dp-usps">
        {USPS.map((u) => (
          <div key={u.title} className="dp-usp">
            <span className="dp-usp-icon">{u.icon}</span>
            <span>
              <strong>{u.title}</strong>
              <small>{u.body}</small>
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- round */

const GUESSES: { who: Who; text: string; win?: boolean }[] = [
  { who: "dad", text: "0" },
  { who: "mom", text: "10" },
  { who: "john", text: "100" },
  { who: "sally", text: "10,000", win: true },
];

function Round() {
  return (
    <Frame title={<>Everyone guesses, <em>Trivi judges</em></>}>
      <div className="dp-round">
        <TriviSays label="Dad asks">How many teeth does a snail have?</TriviSays>
        <GlowBox mood="correct" size={300} />
        <TriviSays>
          About <b>14,000!</b> Sally wins
        </TriviSays>
      </div>
      <div className="dp-says">
        {GUESSES.map((g) => (
          <div key={g.who} className="dp-say" data-win={g.win || undefined}>
            <p>
              <small>{NAME[g.who]} says</small>
              {g.text}
              {g.win && (
                <>
                  <span className="dp-say-check">
                    <Check width={22} height={22} strokeWidth={3.5} />
                  </span>
                  <span className="dp-say-plus">+1</span>
                </>
              )}
            </p>
            <Face who={g.who} size={84} mood={g.win ? 0 : 1} />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ bet */

function Bet() {
  return (
    <Frame title={<>Settle a bet, <em>winner picks dinner</em></>}>
      <Steps>
        <Step
          title="Make the Bet"
          art={
            <div className="dp-bet-talk">
              <Said who="sally" size={58}>
                Sharks are older than trees!
              </Said>
              <Said who="dad" side="r" size={58}>
                No way.
              </Said>
              <span className="dp-stake">
                <Sparkle width={20} height={20} /> Winner picks dinner
              </span>
            </div>
          }
        />
        <Step
          title="Trivi Rules"
          art={
            <div className="dp-col">
              <GlowBox mood="correct" size={140} />
              <Guess who="sally" text="Sharks" win />
              <TriviSays>
                Sharks! Over <b>400 million</b> years old
              </TriviSays>
            </div>
          }
        />
        <Step
          title="Winner Picks Dinner"
          tone="warm"
          art={
            <div className="dp-col">
              <span className="dp-emoji">🍕</span>
              <Said who="sally" size={58}>
                Pizza night!
              </Said>
              <Row
                who="sally"
                rank={1}
                pts={7}
                flash="+1"
                note={
                  <>
                    <Sparkle width={14} height={14} /> Picks dinner
                  </>
                }
              />
            </div>
          }
        />
      </Steps>
    </Frame>
  );
}

/* --------------------------------------------------------------- themes */

const THEMES: { icon: string; name: string; who: string; tone: string; isNew?: boolean }[] = [
  { icon: "🚀", name: "Space Explorers", who: "Grades 3–5", tone: "#8b6bff", isNew: true },
  { icon: "🦕", name: "Dinosaur Week", who: "Grades K–2", tone: "#58cc02" },
  { icon: "🧮", name: "Fractions", who: "Grades 3–5", tone: "#ff9600" },
  { icon: "🌊", name: "Ocean Animals", who: "Whole family", tone: "#1cb0f6" },
  { icon: "🐝", name: "Spelling Bee", who: "Grades K–2", tone: "#ffc800" },
  { icon: "🌎", name: "World Capitals", who: "Grown-ups", tone: "#ff4b8b" },
];

const HOW: { label: string; by: string }[] = [
  { label: "Trivi Writes", by: "Claude Haiku 5.5" },
  { label: "Answers Blind", by: "Claude Haiku 5.5" },
  { label: "Fact-Checks", by: "Claude Sonnet 5.5" },
  { label: "Parent Approves", by: "Before anyone plays" },
];

function Themes() {
  return (
    <Frame title={<>Questions that match <em>what they're learning</em></>}>
      <div className="dp-ask">
        <Face who="mom" size={76} />
        <p>
          <small>Mom</small>
          Sally's class is learning about space this week.
        </p>
      </div>
      <div className="dp-themes">
        {THEMES.map((t) => (
          <div key={t.name} className="dp-theme" data-new={t.isNew || undefined} style={{ "--tone": t.tone } as CSSProperties}>
            <span className="dp-theme-icon">{t.icon}</span>
            <span className="dp-theme-text">
              <strong>{t.name}</strong>
              <small>{t.who}</small>
            </span>
            {t.isNew && <span className="dp-theme-new">New</span>}
          </div>
        ))}
      </div>
      <div className="dp-how">
        <span className="dp-how-h">How it works</span>
        <div className="dp-how-row">
          {HOW.map((h) => (
            <div key={h.label} className="dp-how-step">
              <span className="dp-tick">
                <Check width={18} height={18} strokeWidth={3.5} />
              </span>
              <span>
                <b>{h.label}</b>
                <small>{h.by}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- spend */

function Spend() {
  return (
    <Frame title={<>Points buy <em>the fun stuff</em></>}>
      <Steps>
        <Step
          title="Spend Points"
          art={
            <div className="dp-col">
              <div className="dp-ticket" data-on>
                <span className="dp-ticket-emoji">🍿</span>
                <span>
                  <b>Movie Night</b>
                  <small>5 points</small>
                </span>
                <span className="dp-ticket-check">
                  <Check width={18} height={18} strokeWidth={3.5} />
                </span>
              </div>
              <div className="dp-ticket">
                <span className="dp-ticket-emoji">🍕</span>
                <span>
                  <b>Pick Dinner</b>
                  <small>5 points</small>
                </span>
              </div>
              <Said who="sally" size={58}>
                Movie night, please!
              </Said>
            </div>
          }
        />
        <Step
          title="A Parent Says Yes"
          art={
            <div className="dp-col">
              <span className="dp-lock">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2.5" />
                  <path d="M8 11V8a4 4 0 0 1 7.6-1.7" />
                </svg>
              </span>
              <span className="dp-phrase">•••••• ••••••••</span>
              <span className="dp-ok">
                <Check width={20} height={20} strokeWidth={3.5} /> Parent OK
              </span>
            </div>
          }
        />
        <Step
          title="Movie Night!"
          tone="warm"
          art={
            <div className="dp-col">
              <div className="dp-party">
                <span className="dp-emoji">🍿</span>
                <GlowBox mood="celebrating" size={170} />
              </div>
              <Said who="sally" size={58}>
                I pick the movie!
              </Said>
            </div>
          }
        />
      </Steps>
    </Frame>
  );
}

/* -------------------------------------------------------- how it's built */

type Box = { x: number; y: number; w: number; h: number };
const ROW1 = 640;
const ROW2 = 1040;
const BOX: Record<"family" | "host" | "mcp" | "db" | "parent" | "cognito", Box> = {
  family: { x: 255, y: ROW1, w: 230, h: 240 },
  host: { x: 670, y: ROW1, w: 300, h: 240 },
  mcp: { x: 1170, y: ROW1, w: 400, h: 320 },
  db: { x: 1650, y: ROW1, w: 260, h: 170 },
  parent: { x: 670, y: ROW2, w: 300, h: 140 },
  cognito: { x: 1170, y: ROW2, w: 400, h: 140 },
};
const L = (b: Box) => b.x - b.w / 2;
const R = (b: Box) => b.x + b.w / 2;
const T = (b: Box) => b.y - b.h / 2;
const B = (b: Box) => b.y + b.h / 2;
const at = (b: Box): CSSProperties => ({ left: L(b), top: T(b), width: b.w, height: b.h });

function Wire({ d, label, x, y, anchor = "middle" }: { d: string; label: string; x: number; y: number; anchor?: "middle" | "start" }) {
  return (
    <g>
      <path d={d} className="bv-wire-base" />
      <path d={d} className="bv-wire-flow" />
      <text x={x} y={y} textAnchor={anchor}>
        {label}
      </text>
    </g>
  );
}

/** A horizontal wire between two boxes in a row, labeled above its middle. */
function Link({ from, to, y, label }: { from: Box; to: Box; y: number; label: string }) {
  return <Wire d={`M${R(from)} ${y} L${L(to)} ${y}`} label={label} x={(R(from) + L(to)) / 2} y={y - 18} />;
}

function Built() {
  return (
    <Frame quiet title={<>Alexa+ judges, <em>the server keeps score</em></>}>
      <svg className="bv-wires dp-wires" viewBox="0 0 1920 1280">
        <Link from={BOX.family} to={BOX.host} y={ROW1} label="talks" />
        <Link from={BOX.host} to={BOX.mcp} y={ROW1} label="tools/call" />
        <Link from={BOX.mcp} to={BOX.db} y={ROW1} label="keeps score" />
        <Link from={BOX.parent} to={BOX.cognito} y={ROW2} label="sign in" />
        <Wire d={`M${BOX.mcp.x} ${T(BOX.cognito)} L${BOX.mcp.x} ${B(BOX.mcp)}`} label="token" x={BOX.mcp.x + 18} y={(T(BOX.cognito) + B(BOX.mcp)) / 2 + 8} anchor="start" />
      </svg>

      <div className="bv-box-at" style={at(BOX.family)}>
        <div className="bv-box dp-box-c">
          <div className="dp-faces">
            {(["mom", "dad", "john", "sally"] as Who[]).map((w) => (
              <Face key={w} who={w} size={46} />
            ))}
          </div>
          <strong>The Family</strong>
          <small>Guesses out loud</small>
        </div>
      </div>
      <div className="bv-box-at" style={at(BOX.host)}>
        <div className="bv-box dp-box-c" data-cur>
          <GlowBox mood="speaking" size={92} />
          <strong>Alexa+</strong>
          <small>Asks, listens, judges</small>
        </div>
      </div>
      <div className="bv-box-at" style={at(BOX.mcp)}>
        <div className="bv-box" data-cur>
          <strong>MCP Server</strong>
          <small>AWS Lambda · Streamable HTTP</small>
          <div className="bv-tools">
            {["start_round", "record_round", "spend_points", "transfer_points"].map((n) => (
              <code key={n}>{n}</code>
            ))}
          </div>
          <small className="dp-more">+ 5 more tools, none call a model</small>
        </div>
      </div>
      <div className="bv-box-at" style={at(BOX.db)}>
        <div className="bv-box">
          <strong>DynamoDB</strong>
          <small>Points, chores, deals</small>
        </div>
      </div>
      <div className="bv-box-at" style={at(BOX.parent)}>
        <div className="bv-box">
          <strong>Parent Page</strong>
          <small>Themes and rules</small>
        </div>
      </div>
      <div className="bv-box-at" style={at(BOX.cognito)}>
        <div className="bv-box">
          <strong>Amazon Cognito</strong>
          <small>Sign-in and account linking</small>
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- tools */

const CALLS: { who: Who; said: string; tool: string; back: string; warn?: boolean }[] = [
  { who: "dad", said: "Sally says 10,000.", tool: "record_round", back: "Sally +1" },
  { who: "sally", said: "Winner picks dinner!", tool: "start_round", back: "stake: pick dinner" },
  { who: "sally", said: "I'll spend 5 on the movie.", tool: "spend_points", back: "needs the parent phrase", warn: true },
  { who: "john", said: "Show the scores.", tool: "show_scoreboard", back: "scoreboard app" },
];

function Tools() {
  return (
    <Frame quiet title={<>Every move is an <em>MCP tool call</em></>}>
      <div className="dp-calls-wrap">
        <div className="dp-calls">
          <div className="dp-call dp-calls-h">
            <span>The family says</span>
            <span />
            <span>Trivi calls</span>
          </div>
          {CALLS.map((c) => (
            <div key={c.tool} className="dp-call">
              <Said who={c.who} size={60}>
                {c.said}
              </Said>
              <span className="dp-arrow" />
              <div className="dp-toast" data-warn={c.warn || undefined}>
                <span>
                  <i>→</i> <b>{c.tool}</b>
                </span>
                <span>
                  <i>←</i> {c.back}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="dp-foot">
          <span>9 tools</span>
          <span>Streamable HTTP</span>
          <span>MCP 2025-11-25</span>
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- stats */

const STATS: { value: string; unit?: string; label: string }[] = [
  { value: "9", label: "MCP Tools" },
  { value: "125", unit: "ms", label: "p95 Response" },
  { value: "117", label: "Tests Passing" },
  { value: "1", label: "CDK Stack" },
];

const AWS = ["AWS Lambda", "Amazon DynamoDB", "Amazon Cognito", "Amazon Bedrock", "Amazon Nova 2 Lite", "Amazon Polly", "AWS Amplify", "AWS CDK"];

/** A rising line across the bottom of the card, drawn as a smooth curve through these points. */
const CURVE: [number, number][] = [
  [0, 1250],
  [260, 1215],
  [520, 1185],
  [760, 1130],
  [1000, 1095],
  [1240, 1020],
  [1480, 965],
  [1660, 880],
  [1920, 800],
];

function smooth(pts: [number, number][]) {
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

function Stats() {
  const line = smooth(CURVE);
  return (
    <Frame quiet title={<>Fast, tested, and <em>built on AWS</em></>}>
      <svg className="dp-chart" viewBox="0 0 1920 1280">
        <defs>
          <linearGradient id="dp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ce82ff" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ce82ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dp-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ce82ff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ff5fd2" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {[860, 980, 1100, 1220].map((y) => (
          <line key={y} x1="0" x2="1920" y1={y} y2={y} className="dp-chart-grid" />
        ))}
        <path d={`${line} L1920 1280 L0 1280 Z`} fill="url(#dp-fill)" />
        <path d={line} fill="none" stroke="url(#dp-line)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="dp-peak">
        <GlowBox mood="celebrating" size={130} />
      </div>
      <div className="dp-stats">
        {STATS.map((s) => (
          <div key={s.label} className="dp-stat">
            <strong>
              {s.value}
              {s.unit && <span>{s.unit}</span>}
            </strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>
      <div className="dp-aws">
        {AWS.map((a) => (
          <span key={a}>{a}</span>
        ))}
      </div>
    </Frame>
  );
}
