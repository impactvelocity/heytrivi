"use client";

import { useMemo, useState } from "react";
import { balancesAfter, dayLabel, describeLedger, groupByDay, outcomeText, sourceText, timeOfDay, type Dashboard } from "@/lib/parent";
import { Avatar, Empty, PlayerFilter } from "./ui";

const KIND_LABEL = { earn: "Earned", spend: "Spent", trade: "Traded", reset: "Reset" } as const;

export function PointsHistory({ data }: { data: Dashboard }) {
  const [who, setWho] = useState("all");
  const tz = data.household.timeZone;

  const rows = useMemo(() => {
    const known = new Set(data.players.map((p) => p.playerId));
    // Drop rows for removed players, and zero-point resets (nothing moved).
    const all = data.ledger.filter((r) => known.has(r.playerId) && !(r.reason === "reset" && r.change === 0));
    const after = balancesAfter(all, data.players);
    const question = new Map(data.rounds.map((r) => [r.roundId, r.question]));
    return all
      .map((r, i) => ({ ...r, after: after[i]!, ...describeLedger(r, (id) => question.get(id)) }))
      .filter((r) => who === "all" || r.playerId === who);
  }, [data, who]);

  const player = (id: string) => data.players.find((p) => p.playerId === id)!;

  return (
    <>
      <div className="pp-filters" role="group" aria-label="Filter by family member">
        <PlayerFilter players={data.players} value={who} onChange={setWho} />
      </div>
      {rows.length === 0 ? (
        <Empty>No points have moved yet. Play a round and they&apos;ll show up here.</Empty>
      ) : (
        groupByDay(rows, tz).map((g) => (
          <div className="pp-day" key={g.key}>
            <h3>{dayLabel(g.key, tz)}</h3>
            <ul className="pp-ledger">
              {g.rows.map((r, i) => (
                <li key={`${r.at}-${r.playerId}-${i}`}>
                  <Avatar player={player(r.playerId)} small />
                  <div className="pp-why">
                    <span className={`pp-kind pp-k-${r.kind}`}>{KIND_LABEL[r.kind]}</span>
                    {player(r.playerId).name} · {r.title}
                    <small>
                      {r.detail ? `${r.detail} · ` : ""}
                      {timeOfDay(r.at, tz)}
                    </small>
                  </div>
                  <span className={`pp-chg pp-num ${r.change > 0 ? "pp-up" : r.change < 0 ? "pp-down" : ""}`}>
                    {r.change > 0 ? "+" : r.change < 0 ? "−" : ""}
                    {Math.abs(r.change)}
                  </span>
                  <span className="pp-after pp-num">now {r.after}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
}

const VERDICT = { correct: "✓", partial: "~ close", wrong: "✗" } as const;

export function QuestionHistory({ data }: { data: Dashboard }) {
  const [who, setWho] = useState("all");
  const [search, setSearch] = useState("");
  const tz = data.household.timeZone;
  const byName = new Map(data.players.map((p) => [p.name, p]));
  const whoName = data.players.find((p) => p.playerId === who)?.name;

  const s = search.trim().toLowerCase();
  const rows = data.rounds.filter(
    (r) => (who === "all" || r.guesses.some((g) => g.player === whoName)) && (!s || `${r.question} ${r.correctAnswer}`.toLowerCase().includes(s)),
  );

  return (
    <>
      <div className="pp-filters" role="group" aria-label="Filter questions">
        <PlayerFilter players={data.players} value={who} onChange={setWho} />
        <input id="q-search" type="text" className="pp-search" placeholder="Search questions" value={search} aria-label="Search questions" onChange={(e) => setSearch(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        <Empty>{data.rounds.length ? "No questions match." : "No questions yet. Say “Let’s play Hey Trivi” to start."}</Empty>
      ) : (
        groupByDay(rows, tz).map((g) => (
          <div className="pp-day" key={g.key}>
            <h3>{dayLabel(g.key, tz)}</h3>
            <div className="pp-rounds">
              {g.rows.map((r) => {
                const out = outcomeText(r.outcome);
                return (
                  <article className="pp-round" key={r.roundId}>
                    <div className="pp-round-meta">
                      <span className="pp-num">{timeOfDay(r.at, tz)}</span>
                      <span className={`pp-tag${r.packTitle ? " pp-tag-pack" : ""}`}>{sourceText(r)}</span>
                      {r.stake && r.stake.type !== "none" && r.stake.label && (
                        <span className={`pp-tag ${r.stake.type === "chore" ? "pp-tag-chore" : "pp-tag-pick"}`}>
                          {r.stake.type === "chore" ? "Loser has to" : "Winner gets to"} {r.stake.label}
                        </span>
                      )}
                      {r.tiebreakOf && <span className="pp-tag">Tiebreak</span>}
                    </div>
                    <h4>{r.question}</h4>
                    <div className="pp-guesses">
                      {r.guesses.map((gs) => {
                        const p = byName.get(gs.player);
                        return (
                          <span key={gs.player} className={`pp-guess pp-v-${gs.verdict}`}>
                            {p ? <Avatar player={p} small /> : <span className="pp-av pp-av-sm pp-av-gone">{gs.player[0]}</span>}
                            <b>{gs.player}</b> <q>{gs.guess}</q>
                            <span className="pp-verdict">
                              {VERDICT[gs.verdict]}
                              {gs.points ? ` ${gs.points > 0 ? "+" : ""}${gs.points}` : ""}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                    <p className="pp-answer">
                      <b>Answer: {r.correctAnswer}.</b> {r.explanation}
                    </p>
                    {out && <p className="pp-outcome">{out}</p>}
                  </article>
                );
              })}
            </div>
          </div>
        ))
      )}
    </>
  );
}
