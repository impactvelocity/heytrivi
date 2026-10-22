"use client";

/**
 * Who Hey Trivi is for (families, couples, housemates), and a week of it at
 * one family's table, to show that the score carries from day to day.
 */

import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/demo/Avatar";
import { Broom, Check, Crown, Mic, Sparkle, Users } from "@/components/demo/icons";
import { EVERYONE, SectionHead, useLoop } from "./shared";

const person = (id: string) => EVERYONE.find((m) => m.id === id)!;

const HOUSES: { tone: string; title: string; people: string[]; said: string; body: string; uses: string[] }[] = [
  {
    tone: "purple",
    title: "Families",
    people: ["mom", "dad", "billy", "sally"],
    said: "Let's play Trivi for the garbage!",
    body: "Kids and grown-ups play the same game. Grade bands keep it fair, points pay for movie night, and the parent phrase keeps spending honest.",
    uses: ["Who takes out the garbage", "Who picks the movie", "Dinosaur week"],
  },
  {
    tone: "pink",
    title: "Couples",
    people: ["chidi", "ada"],
    said: "Winner picks the restaurant.",
    body: "Settle who was right about that actor tonight, and keep a lifetime count of who's right more often.",
    uses: ["Winner picks dinner", "Loser does the dishes", "Lifetime bragging rights"],
  },
  {
    tone: "blue",
    title: "Housemates",
    people: ["priya", "raj", "papa"],
    said: "I'll give you 20 points to take my dishes night.",
    body: "A chore someone owes stays on the board until they do it, and anyone can trade points to swap a night.",
    uses: ["Play for the dishes", "Trade chore nights", "Add a housemate by voice"],
  },
];

export function WhoFor() {
  return (
    <section className="lp-section" id="who" aria-labelledby="lp-who-title">
      <div className="lp-wrap">
        <SectionHead title="Made for any house with a rivalry" id="lp-who-title">
          If the people at your table argue about who's right, Hey Trivi gives them a scoreboard and something to play for.
        </SectionHead>
        <div className="lp-houses">
          {HOUSES.map((h) => (
            <article key={h.title} className="lp-house" data-tone={h.tone}>
              <div className="lp-house-scene" aria-hidden>
                <p className="lp-house-said">“{h.said}”</p>
                <div className="lp-house-people">
                  {h.people.map((id, i) => (
                    <span key={id} style={{ animationDelay: `${i * -0.4}s` }}>
                      <Avatar look={person(id).look} size={h.people.length > 3 ? 46 : 54} shape={i} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="lp-house-text">
                <h3>{h.title}</h3>
                <p>{h.body}</p>
                <ul>
                  {h.uses.map((u) => (
                    <li key={u}>
                      <Check width={14} height={14} />
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

type Shape = "burst" | "circle" | "hex" | "square" | "triangle";

const DAYS: { day: string; tone: string; shape: Shape; icon: ReactNode; title: string; body: string; score?: string }[] = [
  { day: "Mon", tone: "purple", shape: "burst", icon: <Sparkle width={20} height={20} />, title: "Dinosaur week starts", body: "Dad approves six questions and riddles on his phone." },
  { day: "Tue", tone: "blue", shape: "circle", icon: <Mic width={20} height={20} />, title: "A dinner question", body: "“Which planet has the most moons?” Billy gets it.", score: "Billy +10" },
  { day: "Wed", tone: "orange", shape: "hex", icon: <Broom width={20} height={20} />, title: "For the garbage", body: "A tie, one more question, and Dad owes the garbage.", score: "Dad owes it" },
  { day: "Thu", tone: "green", shape: "square", icon: <Users width={20} height={20} />, title: "A deal", body: "Dad pays Sally 20 points to take out the garbage for him.", score: "Sally +20" },
  { day: "Fri", tone: "pink", shape: "triangle", icon: <Crown width={20} height={20} />, title: "Sally wins the week", body: "She spends 50 points to pick the movie. Mom says the phrase.", score: "Sally −50" },
];

/** A 12-point burst, as polygon points around the center of a 56-unit box. */
const BURST = Array.from({ length: 24 }, (_, i) => {
  const r = i % 2 ? 19.5 : 25;
  const a = (i / 24) * Math.PI * 2;
  return `${(28 + r * Math.sin(a)).toFixed(1)},${(28 - r * Math.cos(a)).toFixed(1)}`;
}).join(" ");

function ShapeBody({ shape }: { shape: Shape }) {
  if (shape === "circle") return <circle cx="28" cy="28" r="22" />;
  if (shape === "square") return <rect x="7" y="7" width="42" height="42" rx="12" />;
  if (shape === "hex") return <polygon points="28,5 48,16.5 48,39.5 28,51 8,39.5 8,16.5" />;
  if (shape === "triangle") return <polygon points="28,6 51,47 5,47" />;
  return <polygon points={BURST} />;
}

/** Each day's badge: its shape in the day's color, on a darker ledge like the app's buttons. */
function DayBadge({ shape, icon }: { shape: Shape; icon: ReactNode }) {
  return (
    <span className="lp-day-badge" data-shape={shape}>
      <svg viewBox="0 0 56 56" aria-hidden>
        <g className="lp-day-ledge" transform="translate(0 4)">
          <ShapeBody shape={shape} />
        </g>
        <g className="lp-day-body">
          <ShapeBody shape={shape} />
        </g>
      </svg>
      <span className="lp-day-glyph">{icon}</span>
    </span>
  );
}

export function Week() {
  const { ref, step } = useLoop<HTMLOListElement>(DAYS.length, 2400);
  return (
    <section className="lp-section lp-week-section" id="week" aria-labelledby="lp-week-title">
      <div className="lp-wrap">
        <SectionHead title="A week with Trivi" id="lp-week-title">
          The server remembers between conversations, so a point won on Tuesday still counts on Friday.
        </SectionHead>
        <ol ref={ref} className="lp-week" style={{ "--day": step, "--days": DAYS.length } as CSSProperties}>
          {DAYS.map((d, i) => (
            <li key={d.day} className="lp-day" data-tone={d.tone} data-now={i === step || undefined} data-past={i < step || undefined}>
              <span className="lp-day-name">{d.day}</span>
              <DayBadge shape={d.shape} icon={d.icon} />
              <b>{d.title}</b>
              <p>{d.body}</p>
              {d.score && <span className="lp-day-score">{d.score}</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
