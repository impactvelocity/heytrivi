/**
 * Verdicts, points, stakes, and tiebreaks.
 */

import type { Award, Guess, Outcome, Player, PointSettings, Stake, Verdict } from "./types.js";

export function pointsFor(verdict: Verdict, settings: PointSettings): number {
  return settings[verdict];
}

/**
 * Award points for a round. Returns the awards and the players after the
 * round. Balance never drops below zero and lifetime never goes down, even if
 * a household configures negative points for a wrong answer.
 */
export function scoreRound(
  players: Player[],
  guesses: Guess[],
  settings: PointSettings,
): { awards: Award[]; players: Player[] } {
  const byId = new Map(guesses.map((g) => [g.playerId, g]));
  const awards: Award[] = guesses.map((g) => ({
    playerId: g.playerId,
    verdict: g.verdict,
    points: pointsFor(g.verdict, settings),
  }));
  const awardById = new Map(awards.map((a) => [a.playerId, a]));

  const updated = players.map((p) => {
    const g = byId.get(p.playerId);
    if (!g) return p;
    const pts = awardById.get(p.playerId)!.points;
    return {
      ...p,
      balance: Math.max(0, p.balance + pts),
      lifetime: p.lifetime + Math.max(0, pts),
      streak: g.verdict === "correct" ? p.streak + 1 : 0,
    };
  });
  return { awards, players: updated };
}

const RANK: Record<Verdict, number> = { wrong: 0, partial: 1, correct: 2 };

/**
 * Settle a stake.
 *
 * Chore: exactly one wrong answer → that player owes the chore. Otherwise the
 * worst-scoring players tie and play again (if several are wrong, those
 * players; if nobody is wrong, everyone with the lowest verdict).
 *
 * Pick: exactly one correct answer → that player wins the pick. Otherwise the
 * best-scoring players tie and play again.
 */
export function resolveStake(stake: Stake | undefined, guesses: Guess[]): Outcome {
  if (!stake || stake.type === "none" || guesses.length === 0) return { type: "none" };
  const label = stake.label ?? (stake.type === "chore" ? "the chore" : "the pick");

  if (guesses.length === 1) {
    const only = guesses[0]!;
    return stake.type === "chore"
      ? { type: "settled", stake: "chore", loser: only.playerId, label }
      : { type: "settled", stake: "pick", winner: only.playerId, label };
  }

  if (stake.type === "chore") {
    const worst = Math.min(...guesses.map((g) => RANK[g.verdict]));
    const tied = guesses.filter((g) => RANK[g.verdict] === worst).map((g) => g.playerId);
    if (tied.length === 1) return { type: "settled", stake: "chore", loser: tied[0]!, label };
    return { type: "tiebreak_needed", stake: { type: "chore", label }, tied };
  }

  const best = Math.max(...guesses.map((g) => RANK[g.verdict]));
  const tied = guesses.filter((g) => RANK[g.verdict] === best).map((g) => g.playerId);
  if (tied.length === 1) return { type: "settled", stake: "pick", winner: tied[0]!, label };
  return { type: "tiebreak_needed", stake: { type: "pick", label }, tied };
}

/** A tiebreak round only counts guesses from the tied players. */
export function tiebreakGuesses(guesses: Guess[], tiedPlayerIds: string[] | undefined): Guess[] {
  if (!tiedPlayerIds || tiedPlayerIds.length === 0) return guesses;
  const allowed = new Set(tiedPlayerIds);
  return guesses.filter((g) => allowed.has(g.playerId));
}
