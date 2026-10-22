"use client";

/**
 * The features bento: one tile per thing Hey Trivi does, each with a small
 * looping preview of it happening to the demo family. Previews are drawn in
 * HTML and CSS (landing-sections.css, lp-pv-*) and advance with useLoop.
 */

import type { CSSProperties, ReactNode } from "react";
import { Glow, type GlowColor } from "@/components/avatars/Glow";
import { Avatar } from "@/components/demo/Avatar";
import { Broom, Check, Close, Crown, Flame, Sparkle, Trophy } from "@/components/demo/icons";
import { THEMES } from "@/lib/demo-data";
import { COLORS, SectionHead, member, shapeOf, useLoop } from "./shared";

export function Bento() {
  return (
    <section className="lp-section" id="features" aria-labelledby="lp-features-title">
      <div className="lp-wrap">
        <SectionHead title="Settle it with a quiz" id="lp-features-title">
          Every family argues about something. Hey Trivi turns the argument into a round of trivia, keeps track of who won, and remembers
          it tomorrow.
        </SectionHead>
        <div className="lp-bento">
          <Tile span={4} tone="blue" title="Everyone guesses in one breath" preview={<GuessPreview />}>
            Say the whole table's answers at once. Trivi judges each guess, explains the answer, and hands out the points.
          </Tile>
          <Tile span={2} tone="green" title="Fair for every age" preview={<AgesPreview />}>
            Kids get a grade band, so Trivi asks questions a 6-year-old can win.
          </Tile>
          <Tile span={2} tone="orange" title="Play for the chores" preview={<ChorePreview />}>
            Say “for the garbage” and the loser takes it out. A tie means another question.
          </Tile>
          <Tile span={2} tone="pink" title="Points buy real things" preview={<SpendPreview />}>
            Spend them to pick movie night or choose dinner, with a parent's OK.
          </Tile>
          <Tile span={2} tone="yellow" title="Make a deal" preview={<TradePreview />}>
            Trade points with a sibling, and a chore can go with them. Both sides say yes out loud.
          </Tile>
          <Tile span={4} tone="night" title="Theme weeks" preview={<ThemesPreview />}>
            Tell Trivi the kids are into dinosaurs. A helper writes questions and riddles, checks every fact, and a parent approves them
            before anyone plays.
          </Tile>
          <Tile span={2} tone="purple" title="A scoreboard that remembers" preview={<MemoryPreview />}>
            Scores carry over between days. Balances reset weekly or monthly; lifetime totals never go down.
          </Tile>
          <Tile span={2} tone="plain" title="A secret parent phrase" preview={<PhrasePreview />}>
            Spending needs the phrase. It's stored only as a salted hash, and five wrong tries lock spending for ten minutes.
          </Tile>
          <Tile span={2} tone="mint" title="Kid-safe by design" preview={<PrivacyPreview />}>
            Trivi knows a first name and a grade band. No birthdates, no audio, no notes about a child.
          </Tile>
          <Tile span={2} tone="plain" title="Four stage looks" preview={<LooksPreview />}>
            The stage, the lights, and Trivi change color together. Pick one in settings.
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ span, tone, title, preview, children }: { span: 2 | 4; tone: string; title: string; preview: ReactNode; children: ReactNode }) {
  return (
    <article className="lp-tile" data-span={span} data-tone={tone}>
      <div className="lp-tile-preview" aria-hidden>
        {preview}
      </div>
      <div className="lp-tile-text">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

function Face({ id, size = 34, rank }: { id: string; size?: number; rank?: number }) {
  return <Avatar look={member(id).look} size={size} shape={shapeOf(id)} color={COLORS[id]} rank={rank} of={rank === undefined ? 0 : 4} />;
}

/* ------------------------------------------------------------- previews */

const GUESSES = [
  { id: "mom", guess: "Jupiter", right: false },
  { id: "dad", guess: "Saturn", right: true },
  { id: "billy", guess: "Saturn", right: true },
  { id: "sally", guess: "Uranus", right: false },
];
const GUESS_MS = [1400, 2400, 650, 650, 650, 650, 3000] as const;

/** The question, everyone's guesses in one breath, then a verdict per player. */
function GuessPreview() {
  const { ref, step } = useLoop(GUESS_MS.length, GUESS_MS);
  return (
    <div ref={ref} className="lp-pv-guess">
      <div className="lp-pv-q">
        <span className="lp-pv-q-tag">Trivi Asks</span>
        Which planet has the most moons?
      </div>
      <div className="lp-pv-said" data-on={step >= 1 || undefined}>
        <Face id="dad" size={30} />
        <p>“Mom says Jupiter. I say Saturn. Billy says Saturn. Sally says Uranus.”</p>
      </div>
      <ul className="lp-pv-verdicts">
        {GUESSES.map((g, i) => (
          <li key={g.id} data-on={step >= i + 2 || undefined} data-right={g.right || undefined}>
            <Face id={g.id} size={28} />
            <span className="lp-pv-name">{member(g.id).name}</span>
            <span className="lp-pv-guessed">{g.guess}</span>
            <span className="lp-pv-chip">{g.right ? <>+10</> : <Close width={14} height={14} />}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The family by grade band, with the 6-year-old on top of the week. */
function AgesPreview() {
  const rows = [
    { id: "sally", band: "K–2", pts: 140 },
    { id: "mom", band: "Grown-up", pts: 130 },
    { id: "billy", band: "3–5", pts: 125 },
    { id: "dad", band: "Grown-up", pts: 100 },
  ];
  return (
    <ol className="lp-pv-ages">
      {rows.map((r, i) => (
        <li key={r.id} data-lead={i === 0 || undefined}>
          <span className="lp-pv-rank">{i === 0 ? <Crown width={16} height={16} /> : i + 1}</span>
          <Face id={r.id} size={28} rank={i} />
          <span className="lp-pv-name">{member(r.id).name}</span>
          <span className="lp-pv-band">{r.band}</span>
          <span className="lp-pv-pts">{r.pts}</span>
        </li>
      ))}
    </ol>
  );
}

const CHORE_MS = [1600, 1900, 1100, 2800] as const;
const CHORE_AT = ["mom", "billy", "dad"];

/** The garbage hops along the losers, a tiebreak, then it lands on one. */
function ChorePreview() {
  const { ref, step } = useLoop(CHORE_MS.length, CHORE_MS);
  // Before the tiebreak the chore sits between the two tied players; after it, on Dad.
  const at = step < 2 ? 1.5 : 2;
  return (
    <div ref={ref} className="lp-pv-chore" style={{ "--at": at } as CSSProperties}>
      <span className="lp-pv-stake">
        <Trophy width={14} height={14} /> For the garbage
      </span>
      <div className="lp-pv-chore-row">
        {CHORE_AT.map((id, i) => (
          <span key={id} className="lp-pv-chore-seat" data-safe={i === 0 || (step >= 2 && i === 1) || undefined}>
            <Face id={id} size={36} />
            <small>{member(id).name}</small>
          </span>
        ))}
        <span className="lp-pv-chore-tag">
          <Broom width={14} height={14} /> Garbage
        </span>
      </div>
      <span className="lp-pv-note" data-show={step === 1 || undefined}>
        Billy and Dad tied. One more question!
      </span>
      <span className="lp-pv-note lp-pv-note-done" data-show={step === 3 || undefined}>
        Dad owes the garbage tonight
      </span>
    </div>
  );
}

const SPEND_MS = [1700, 2100, 1200, 2800] as const;

/** Sally spends 50 points on movie night, once a parent says the phrase. */
function SpendPreview() {
  const { ref, step } = useLoop(SPEND_MS.length, SPEND_MS);
  return (
    <div ref={ref} className="lp-pv-spend">
      <div className="lp-pv-ticket" data-stamped={step >= 3 || undefined}>
        <span className="lp-pv-ticket-icon">
          <Sparkle width={18} height={18} />
        </span>
        <span>
          <b>Pick movie night</b>
          <small>50 points</small>
        </span>
        <span className="lp-pv-stamp">Sally Picks!</span>
      </div>
      <div className="lp-pv-spend-row">
        <Face id="sally" size={30} />
        <span className="lp-pv-name">Sally</span>
        <span className="lp-pv-balance" data-dropped={step >= 3 || undefined}>
          {step >= 3 && <s>142</s>} <b>{step >= 3 ? 92 : 142}</b> pts
        </span>
      </div>
      <div className="lp-pv-phrase" data-step={step}>
        <span className="lp-pv-dots">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
        <span className="lp-pv-phrase-state">{step >= 2 ? "Parent OK" : step === 1 ? "Parent phrase…" : "Needs a parent"}</span>
      </div>
    </div>
  );
}

const TRADE_MS = [1900, 1400, 1300, 2800] as const;

/** Billy pays Sally 20 points, and the garbage goes with them. */
function TradePreview() {
  const { ref, step } = useLoop(TRADE_MS.length, TRADE_MS);
  const moved = step >= 2;
  return (
    <div ref={ref} className="lp-pv-trade" data-moved={moved || undefined}>
      <div className="lp-pv-trade-said">
        {step === 0 && <p>“I'll give Sally 20 points to take the garbage.”</p>}
        {step === 1 && <p className="lp-pv-deal">Sally: “Deal!”</p>}
        {step >= 2 && <p className="lp-pv-deal">Deal done</p>}
      </div>
      <div className="lp-pv-trade-row">
        <span className="lp-pv-trader">
          <Face id="billy" size={38} />
          <b>{moved ? 95 : 115}</b>
          <small>Billy</small>
        </span>
        <span className="lp-pv-trade-track">
          <span className="lp-pv-coin">+20</span>
          <span className="lp-pv-coin lp-pv-coin-chore">
            <Broom width={12} height={12} />
          </span>
        </span>
        <span className="lp-pv-trader">
          <Face id="sally" size={38} />
          <b>{moved ? 112 : 92}</b>
          <small>Sally</small>
        </span>
      </div>
    </div>
  );
}

const THEME_CARDS = [
  { title: "Dinosaur week", who: "For Billy and Sally", count: "6 questions and riddles", fix: "Fixed: T. rex walked on two legs, not four" },
  { title: "Fractions for Sally", who: "For Sally, K–2", count: "5 questions", fix: "Flagged: two answers could fit, reworded" },
  { title: "Space riddles", who: "For the whole family", count: "6 riddles", fix: "All facts checked" },
];
const THEME_STAGES = ["Written by Claude Haiku 5.5", "Answered blind", "Fact-checked by Claude Sonnet 5.5", "", "A parent approved it"];
const THEME_MS = THEME_CARDS.flatMap(() => [900, 900, 900, 1300, 2400]);

/** A theme moves through the helper: written, answered blind, fact-checked, a fix, approved. */
function ThemesPreview() {
  const { ref, step } = useLoop(THEME_MS.length, THEME_MS);
  const card = Math.floor(step / THEME_STAGES.length);
  const stage = step % THEME_STAGES.length;
  const theme = THEME_CARDS[card]!;
  return (
    <div ref={ref} className="lp-pv-themes">
      <div className="lp-pv-theme-stack">
        {THEME_CARDS.map((t, i) => (
          <div key={t.title} className="lp-pv-theme-card" data-pos={(i - card + THEME_CARDS.length) % THEME_CARDS.length}>
            <span className="lp-pv-theme-icon">
              <Sparkle width={18} height={18} />
            </span>
            <b>{t.title}</b>
            <small>{t.who}</small>
            <span className="lp-pv-theme-count">{t.count}</span>
          </div>
        ))}
      </div>
      <ul className="lp-pv-pipeline">
        {THEME_STAGES.map((label, i) => (
          <li key={i} data-done={stage >= i || undefined} data-fix={i === 3 || undefined}>
            <span className="lp-pv-tick">{i === 3 ? <Sparkle width={12} height={12} /> : <Check width={12} height={12} />}</span>
            {i === 3 ? theme.fix : label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Past weeks' winners and this week's leader, with a lifetime total that only goes up. */
function MemoryPreview() {
  const { ref, step } = useLoop(2, [2600, 2600]);
  const weeks = [
    { when: "Two weeks ago", id: "mom", pts: 150 },
    { when: "Last week", id: "billy", pts: 160 },
    { when: "This week", id: "sally", pts: step ? 150 : 140, live: true },
  ];
  return (
    <div ref={ref} className="lp-pv-memory">
      <ul>
        {weeks.map((w) => (
          <li key={w.when} data-live={w.live || undefined}>
            <span className="lp-pv-when">{w.when}</span>
            <Face id={w.id} size={26} />
            <span className="lp-pv-name">{member(w.id).name}</span>
            <span className="lp-pv-pts">
              {w.live && <Flame width={13} height={13} />}
              {w.pts}
            </span>
          </li>
        ))}
      </ul>
      <p className="lp-pv-lifetime">
        Sally's lifetime <b key={step}>{step ? 990 : 980}</b>
      </p>
    </div>
  );
}

/** The phrase goes in as dots, never as words, and the lock opens. */
function PhrasePreview() {
  const { ref, step } = useLoop(2, [2600, 2200]);
  return (
    <div ref={ref} className="lp-pv-lock" data-open={step === 1 || undefined}>
      <span className="lp-pv-lock-icon">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
          <path className="lp-pv-shackle" d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </svg>
      </span>
      <span className="lp-pv-field">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={`${step}-${i}`} style={{ "--i": i } as CSSProperties} />
        ))}
      </span>
      <span className="lp-pv-lock-state">{step === 1 ? "Spending unlocked" : "Say the parent phrase"}</span>
    </div>
  );
}

/** What Trivi keeps about a kid, and what it never asks for. */
function PrivacyPreview() {
  return (
    <div className="lp-pv-privacy">
      <div className="lp-pv-profile">
        <Face id="sally" size={36} />
        <span>
          <b>Sally</b>
          <small>Kid · K–2</small>
        </span>
        <span className="lp-pv-ok">
          <Check width={14} height={14} />
        </span>
      </div>
      {["Birthday", "Voice recordings", "Notes about Sally"].map((f) => (
        <div key={f} className="lp-pv-never">
          <Close width={13} height={13} />
          <s>{f}</s>
        </div>
      ))}
    </div>
  );
}

/** Trivi's color for each stage theme, as on the demo stage. */
const LOOK_GLOW: Record<string, GlowColor> = { showtime: "grape", arcade: "ocean", sunset: "sunny", pajama: "berry" };

/** A small stage that cycles through the four looks. */
function LooksPreview() {
  const { ref, step } = useLoop(THEMES.length, 1800);
  const t = THEMES[step]!;
  return (
    <div ref={ref} className="lp-pv-looks" style={{ "--frame": t.duo.colors.frame, "--bulb": t.duo.colors.bulb } as CSSProperties}>
      <div className="lp-pv-stage">
        <span className="lp-pv-bulbs" />
        <span className="lp-pv-stage-glow">
          <Glow mood="idle" color={LOOK_GLOW[t.id]} />
        </span>
      </div>
      <div className="lp-pv-swatches">
        {THEMES.map((x, i) => (
          <span key={x.id} data-on={i === step || undefined} style={{ background: x.duo.colors.frame }} title={x.duo.name} />
        ))}
        <b>{t.duo.name}</b>
      </div>
    </div>
  );
}

