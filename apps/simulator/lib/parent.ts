/**
 * The parent page's data (the MCP server's /parent API) and the small helpers
 * the page uses to show it.
 */

export type Role = "parent" | "kid";
export type GradeBand = "K-2" | "3-5" | "6-8" | "9-12";
export type ResetSchedule = "never" | "weekly" | "monthly";
export type PhraseScope = "spend" | "spend_and_trade";
export type Verdict = "correct" | "partial" | "wrong";

export const GRADE_BANDS: GradeBand[] = ["K-2", "3-5", "6-8", "9-12"];

export interface ParentPlayer {
  playerId: string;
  name: string;
  role: Role;
  gradeBand: GradeBand | null;
  balance: number;
  lifetime: number;
  streak: number;
}

export interface LedgerRow {
  playerId: string;
  change: number;
  reason: string;
  roundId: string | null;
  at: string;
}

export type Outcome =
  | { type: "none" }
  | { type: "settled"; stake: "chore"; loser: string; label: string }
  | { type: "settled"; stake: "pick"; winner: string; label: string }
  | { type: "tiebreak_needed"; tied: string[] };

export interface RoundRow {
  roundId: string;
  mode: "family" | "hosted" | "riddle";
  question: string;
  correctAnswer: string;
  explanation?: string;
  stake?: { type: "none" | "chore" | "pick"; label?: string };
  tiebreakOf?: string;
  packTitle: string | null;
  guesses: Array<{ player: string; guess: string; verdict: Verdict; points: number }>;
  outcome: Outcome;
  at: string;
}

export type PackKind = "trivia" | "riddle" | "mixed";
export type QuestionKind = "trivia" | "riddle";
export type Difficulty = "easy" | "medium" | "hard";

export interface PackSummary {
  packId: string;
  title: string;
  topic: string;
  kind: PackKind;
  status: "building" | "ready" | "failed";
  failReason: string | null;
  /** Left out of the mix; still plays by name. */
  paused: boolean;
  questionCount: number;
  remaining: number;
  forPlayerId: string | null;
  createdAt: string;
}

/** A question as the parent writes it. */
export interface QuestionInput {
  kind: QuestionKind;
  question: string;
  answer: string;
  accept: string[];
  explanation: string;
  difficulty: Difficulty;
}

export interface PackQuestionRow extends QuestionInput {
  n: number;
  used: boolean;
}

export interface PackDetail {
  packId: string;
  title: string;
  topic: string;
  kind: PackKind;
  forPlayerId: string | null;
  questions: PackQuestionRow[];
}

/** From the pack helper (app/api/pack-draft). */
export interface DraftQuestion extends QuestionInput {
  check: { status: "agreed" } | { status: "disputed"; checkerAnswer?: string; problem?: string };
}
export interface Draft {
  title: string;
  topic: string;
  questions: DraftQuestion[];
}

export const PACK_KIND_LABEL: Record<PackKind, string> = { trivia: "Questions", riddle: "Riddles", mixed: "Questions and riddles" };

export interface PointSettings {
  correct: number;
  partial: number;
  wrong: number;
}

/** Household show settings (the /demo stage). readTwice also changes what the host says. */
export interface StageSettings {
  theme: string;
  lights: boolean;
  celebrate: boolean;
  readTwice: boolean;
}

export interface Dashboard {
  household: {
    householdId: string;
    /** The shared demo family, which resets itself after sitting idle. */
    demo: boolean;
    /** DEMO=1: the built-in demo family, where saves change nothing (lib/demo-family.ts). */
    readOnly?: boolean;
    showTitle: string;
    timeZone: string;
    resetSchedule: ResetSchedule;
    periodStart: string | null;
    nextReset: string | null;
    phraseSet: boolean;
    phraseRequiredFor: PhraseScope;
    pointSettings: PointSettings;
    stage: StageSettings;
  };
  players: ParentPlayer[];
  openChores: Array<{ choreId: string; label: string; owedBy: string }>;
  ledger: LedgerRow[];
  rounds: RoundRow[];
  packs: PackSummary[];
}

export class SignedOut extends Error {}

/** Call the parent API through this app's proxy. Every call returns the dashboard. */
export async function parentApi<T = Dashboard>(path: string, opts: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/parent/${path}`, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) throw new SignedOut(json.error ?? "Please sign in again.");
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
  return json as T;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

let palette = new Map<string, string>();

/** Each family member's colour, by player id (components/parent/ui.tsx works them out). Call when the dashboard loads. */
export function setPalette(colors: Map<string, string>): void {
  palette = colors;
}

export function playerColor(playerId: string): string {
  return palette.get(playerId) ?? "var(--line)";
}

/** YYYY-MM-DD for an instant, in the household time zone. */
export function dayKey(iso: string | Date, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

export function timeOfDay(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).toLowerCase();
}

/** "Today · Thu, Oct 8", "Yesterday · Wed, Oct 7", "Tue, Oct 6" */
export function dayLabel(key: string, timeZone: string): string {
  const label = new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
  const today = dayKey(new Date(), timeZone);
  const yesterday = dayKey(new Date(Date.now() - 864e5), timeZone);
  return key === today ? `Today · ${label}` : key === yesterday ? `Yesterday · ${label}` : label;
}

/** "Mon, Oct 12" for a YYYY-MM-DD date. */
export function dateLabel(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

export function groupByDay<T extends { at: string }>(rows: T[], timeZone: string): Array<{ key: string; rows: T[] }> {
  const out: Array<{ key: string; rows: T[] }> = [];
  for (const r of rows) {
    const key = dayKey(r.at, timeZone);
    if (out.at(-1)?.key !== key) out.push({ key, rows: [] });
    out.at(-1)!.rows.push(r);
  }
  return out;
}

export type LedgerKind = "earn" | "spend" | "trade" | "reset";

/** Turn a ledger reason ("round", "reset", "spend: x", "gave Sally: x", "from John: x") into words. */
export function describeLedger(row: LedgerRow, questionFor: (roundId: string) => string | undefined): { kind: LedgerKind; title: string; detail?: string } {
  const r = row.reason;
  if (r === "round") {
    const q = row.roundId ? questionFor(row.roundId) : undefined;
    return { kind: "earn", title: row.change >= 0 ? "Right answer" : "Lost points in a round", detail: q };
  }
  if (r === "reset") return { kind: "reset", title: "Balance reset to 0" };
  const spend = r.match(/^spend: (.*)$/s);
  if (spend) return { kind: "spend", title: `Spent on ${spend[1]}` };
  const gave = r.match(/^gave ([^:]+): (.*)$/s);
  if (gave) return { kind: "trade", title: `Gave ${gave[1]} points`, detail: gave[2] };
  const from = r.match(/^from ([^:]+): (.*)$/s);
  if (from) return { kind: "trade", title: `Got points from ${from[1]}`, detail: from[2] };
  return { kind: "earn", title: r };
}

/** Balance after each ledger row (rows newest first), walking back from today's balances. */
export function balancesAfter(rows: LedgerRow[], players: ParentPlayer[]): number[] {
  const running = new Map(players.map((p) => [p.playerId, p.balance]));
  return rows.map((row) => {
    const now = running.get(row.playerId) ?? 0;
    running.set(row.playerId, now - row.change);
    return now;
  });
}

export function outcomeText(o: Outcome): string | null {
  if (o.type === "settled" && o.stake === "chore") return `${o.loser} owes: ${o.label}`;
  if (o.type === "settled") return `${o.winner} gets to ${o.label}`;
  if (o.type === "tiebreak_needed") return `Tie between ${o.tied.join(" and ")}. Tiebreak next.`;
  return null;
}

export function sourceText(r: RoundRow): string {
  if (r.packTitle) return r.packTitle;
  return r.mode === "family" ? "Family question" : "Host question";
}
