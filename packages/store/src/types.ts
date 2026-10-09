import type {
  Chore,
  GradeBand,
  Outcome,
  PhraseScope,
  Player,
  PointSettings,
  ResetSchedule,
  Role,
  Stake,
  Verdict,
} from "@hey-trivi/core";

export type RoundMode = "family" | "hosted" | "riddle";

export interface OpenRound {
  roundId: string;
  sk: string;
  mode: RoundMode;
  stake?: Stake;
  /** Player ids allowed to answer (tiebreaks). Empty means everyone. */
  playerIds?: string[];
  tiebreakOf?: string;
  question?: string;
  correctAnswer?: string;
  accept?: string[];
  explanation?: string;
  packId?: string;
  questionSk?: string;
  startedAt: string;
}

export interface RoundResult {
  player: string;
  guess: string;
  verdict: Verdict;
  points: number;
}

/** Outcome with player names instead of ids, for the host to say. */
export type NamedOutcome =
  | { type: "none" }
  | { type: "settled"; stake: "chore"; loser: string; label: string; choreId: string }
  | { type: "settled"; stake: "pick"; winner: string; label: string }
  | { type: "tiebreak_needed"; stake: Stake; tied: string[] };

export interface LastRound {
  roundId: string;
  question: string;
  correctAnswer: string;
  explanation?: string;
  results: RoundResult[];
  outcome: NamedOutcome;
  stake?: Stake;
  at: string;
}

export interface HouseholdMeta {
  householdId: string;
  showTitle: string;
  pointSettings: PointSettings;
  timeZone: string;
  resetSchedule: ResetSchedule;
  periodStart?: string;
  phraseHash?: string;
  phraseSalt?: string;
  phraseRequiredFor?: PhraseScope;
  phraseFailures?: number[];
  phraseLockedUntil?: number;
  openRound?: OpenRound;
  lastRound?: LastRound;
  createdAt: string;
}

export type PackKind = "trivia" | "riddle";
export type PackStatus = "building" | "ready" | "failed";

export interface Pack {
  packId: string;
  title: string;
  topic: string;
  kind: PackKind;
  forPlayerId?: string;
  status: PackStatus;
  failReason?: string;
  questionCount: number;
  usedCount: number;
  createdAt: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface PackQuestion {
  packId: string;
  n: number;
  question: string;
  answer: string;
  accept: string[];
  explanation: string;
  difficulty: Difficulty;
  usedAt?: string;
}

export interface NewsItem {
  sk: string;
  text: string;
  seen: boolean;
  at: string;
}

export interface LedgerEntry {
  playerId: string;
  change: number;
  reason: string;
  roundId?: string;
  at: string;
}

export interface State {
  meta: HouseholdMeta;
  players: Player[];
  chores: Chore[];
  packs: Pack[];
  news: NewsItem[];
}

export interface NewPlayer {
  name: string;
  role: Role;
  gradeBand?: GradeBand;
}

export interface ScoreboardPlayer {
  name: string;
  role: Role;
  balance: number;
  lifetime: number;
  streak: number;
}

export interface Scoreboard {
  showTitle: string;
  players: ScoreboardPlayer[];
  lastRound: LastRound | null;
  openChores: Array<{ choreId: string; label: string; owedBy: string }>;
}

export type { Chore, Outcome, Player };
