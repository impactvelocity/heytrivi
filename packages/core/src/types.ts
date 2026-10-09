/**
 * Hey Trivi — shared types.
 *
 * Children's privacy (product.md): a player is a first name, a role, and an
 * optional grade band. Nothing else about a child is ever stored.
 */

export const BRAND_NAME = "Hey Trivi";

export type Role = "parent" | "kid";
export const GRADE_BANDS = ["K-2", "3-5", "6-8", "9-12"] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

export type Verdict = "correct" | "partial" | "wrong";

export type StakeType = "none" | "chore" | "pick";
export interface Stake {
  type: StakeType;
  /** What is at stake, in family words: "take out the garbage", "pick the movie". */
  label?: string;
}

export interface PointSettings {
  correct: number;
  partial: number;
  wrong: number;
}
export const DEFAULT_POINT_SETTINGS: PointSettings = { correct: 1, partial: 0, wrong: 0 };

export type ResetSchedule = "weekly" | "monthly" | "never";
export type PhraseScope = "spend" | "spend_and_trade";

export interface Player {
  playerId: string;
  name: string;
  role: Role;
  gradeBand?: GradeBand;
  /** Spendable points. */
  balance: number;
  /** Never goes down. For bragging. */
  lifetime: number;
  /** Consecutive correct answers. */
  streak: number;
}

export interface Guess {
  playerId: string;
  guess: string;
  verdict: Verdict;
}

export interface Award {
  playerId: string;
  verdict: Verdict;
  points: number;
}

export type Outcome =
  | { type: "none" }
  | { type: "settled"; stake: "chore"; loser: string; label: string }
  | { type: "settled"; stake: "pick"; winner: string; label: string }
  | { type: "tiebreak_needed"; stake: Stake; tied: string[] };

export interface Chore {
  choreId: string;
  label: string;
  owedBy: string;
  status: "open" | "done";
  roundId?: string;
  transferredFrom?: string;
}
