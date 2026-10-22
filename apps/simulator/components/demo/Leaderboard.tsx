"use client";

/**
 * The family leaderboard. Rows stay in the same DOM order and are placed by
 * rank, so when points land a row slides past the others instead of jumping.
 */

import { useState } from "react";
import type { DemoFamily } from "@/lib/demo-data";
import { Avatar, familyColors } from "./Avatar";
import { Crown } from "./icons";

/** Row height plus the gap between rows; matches .dm-row in demo.css. */
const ROW = 82;

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export function Leaderboard({ family, bonus, flash }: { family: DemoFamily; bonus: Record<string, number>; flash: { id: string; points: number } | null }) {
  const [range, setRange] = useState<"week" | "all">("week");

  const colors = familyColors(family.members);
  const scored = family.members.map((m) => ({ m, score: (range === "week" ? m.week : m.allTime) + (bonus[m.id] ?? 0) }));
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const rank = new Map(ranked.map((r, i) => [r.m.id, i]));
  const top = Math.max(1, ranked[0]?.score ?? 1);

  return (
    <section className="dm-board" aria-labelledby="dm-board-title">
      <div className="dm-board-head">
        <h2 id="dm-board-title">Leaderboard</h2>
        <div className="dm-seg" role="group" aria-label="Time range">
          <button type="button" aria-pressed={range === "week"} onClick={() => setRange("week")}>
            This week
          </button>
          <button type="button" aria-pressed={range === "all"} onClick={() => setRange("all")}>
            All time
          </button>
        </div>
      </div>

      <ol className="dm-board-list" style={{ height: family.members.length * ROW - (ROW - 72) }}>
        {scored.map(({ m, score }) => {
          const i = rank.get(m.id)!;
          return (
            <li
              key={m.id}
              className={`dm-row${i === 0 ? " dm-row-lead" : ""}`}
              style={{ transform: `translateY(${i * ROW}px)` }}
              aria-label={`${ordinal(i + 1)}: ${m.name}, ${score} points`}
            >
              <span className="dm-rank">{i === 0 ? <Crown width={22} height={22} /> : i + 1}</span>
              <Avatar look={m.look} size={48} shape={family.members.indexOf(m)} color={colors.get(m.id)} rank={i} of={family.members.length} />
              <span className="dm-row-main">
                <span className="dm-row-name">{m.name}</span>
                <span className="dm-meter">
                  <span style={{ width: `${(score / top) * 100}%` }} />
                </span>
              </span>
              <span className="dm-score">
                {score.toLocaleString()}
                <small>pts</small>
              </span>
              {flash?.id === m.id && <span className="dm-flash">+{flash.points}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
