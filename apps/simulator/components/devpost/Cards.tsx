"use client";

/**
 * The images for the hackathon write-up (/devpost?card=hero), drawn at
 * 1920×1280 (3:2) in the demo video's Duo / Showtime look. Every card shares
 * one frame: the logo top left, the hackathon line top right, a short
 * headline, and one picture of the feature happening to the demo family.
 * The hero is the demo stage the moment Sally wins the snail round. The
 * thumbnail (?card=thumb) is the gallery tile: logo, headline and a big Glow.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Glow, type Mood } from "@/components/avatars/Glow";
import { Face, NAME, type Who } from "@/components/brag/family";
import { Check, Crown, Sparkle, Trophy } from "@/components/demo/icons";
import { MarqueeLights } from "@/components/demo/MarqueeLights";
import { StageBackdrop } from "@/components/demo/StageBackdrop";

declare global {
  interface Window {
    __ready?: boolean;
  }
}

export const CARDS = ["thumb", "hero", "round", "bet", "themes", "spend", "built", "tools", "stats"] as const;
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
  const Body = { thumb: Thumb, hero: Hero, round: Round, bet: Bet, themes: Themes, spend: Spend, built: Built, tools: Tools, stats: Stats }[card];
  return <Body />;
}

/* ---------------------------------------------------------------- frame */

/** `headTop` moves the headline down on cards whose picture sits low. */
function Frame({ title, children, quiet, headTop }: { title: ReactNode; children: ReactNode; quiet?: boolean; headTop?: number }) {
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
      <div className="dp-head" style={headTop ? { top: headTop } : undefined}>
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

/** `bare` drops the card around each step and the chevrons between them. */
function Steps({ children, bare }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className="dp-steps" data-bare={bare || undefined}>
      {children}
    </div>
  );
}

/** Badges joined by a line, showing the steps in order. A "…" step is Trivi typing. */
function Track({ steps, top, inset = 400 }: { steps: string[]; top: number; inset?: number }) {
  return (
    <div className="dp-track" style={{ top, left: inset, right: inset }}>
      {steps.map((t, i) => (
        <span key={t} className="dp-track-step" data-last={i === steps.length - 1 || undefined}>
          {t === "…" ? (
            <b className="dp-typing" aria-label="Trivi is thinking">
              <i />
              <i />
              <i />
            </b>
          ) : (
            <b>{t}</b>
          )}
        </span>
      ))}
    </div>
  );
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

/* ------------------------------------------------------------ thumbnail */

/** The gallery tile, read at a few hundred pixels wide: one headline, one Glow, one winning guess. */
function Thumb() {
  return (
    <div className="dm bv dp dp-thumb" data-skin="duo" data-theme="showtime">
      <div className="bv-bg">
        <span className="dm-rays bv-bg-rays" />
        <span className="bv-bg-quiz dp-quiz">
          <StageBackdrop kind="quiz" />
        </span>
      </div>
      <header className="dp-top">
        <div className="dm-logo dp-logo">
          <span>
            Hey<b>Trivi</b>
          </span>
        </div>
      </header>
      <div className="dp-thumb-copy">
        <h1 className="bv-h1 dp-thumb-h1">
          <span>Family trivia</span>
          <span>
            that <em>keeps score</em>
          </span>
        </h1>
      </div>
      <div className="dp-thumb-art">
        <span className="dp-thumb-halo" />
        <GlowBox mood="correct" size={780} />
        <div className="dp-thumb-guess dp-thumb-guess-a">
          <Guess who="sally" text="10,000" win />
        </div>
        <div className="dp-thumb-guess dp-thumb-guess-b">
          <Guess who="dad" text="0" />
        </div>
        <span className="dp-thumb-plus">+1</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- hero */

const USPS: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <Speaker />, title: "Alexa+ Hosts", body: "Everyone guesses, Trivi judges" },
  { icon: <Crown width={32} height={32} />, title: "Score That Lasts", body: "Points carry over day to day" },
  { icon: <Sparkle width={32} height={32} />, title: "Learning Kids Can Win", body: "Themes parents approve" },
];

const GUESSES: { who: Who; text: string; win?: boolean }[] = [
  { who: "dad", text: "0" },
  { who: "mom", text: "10" },
  { who: "john", text: "100" },
  { who: "sally", text: "10,000", win: true },
];

/** The leaderboard right after the snail round: Sally's point puts her in the lead. */
const BOARD: { who: Who; pts: number }[] = [
  { who: "sally", pts: 7 },
  { who: "john", pts: 6 },
  { who: "mom", pts: 5 },
  { who: "dad", pts: 3 },
];

function Hero() {
  const top = BOARD[0]!.pts;
  return (
    <Frame quiet title={<>Family trivia that <em>keeps score</em></>}>
      <section className="dm-frame dp-hero-frame">
        <MarqueeLights mode="celebrate" />
        <div className="dm-stage">
          <div className="dm-stage-bg">
            <span className="dm-rays" />
            <span className="dm-floor" />
            <StageBackdrop kind="quiz" />
          </div>
          <div className="dp-hero-stage">
            <GlowBox mood="celebrating" size={250} />
            <div className="dp-hero-guesses">
              {GUESSES.map((g) => (
                <Guess key={g.who} who={g.who} text={g.text} win={g.win} />
              ))}
            </div>
            <TriviSays>
              About <b>14,000</b> teeth! Sally wins
            </TriviSays>
          </div>
        </div>
      </section>
      <section className="dm-board dp-hero-board">
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
        <ol className="dm-board-list" style={{ height: BOARD.length * 82 - 10 }}>
          {BOARD.map((b, i) => (
            <li key={b.who} className={`dm-row${i === 0 ? " dm-row-lead" : ""}`} style={{ transform: `translateY(${i * 82}px)` }} data-lit={i === 0 || undefined}>
              <span className="dm-rank">{i === 0 ? <Crown width={22} height={22} /> : i + 1}</span>
              <Face who={b.who} size={48} mood={i as 0 | 1 | 2 | 3} />
              <span className="dm-row-main">
                <span className="dm-row-name">{NAME[b.who]}</span>
                <span className="dm-meter">
                  <span style={{ width: `${(b.pts / top) * 100}%` }} />
                </span>
              </span>
              <span className="dm-score">
                {b.pts}
                <small>pts</small>
              </span>
              {i === 0 && <span className="dm-flash bv-flash">+1</span>}
            </li>
          ))}
        </ol>
      </section>
      <section className="dp-hero-mcp">
        <div className="dp-hero-mcp-head">
          <span className="dp-dot" />
          <strong>MCP server</strong>
          <small>Connected</small>
        </div>
        <div className="dp-toast">
          <span>
            <i>→</i> <b>record_round</b>
          </span>
          <span>
            <i>←</i> Sally +1 · takes the lead
          </span>
        </div>
        <p>AWS Lambda · Streamable HTTP · DynamoDB</p>
      </section>
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

function Round() {
  return (
    <Frame headTop={250} title={<>Everyone guesses, <em>Trivi hands out points</em></>}>
      <div className="dp-round">
        <TriviSays label="Dad asks">How many teeth does a snail have?</TriviSays>
        <GlowBox mood="correct" size={300} />
        <TriviSays>
          About <b>14,000!</b>
          <br />
          Sally wins
        </TriviSays>
      </div>
      <div className="dp-says">
        {GUESSES.map((g) => (
          <div key={g.who} className="dp-say" data-win={g.win || undefined}>
            <span className="dp-say-name">
              {NAME[g.who]}
              {g.win && <span className="dp-say-plus">+1</span>}
            </span>
            <p>
              {g.text}
              {g.win && (
                <>
                  <span className="dp-say-check">
                    <Check width={22} height={22} strokeWidth={3.5} />
                  </span>
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
    <Frame headTop={240} title={<>Got a debate? <em>Trivi settles it</em></>}>
      <Steps bare>
        <Step
          title="Sharks or Trees?"
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
          title="Drumroll…"
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
          title="Pizza Night!"
          art={
            <div className="dp-col">
              <GlowBox mood="celebrating" size={140} />
              <Said who="sally" size={58}>
                <span className="dp-nowrap">
                  Pizza night! <span className="dp-emojis">🍕🍕🍕🍕</span>
                </span>
              </Said>
              <span className="dp-point">+1 point for Sally</span>
            </div>
          }
        />
      </Steps>
      <Track steps={["Sharks or Trees?", "…", "Pizza Night!"]} top={1010} />
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

function Themes() {
  return (
    <Frame headTop={260} title={<>Today's lesson, <em>tonight's trivia</em></>}>
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
      <Track steps={["Trivi Writes", "Answers Blind", "Fact-Checks", "Parent Approves"]} top={950} inset={360} />
    </Frame>
  );
}

/* ---------------------------------------------------------------- spend */

function Spend() {
  return (
    <Frame headTop={240} title={<>Win points, <em>cash them in</em></>}>
      <Steps bare>
        <Step
          title="Pick a Prize"
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
          title="The Magic Words"
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
              <span className="dp-note">Only a parent knows the phrase</span>
            </div>
          }
        />
        <Step
          title="Movie Night!"
          art={
            <div className="dp-col">
              <GlowBox mood="celebrating" size={150} />
              <Said who="sally" size={58}>
                <span className="dp-nowrap">
                  Movie night! <span className="dp-emojis">🍿🍿🍿🍿</span>
                </span>
              </Said>
              <span className="dp-note">5 points spent</span>
            </div>
          }
        />
      </Steps>
      <Track steps={["Pick a Prize", "The Magic Words", "Movie Night!"]} top={1010} />
    </Frame>
  );
}

/* -------------------------------------------------------- how it's built */

type Box = { x: number; y: number; w: number; h: number };
const ROW1 = 600;
const ROW2 = 990;
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
    <Frame quiet headTop={220} title={<>Alexa+ hosts, <em>the server keeps score</em></>}>
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
    <Frame quiet headTop={220} title={<>You talk, <em>Trivi calls MCP tools</em></>}>
      <div className="dp-calls-wrap">
        <div className="dp-calls">
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
  { value: "117", label: "Tests Passing" },
  { value: "1", label: "CDK Stack" },
];

const AWS = ["AWS Lambda", "Amazon DynamoDB", "Amazon Cognito", "Amazon Bedrock", "Amazon Nova 2 Lite", "Amazon Polly", "AWS Amplify", "AWS CDK"];

/** A rising curve behind the card, from the bottom left up to the top right corner. */
const LINE = "M0 1250 C 900 1210, 1480 1010, 1920 40";

function Stats() {
  return (
    <Frame quiet headTop={360} title={<>Fast, tested, <em>and built on AWS</em></>}>
      <svg className="dp-chart" viewBox="0 0 1920 1280">
        <defs>
          <linearGradient id="dp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ce82ff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#ce82ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dp-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ce82ff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ff5fd2" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {[260, 500, 740, 980, 1220].map((y) => (
          <line key={y} x1="0" x2="1920" y1={y} y2={y} className="dp-chart-grid" />
        ))}
        <path d={`${LINE} L1920 1280 L0 1280 Z`} fill="url(#dp-fill)" />
        <path d={LINE} fill="none" stroke="url(#dp-line)" strokeWidth="5" strokeLinecap="round" />
      </svg>
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
