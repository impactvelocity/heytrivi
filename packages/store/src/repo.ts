/**
 * Hey Trivi repository: every game operation, written once against ItemStore.
 *
 * Tools call these methods. Each method applies the rules from @hey-trivi/core
 * and writes the result in one all-or-nothing transaction.
 *
 * Errors a person can fix (unknown player, no open round, not enough points)
 * are thrown as UserError with a message the host can say out loud.
 */

import { randomUUID } from "node:crypto";
import {
  DEFAULT_POINT_SETTINGS,
  checkSpend,
  checkTransfer,
  findPlayer,
  hashPhrase,
  isLockedOut,
  isValidFirstName,
  isValidTimeZone,
  listNames,
  newSalt,
  normalizeName,
  periodHasEnded,
  periodStartFor,
  phraseMatches,
  recordFailure,
  resetBalances,
  resolveStake,
  scoreRound,
  tiebreakGuesses,
  type Chore,
  type Guess,
  type PhraseScope,
  type Player,
  type PointSettings,
  type ResetSchedule,
  type Stake,
  type Verdict,
} from "@hey-trivi/core";
import { ConditionFailedError, type Item, type ItemStore, type Write } from "./item-store.js";
import type {
  Difficulty,
  HouseholdMeta,
  LastRound,
  NamedOutcome,
  NewPlayer,
  NewsItem,
  OpenRound,
  Pack,
  PackKind,
  PackQuestion,
  RoundMode,
  RoundResult,
  Scoreboard,
  State,
} from "./types.js";

export class UserError extends Error {
  constructor(
    message: string,
    public readonly code: string = "user_error",
  ) {
    super(message);
    this.name = "UserError";
  }
}

export const PHRASE_NEEDED = "That needs the parent phrase. Ask a parent to say it.";
export const PHRASE_LOCKED = "Too many wrong parent phrases. Points are locked for ten minutes.";

const pk = (hh: string) => `HH#${hh}`;
export const keys = {
  meta: (hh: string) => ({ PK: pk(hh), SK: "META" }),
  player: (hh: string, id: string) => ({ PK: pk(hh), SK: `PLAYER#${id}` }),
  chore: (hh: string, id: string) => ({ PK: pk(hh), SK: `CHORE#${id}` }),
  pack: (hh: string, id: string) => ({ PK: pk(hh), SK: `PACK#${id}` }),
  question: (hh: string, packId: string, n: number) => ({ PK: pk(hh), SK: `PACK#${packId}#Q#${String(n).padStart(3, "0")}` }),
  idempotency: (hh: string, key: string) => ({ PK: pk(hh), SK: `IDEMP#${key}` }),
  user: (sub: string) => ({ PK: `USER#${sub}`, SK: "META" }),
  token: (token: string) => ({ PK: `TOKEN#${token}`, SK: "META" }),
};

const shortId = () => randomUUID().replace(/-/g, "").slice(0, 10);
const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function strip<T>(item: Item): T {
  const { PK: _pk, SK: _sk, type: _type, ...rest } = item;
  return rest as T;
}

export interface RecordRoundInput {
  roundId?: string;
  question?: string;
  correctAnswer?: string;
  explanation?: string;
  guesses: Array<{ player: string; guess: string; verdict: Verdict }>;
  stake?: Stake;
  idempotencyKey?: string;
}

export interface RecordRoundResult {
  roundId: string;
  question: string;
  correctAnswer: string;
  explanation?: string;
  results: RoundResult[];
  outcome: NamedOutcome;
  scoreboard: Scoreboard;
}

export interface StartRoundInput {
  mode: RoundMode;
  packId?: string;
  stake?: Stake;
  players?: string[];
  tiebreakOf?: string;
}

export interface StartRoundResult {
  roundId: string;
  mode: RoundMode;
  stake?: Stake;
  players: string[];
  tiebreakOf?: string;
  needsHostQuestion: boolean;
  question?: string;
  packTitle?: string;
  answerKey?: { answer: string; accept: string[]; explanation: string; hostNote: string };
}

export class Repo {
  constructor(
    readonly db: ItemStore,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private now(): Date {
    return this.clock();
  }

  // ---------------------------------------------------------------------------
  // Loading state and the reset check
  // ---------------------------------------------------------------------------

  async load(hh: string): Promise<State> {
    const [metaItem, players, chores, packs, news] = await Promise.all([
      this.db.get(keys.meta(hh)),
      this.db.query(pk(hh), { skPrefix: "PLAYER#" }),
      this.db.query(pk(hh), { skPrefix: "CHORE#", filters: [{ attr: "status", op: "=", value: "open" }] }),
      this.db.query(pk(hh), { skPrefix: "PACK#", filters: [{ attr: "type", op: "=", value: "pack" }] }),
      this.db.query(pk(hh), { skPrefix: "NEWS#", filters: [{ attr: "seen", op: "=", value: false }] }),
    ]);
    if (!metaItem) throw new Error(`Household ${hh} not found`);
    return {
      meta: strip<HouseholdMeta>(metaItem),
      players: players.map((i) => strip<Player>(i)).sort((a, b) => a.name.localeCompare(b.name)),
      chores: chores.map((i) => strip<Chore>(i)),
      packs: packs.map((i) => strip<Pack>(i)),
      news: news.map((i) => ({ ...strip<NewsItem>(i), sk: i.SK })),
    };
  }

  /**
   * Called at the start of every tool call. Loads the household and, if the
   * reset period has ended, resets balances first (R13.8).
   */
  async begin(hh: string): Promise<State> {
    const state = await this.load(hh);
    const { meta } = state;
    if (periodHasEnded(meta.periodStart, this.now(), meta.resetSchedule, meta.timeZone)) {
      const next = periodStartFor(this.now(), meta.resetSchedule, meta.timeZone)!;
      try {
        await this.applyReset(hh, state, next);
      } catch (err) {
        // Another request reset first. Fine: reload below.
        if (!(err instanceof ConditionFailedError)) throw err;
      }
      return this.load(hh);
    }
    return state;
  }

  /** Reset balances now, from the parent page (R13.10). */
  async resetNow(hh: string): Promise<void> {
    const state = await this.load(hh);
    await this.applyReset(hh, state, undefined);
  }

  private async applyReset(hh: string, state: State, nextPeriodStart: string | undefined): Promise<void> {
    const at = this.now().toISOString();
    const { meta, players } = state;
    const r = resetBalances(players);
    const name = (id: string) => players.find((p) => p.playerId === id)?.name ?? id;
    const leaderNames = r.leaders.map(name);
    const top = r.leaders.length ? r.finalBalances[r.leaders[0]!] : 0;
    const periodWord = nextPeriodStart ? (meta.resetSchedule === "monthly" ? "month" : "week") : "round of scoring";
    const text = leaderNames.length
      ? `Scores were reset for a new ${periodWord}. ${listNames(leaderNames)} ${leaderNames.length > 1 ? "tied for the lead" : "led"} with ${top} ${top === 1 ? "point" : "points"}.`
      : `Scores were reset for a new ${periodWord}.`;

    const writes: Write[] = [];
    if (nextPeriodStart) {
      writes.push({
        kind: "update",
        key: keys.meta(hh),
        set: { periodStart: nextPeriodStart },
        conditions: meta.periodStart ? [{ attr: "periodStart", op: "=", value: meta.periodStart }] : [],
      });
    }
    for (const p of players) {
      writes.push({ kind: "update", key: keys.player(hh, p.playerId), set: { balance: 0 }, conditions: [{ attr: "PK", op: "exists" }] });
      writes.push(this.ledger(hh, { playerId: p.playerId, change: -p.balance, reason: "reset", at }));
    }
    writes.push({
      kind: "put",
      item: {
        PK: pk(hh),
        SK: `PERIOD#${meta.periodStart ?? at}#${shortId()}`,
        type: "period",
        periodStart: meta.periodStart ?? null,
        endedAt: at,
        leaders: leaderNames,
        finalBalances: Object.fromEntries(players.map((p) => [p.name, p.balance])),
      },
    });
    writes.push(this.news(hh, text));
    await this.db.transact(writes);
  }

  // ---------------------------------------------------------------------------
  // Household
  // ---------------------------------------------------------------------------

  async createHousehold(input: {
    householdId?: string;
    showTitle: string;
    timeZone?: string;
    resetSchedule?: ResetSchedule;
    pointSettings?: PointSettings;
    players?: Array<NewPlayer & { playerId?: string; balance?: number; lifetime?: number; streak?: number }>;
    ownerSub?: string;
  }): Promise<string> {
    const hh = input.householdId ?? `hh_${shortId()}`;
    const timeZone = input.timeZone ?? "America/New_York";
    if (!isValidTimeZone(timeZone)) throw new UserError(`Unknown time zone ${timeZone}.`);
    const resetSchedule = input.resetSchedule ?? "weekly";
    const meta: HouseholdMeta = clean({
      householdId: hh,
      showTitle: input.showTitle,
      pointSettings: input.pointSettings ?? DEFAULT_POINT_SETTINGS,
      timeZone,
      resetSchedule,
      periodStart: periodStartFor(this.now(), resetSchedule, timeZone) ?? undefined,
      createdAt: this.now().toISOString(),
    });
    const writes: Write[] = [{ kind: "put", item: { ...keys.meta(hh), type: "household", ...meta }, conditions: [{ attr: "PK", op: "notExists" }] }];
    for (const p of input.players ?? []) {
      const playerId = p.playerId ?? this.newPlayerId(p.name);
      writes.push({
        kind: "put",
        item: {
          ...keys.player(hh, playerId),
          type: "player",
          ...clean({ playerId, name: p.name, role: p.role, gradeBand: p.gradeBand }),
          balance: p.balance ?? 0,
          lifetime: p.lifetime ?? 0,
          streak: p.streak ?? 0,
        },
      });
    }
    if (input.ownerSub) {
      writes.push({ kind: "put", item: { ...keys.user(input.ownerSub), type: "user", householdId: hh }, conditions: [{ attr: "PK", op: "notExists" }] });
    }
    await this.db.transact(writes);
    return hh;
  }

  async updateSettings(
    hh: string,
    s: { showTitle?: string; timeZone?: string; resetSchedule?: ResetSchedule; pointSettings?: PointSettings },
  ): Promise<void> {
    const state = await this.load(hh);
    const set: Record<string, unknown> = {};
    if (s.showTitle !== undefined) set.showTitle = s.showTitle.trim().slice(0, 60);
    if (s.pointSettings) set.pointSettings = s.pointSettings;
    const tz = s.timeZone ?? state.meta.timeZone;
    if (!isValidTimeZone(tz)) throw new UserError(`Unknown time zone ${tz}.`);
    const schedule = s.resetSchedule ?? state.meta.resetSchedule;
    if (s.timeZone !== undefined) set.timeZone = tz;
    if (s.resetSchedule !== undefined || s.timeZone !== undefined) {
      set.resetSchedule = schedule;
      // A new schedule starts counting from the current period.
      const start = periodStartFor(this.now(), schedule, tz);
      if (start) set.periodStart = start;
    }
    const remove = schedule === "never" && state.meta.periodStart ? ["periodStart"] : [];
    if (!Object.keys(set).length && !remove.length) return;
    await this.db.transact([{ kind: "update", key: keys.meta(hh), set, remove }]);
  }

  /** Set, change, or remove (phrase = null) the parent phrase (R13.1). */
  async setPhrase(hh: string, phrase: string | null, requiredFor: PhraseScope = "spend"): Promise<void> {
    if (phrase === null) {
      await this.db.transact([
        {
          kind: "update",
          key: keys.meta(hh),
          remove: ["phraseHash", "phraseSalt", "phraseRequiredFor", "phraseFailures", "phraseLockedUntil"],
        },
      ]);
      return;
    }
    if (phrase.trim().split(/\s+/).length < 2) throw new UserError("Use at least two words for the parent phrase.");
    const salt = newSalt();
    await this.db.transact([
      {
        kind: "update",
        key: keys.meta(hh),
        set: { phraseHash: hashPhrase(phrase, salt), phraseSalt: salt, phraseRequiredFor: requiredFor, phraseFailures: [] },
        remove: ["phraseLockedUntil"],
      },
    ]);
  }

  async setPhraseScope(hh: string, requiredFor: PhraseScope): Promise<void> {
    await this.db.transact([
      { kind: "update", key: keys.meta(hh), set: { phraseRequiredFor: requiredFor }, conditions: [{ attr: "phraseHash", op: "exists" }] },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Players
  // ---------------------------------------------------------------------------

  private newPlayerId(name: string): string {
    return `${normalizeName(name).replace(/[^a-z0-9]/g, "") || "player"}-${shortId().slice(0, 4)}`;
  }

  async addPlayer(hh: string, state: State, p: NewPlayer): Promise<Player[]> {
    const name = p.name.trim();
    if (!isValidFirstName(name)) throw new UserError("Just a first name, please.");
    if (findPlayer(state.players, name)) throw new UserError(`${name} is already playing.`);
    if (state.players.length >= 12) throw new UserError("A household can have up to twelve players.");
    const player: Player = clean({
      playerId: this.newPlayerId(name),
      name: name[0]!.toUpperCase() + name.slice(1),
      role: p.role,
      gradeBand: p.role === "kid" ? p.gradeBand : undefined,
      balance: 0,
      lifetime: 0,
      streak: 0,
    });
    await this.db.transact([
      { kind: "put", item: { ...keys.player(hh, player.playerId), type: "player", ...player }, conditions: [{ attr: "PK", op: "notExists" }] },
    ]);
    return [...state.players, player].sort((a, b) => a.name.localeCompare(b.name));
  }

  async updatePlayer(hh: string, playerId: string, p: Partial<NewPlayer>): Promise<void> {
    const set: Record<string, unknown> = {};
    if (p.name !== undefined) {
      if (!isValidFirstName(p.name)) throw new UserError("Just a first name, please.");
      set.name = p.name.trim();
    }
    if (p.role !== undefined) set.role = p.role;
    const remove: string[] = [];
    if (p.gradeBand !== undefined && p.role !== "parent") set.gradeBand = p.gradeBand;
    if (p.role === "parent") remove.push("gradeBand");
    await this.db.transact([{ kind: "update", key: keys.player(hh, playerId), set, remove, conditions: [{ attr: "PK", op: "exists" }] }]);
  }

  async removePlayer(hh: string, playerId: string): Promise<void> {
    await this.db.transact([{ kind: "delete", key: keys.player(hh, playerId) }]);
  }

  /** Resolve a spoken name, or throw an error listing the known names (R2.3). */
  resolvePlayer(state: State, name: string): Player {
    const p = findPlayer(state.players, name);
    if (!p) {
      throw new UserError(
        `I don't know anyone called ${name}. The players are ${listNames(state.players.map((x) => x.name))}.`,
        "unknown_player",
      );
    }
    return p;
  }

  // ---------------------------------------------------------------------------
  // Rounds
  // ---------------------------------------------------------------------------

  async startRound(hh: string, state: State, input: StartRoundInput): Promise<StartRoundResult> {
    const at = this.now().toISOString();
    let stake = input.stake && input.stake.type !== "none" ? input.stake : undefined;
    let playerIds = (input.players ?? []).map((n) => this.resolvePlayer(state, n).playerId);

    if (input.tiebreakOf) {
      const last = state.meta.lastRound;
      if (!last || last.roundId !== input.tiebreakOf) {
        throw new UserError("I can only run a tiebreak for the round we just played.", "bad_tiebreak");
      }
      // Carry the stake forward (R4.4).
      stake = last.stake ?? (last.outcome.type === "tiebreak_needed" ? last.outcome.stake : stake);
      if (playerIds.length === 0 && last.outcome.type === "tiebreak_needed") {
        playerIds = last.outcome.tied.map((n) => this.resolvePlayer(state, n).playerId);
      }
    }

    const roundId = `r_${shortId()}`;
    const sk = `ROUND#${at}#${roundId}`;
    const open: OpenRound = clean({
      roundId,
      sk,
      mode: input.mode,
      stake,
      playerIds: playerIds.length ? playerIds : undefined,
      tiebreakOf: input.tiebreakOf,
      startedAt: at,
    });

    let packTitle: string | undefined;
    if (input.mode !== "family") {
      const chosen = await this.pickQuestion(hh, state, input.mode, input.packId);
      if (chosen) {
        Object.assign(open, {
          question: chosen.q.question,
          correctAnswer: chosen.q.answer,
          accept: chosen.q.accept,
          explanation: chosen.q.explanation,
          packId: chosen.pack.packId,
          questionSk: keys.question(hh, chosen.pack.packId, chosen.q.n).SK,
        });
        packTitle = chosen.pack.title;
      }
    }

    const writes: Write[] = [];
    // Starting a new round abandons any round left open.
    if (state.meta.openRound) {
      writes.push({ kind: "update", key: { PK: pk(hh), SK: state.meta.openRound.sk }, set: { status: "abandoned" } });
    }
    writes.push({ kind: "put", item: { PK: pk(hh), SK: sk, type: "round", status: "open", ...open } });
    writes.push({ kind: "update", key: keys.meta(hh), set: { openRound: open } });
    await this.db.transact(writes);

    const names = (ids: string[]) => ids.map((id) => state.players.find((p) => p.playerId === id)!.name);
    return clean({
      roundId,
      mode: input.mode,
      stake,
      players: playerIds.length ? names(playerIds) : state.players.map((p) => p.name),
      tiebreakOf: input.tiebreakOf,
      needsHostQuestion: !open.question,
      question: open.question,
      packTitle,
      answerKey: open.question
        ? {
            answer: open.correctAnswer!,
            accept: open.accept ?? [],
            explanation: open.explanation ?? "",
            hostNote: "do not reveal before guesses are recorded",
          }
        : undefined,
    });
  }

  private async pickQuestion(
    hh: string,
    state: State,
    mode: RoundMode,
    packId?: string,
  ): Promise<{ pack: Pack; q: PackQuestion } | undefined> {
    let candidates: Pack[];
    if (packId) {
      const pack = state.packs.find((p) => p.packId === packId || normalizeName(p.title) === normalizeName(packId));
      if (!pack) throw new UserError(`I can't find that pack. You have ${listNames(state.packs.map((p) => p.title))}.`, "unknown_pack");
      if (pack.status !== "ready") throw new UserError(`The ${pack.title} pack isn't ready yet.`, "pack_not_ready");
      candidates = [pack];
    } else {
      const kind: PackKind = mode === "riddle" ? "riddle" : "trivia";
      candidates = state.packs.filter((p) => p.status === "ready" && p.kind === kind);
    }
    candidates = candidates.filter((p) => p.questionCount - p.usedCount > 0);
    // Newest packs first, so a freshly built pack gets played.
    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const pack of candidates) {
      const qs = await this.db.query(pk(hh), {
        skPrefix: `PACK#${pack.packId}#Q#`,
        filters: [{ attr: "usedAt", op: "notExists" }],
      });
      if (qs.length) {
        const q = strip<PackQuestion>(qs[Math.floor(Math.random() * qs.length)]!);
        return { pack, q };
      }
    }
    return undefined;
  }

  async recordRound(hh: string, state: State, input: RecordRoundInput): Promise<RecordRoundResult> {
    if (input.idempotencyKey) {
      const prior = await this.db.get(keys.idempotency(hh, input.idempotencyKey));
      if (prior) return prior.result as RecordRoundResult;
    }
    const at = this.now().toISOString();
    const { meta } = state;

    let open: OpenRound | undefined;
    if (input.roundId) {
      if (meta.openRound?.roundId !== input.roundId) {
        throw new UserError("That round is already finished. Start a new one.", "round_closed");
      }
      open = meta.openRound;
    } else if (!input.question) {
      open = meta.openRound;
      if (!open) throw new UserError("What was the question? Tell me the question and everyone's answers.", "no_open_round");
    }

    const question = input.question ?? open?.question;
    const correctAnswer = input.correctAnswer ?? open?.correctAnswer;
    if (!question) throw new UserError("What was the question?", "missing_question");
    if (!correctAnswer) throw new UserError("What's the right answer?", "missing_answer");
    if (input.guesses.length === 0) throw new UserError("I need at least one answer.", "no_guesses");

    // Resolve names. The last answer from a player counts.
    const guessMap = new Map<string, Guess & { name: string }>();
    for (const g of input.guesses) {
      const p = this.resolvePlayer(state, g.player);
      guessMap.set(p.playerId, { playerId: p.playerId, guess: g.guess, verdict: g.verdict, name: p.name });
    }
    let guesses = [...guessMap.values()];
    if (open?.playerIds?.length) guesses = tiebreakGuesses(guesses, open.playerIds) as typeof guesses;
    if (guesses.length === 0) {
      throw new UserError(
        `This tiebreak is only for ${listNames(open!.playerIds!.map((id) => state.players.find((p) => p.playerId === id)?.name ?? id))}.`,
        "wrong_players",
      );
    }

    const stake = open ? open.stake : input.stake && input.stake.type !== "none" ? input.stake : undefined;
    const scored = scoreRound(state.players, guesses, meta.pointSettings);
    const outcome = resolveStake(stake, guesses);
    const name = (id: string) => state.players.find((p) => p.playerId === id)!.name;

    const roundId = open?.roundId ?? `r_${shortId()}`;
    const roundSk = open?.sk ?? `ROUND#${at}#${roundId}`;
    const results: RoundResult[] = scored.awards.map((a) => ({
      player: name(a.playerId),
      guess: guessMap.get(a.playerId)!.guess,
      verdict: a.verdict,
      points: a.points,
    }));

    const writes: Write[] = [];
    let named: NamedOutcome;
    let newChore: Chore | undefined;
    if (outcome.type === "settled" && outcome.stake === "chore") {
      newChore = { choreId: `c_${shortId()}`, label: outcome.label, owedBy: outcome.loser, status: "open", roundId };
      named = { type: "settled", stake: "chore", loser: name(outcome.loser), label: outcome.label, choreId: newChore.choreId };
      writes.push({ kind: "put", item: { ...keys.chore(hh, newChore.choreId), type: "chore", ...newChore, createdAt: at } });
    } else if (outcome.type === "settled") {
      named = { type: "settled", stake: "pick", winner: name(outcome.winner), label: outcome.label };
    } else if (outcome.type === "tiebreak_needed") {
      named = { type: "tiebreak_needed", stake: outcome.stake, tied: outcome.tied.map(name) };
    } else {
      named = { type: "none" };
    }

    const lastRound: LastRound = clean({
      roundId,
      question,
      correctAnswer,
      explanation: input.explanation ?? open?.explanation,
      results,
      outcome: named,
      stake,
      at,
    });

    writes.push({
      kind: "put",
      item: {
        PK: pk(hh),
        SK: roundSk,
        type: "round",
        ...clean({
          roundId,
          mode: open?.mode ?? "family",
          stake,
          question,
          correctAnswer,
          explanation: lastRound.explanation,
          packId: open?.packId,
          tiebreakOf: open?.tiebreakOf,
        }),
        status: "closed",
        guesses: results,
        outcome: named,
        startedAt: open?.startedAt ?? at,
        closedAt: at,
      },
    });
    writes.push({
      kind: "update",
      key: keys.meta(hh),
      set: { lastRound },
      remove: open && meta.openRound?.roundId === open.roundId ? ["openRound"] : [],
    });

    for (const after of scored.players) {
      const before = state.players.find((p) => p.playerId === after.playerId)!;
      if (!guessMap.has(after.playerId) || !guesses.some((g) => g.playerId === after.playerId)) continue;
      const dBal = after.balance - before.balance;
      const dLife = after.lifetime - before.lifetime;
      writes.push({
        kind: "update",
        key: keys.player(hh, after.playerId),
        set: { streak: after.streak },
        add: { balance: dBal, lifetime: dLife },
        conditions: [{ attr: "PK", op: "exists" }],
      });
      if (dBal !== 0) writes.push(this.ledger(hh, { playerId: after.playerId, change: dBal, reason: "round", roundId, at }));
    }

    if (open?.questionSk && open.packId) {
      writes.push({ kind: "update", key: { PK: pk(hh), SK: open.questionSk }, set: { usedAt: at } });
      writes.push({ kind: "update", key: keys.pack(hh, open.packId), add: { usedCount: 1 }, conditions: [{ attr: "PK", op: "exists" }] });
    }

    const players = scored.players;
    const chores = newChore ? [...state.chores, newChore] : state.chores;
    const result: RecordRoundResult = clean({
      roundId,
      question,
      correctAnswer,
      explanation: lastRound.explanation,
      results,
      outcome: named,
      scoreboard: this.scoreboard({ ...state, meta: { ...meta, lastRound }, players, chores }),
    });

    let idemIndex = -1;
    if (input.idempotencyKey) {
      idemIndex = writes.length;
      writes.push({
        kind: "put",
        item: { ...keys.idempotency(hh, input.idempotencyKey), type: "idempotency", result, at },
        conditions: [{ attr: "PK", op: "notExists" }],
      });
    }

    try {
      await this.db.transact(writes);
    } catch (err) {
      if (err instanceof ConditionFailedError && err.failedIndexes.includes(idemIndex) && input.idempotencyKey) {
        const prior = await this.db.get(keys.idempotency(hh, input.idempotencyKey));
        if (prior) return prior.result as RecordRoundResult;
      }
      throw err;
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Chores
  // ---------------------------------------------------------------------------

  findChore(state: State, ref: { choreId?: string; player?: string; label?: string }): Chore {
    if (ref.choreId) {
      const c = state.chores.find((x) => x.choreId === ref.choreId);
      if (!c) throw new UserError("That chore is already done or doesn't exist.", "unknown_chore");
      return c;
    }
    let list = state.chores;
    if (ref.player) {
      const p = this.resolvePlayer(state, ref.player);
      list = list.filter((c) => c.owedBy === p.playerId);
      if (!list.length) throw new UserError(`${p.name} doesn't owe any chores.`, "unknown_chore");
    }
    if (ref.label) {
      const want = normalizeName(ref.label);
      const matched = list.filter((c) => normalizeName(c.label).includes(want) || want.includes(normalizeName(c.label)));
      if (matched.length) list = matched;
      else if (!ref.player || list.length > 1) throw new UserError(`I can't find a chore called ${ref.label}.`, "unknown_chore");
    }
    if (list.length === 0) throw new UserError("There are no open chores.", "unknown_chore");
    if (list.length > 1) {
      throw new UserError(`Which one? Open chores are ${listNames(list.map((c) => c.label))}.`, "ambiguous_chore");
    }
    return list[0]!;
  }

  async completeChore(hh: string, state: State, ref: { choreId?: string; player?: string; label?: string }): Promise<{ done: Chore; openChores: Chore[] }> {
    const chore = this.findChore(state, ref);
    await this.db.transact([
      {
        kind: "update",
        key: keys.chore(hh, chore.choreId),
        set: { status: "done", doneAt: this.now().toISOString() },
        conditions: [{ attr: "status", op: "=", value: "open" }],
      },
    ]);
    return { done: { ...chore, status: "done" }, openChores: state.chores.filter((c) => c.choreId !== chore.choreId) };
  }

  // ---------------------------------------------------------------------------
  // Points
  // ---------------------------------------------------------------------------

  /**
   * Check the parent phrase for a protected action. Returns writes to include
   * in the action's transaction (clearing old failures). Throws UserError if
   * the phrase is needed and missing or wrong, after recording the failure.
   */
  private async guardPhrase(hh: string, meta: HouseholdMeta, action: "spend" | "trade", attempt?: string): Promise<Write[]> {
    if (!meta.phraseHash || !meta.phraseSalt) return [];
    if (action === "trade" && meta.phraseRequiredFor !== "spend_and_trade") return [];
    const nowMs = this.now().getTime();
    const lock = { failures: meta.phraseFailures ?? [], lockedUntil: meta.phraseLockedUntil };
    if (isLockedOut(lock, nowMs)) throw new UserError(PHRASE_LOCKED, "phrase_locked");
    if (!attempt) throw new UserError(PHRASE_NEEDED, "phrase_required");
    if (!phraseMatches(attempt, meta.phraseSalt, meta.phraseHash)) {
      const next = recordFailure(lock, nowMs);
      await this.db.transact([
        {
          kind: "update",
          key: keys.meta(hh),
          set: clean({ phraseFailures: next.failures, phraseLockedUntil: next.lockedUntil }),
        },
      ]);
      throw new UserError(isLockedOut(next, nowMs) ? PHRASE_LOCKED : PHRASE_NEEDED, "phrase_required");
    }
    return lock.failures.length ? [{ kind: "update", key: keys.meta(hh), set: { phraseFailures: [] } }] : [];
  }

  async spendPoints(
    hh: string,
    state: State,
    input: { player: string; amount: number; reason: string; parentPhrase?: string },
  ): Promise<{ player: string; spent: number; reason: string; balance: number; lifetime: number }> {
    const player = this.resolvePlayer(state, input.player);
    const check = checkSpend(player, input.amount);
    if (!check.ok && check.reason === "bad_amount") throw new UserError("Points have to be a whole number above zero.", "bad_amount");
    const phraseWrites = await this.guardPhrase(hh, state.meta, "spend", input.parentPhrase);
    if (!check.ok) {
      throw new UserError(
        `${player.name} has ${player.balance} ${player.balance === 1 ? "point" : "points"}, ${check.shortfall} short of ${input.amount}.`,
        "shortfall",
      );
    }
    const at = this.now().toISOString();
    try {
      await this.db.transact([
        ...phraseWrites,
        {
          kind: "update",
          key: keys.player(hh, player.playerId),
          add: { balance: -input.amount },
          conditions: [{ attr: "balance", op: ">=", value: input.amount }],
        },
        this.ledger(hh, { playerId: player.playerId, change: -input.amount, reason: `spend: ${input.reason}`, at }),
      ]);
    } catch (err) {
      if (err instanceof ConditionFailedError) throw new UserError(`${player.name} doesn't have enough points for that.`, "shortfall");
      throw err;
    }
    return { player: player.name, spent: input.amount, reason: input.reason, balance: player.balance - input.amount, lifetime: player.lifetime };
  }

  async transferPoints(
    hh: string,
    state: State,
    input: { from: string; to: string; amount: number; reason: string; chore?: string; parentPhrase?: string },
  ): Promise<{
    from: { name: string; balance: number };
    to: { name: string; balance: number };
    amount: number;
    reason: string;
    chore?: { choreId: string; label: string; owedBy: string };
  }> {
    const from = this.resolvePlayer(state, input.from);
    const to = this.resolvePlayer(state, input.to);
    let chore: Chore | undefined;
    if (input.chore) {
      chore =
        state.chores.find((c) => c.choreId === input.chore) ??
        (() => {
          const want = normalizeName(input.chore!);
          const matches = state.chores.filter((c) => normalizeName(c.label).includes(want) || want.includes(normalizeName(c.label)));
          return matches.find((c) => c.owedBy === from.playerId) ?? matches[0];
        })();
      if (!chore) throw new UserError(`${from.name} doesn't owe ${input.chore}.`, "chore_not_owed");
    }
    const check = checkTransfer(from, to, input.amount, chore);
    if (!check.ok) {
      const msg = {
        same_player: "You can't give points to yourself.",
        bad_amount: "Points have to be a whole number above zero.",
        shortfall: `${from.name} has ${from.balance} ${from.balance === 1 ? "point" : "points"}, ${check.shortfall} short of ${input.amount}.`,
        chore_not_owed: `${from.name} doesn't owe ${chore?.label ?? "that chore"}.`,
      }[check.reason];
      throw new UserError(msg, check.reason);
    }
    const phraseWrites = await this.guardPhrase(hh, state.meta, "trade", input.parentPhrase);
    const at = this.now().toISOString();
    const writes: Write[] = [
      ...phraseWrites,
      {
        kind: "update",
        key: keys.player(hh, from.playerId),
        add: { balance: -input.amount },
        conditions: [{ attr: "balance", op: ">=", value: input.amount }],
      },
      { kind: "update", key: keys.player(hh, to.playerId), add: { balance: input.amount }, conditions: [{ attr: "PK", op: "exists" }] },
      this.ledger(hh, { playerId: from.playerId, change: -input.amount, reason: `gave ${to.name}: ${input.reason}`, at }),
      this.ledger(hh, { playerId: to.playerId, change: input.amount, reason: `from ${from.name}: ${input.reason}`, at }),
    ];
    if (chore) {
      writes.push({
        kind: "update",
        key: keys.chore(hh, chore.choreId),
        set: { owedBy: to.playerId, transferredFrom: from.playerId },
        conditions: [
          { attr: "owedBy", op: "=", value: from.playerId },
          { attr: "status", op: "=", value: "open" },
        ],
      });
    }
    try {
      await this.db.transact(writes);
    } catch (err) {
      if (err instanceof ConditionFailedError) throw new UserError("Something changed while we were talking. Nothing moved. Try again.", "conflict");
      throw err;
    }
    return clean({
      from: { name: from.name, balance: from.balance - input.amount },
      to: { name: to.name, balance: to.balance + input.amount },
      amount: input.amount,
      reason: input.reason,
      chore: chore ? { choreId: chore.choreId, label: chore.label, owedBy: to.name } : undefined,
    });
  }

  async ledgerFor(hh: string, limit = 50): Promise<Array<{ playerId: string; change: number; reason: string; at: string }>> {
    const items = await this.db.query(pk(hh), { skPrefix: "LEDGER#" });
    return items.slice(-limit).reverse().map((i) => strip(i));
  }

  private ledger(hh: string, e: { playerId: string; change: number; reason: string; roundId?: string; at: string }): Write {
    return { kind: "put", item: { PK: pk(hh), SK: `LEDGER#${e.at}#${shortId()}`, type: "ledger", ...clean(e) } };
  }

  // ---------------------------------------------------------------------------
  // Packs and news
  // ---------------------------------------------------------------------------

  async createPack(
    hh: string,
    p: { title: string; topic: string; kind?: PackKind; forPlayerId?: string; status?: "building" | "ready"; packId?: string },
  ): Promise<Pack> {
    const pack: Pack = clean({
      packId: p.packId ?? `pk_${shortId()}`,
      title: p.title.trim().slice(0, 60),
      topic: p.topic.trim().slice(0, 120),
      kind: p.kind ?? "trivia",
      forPlayerId: p.forPlayerId,
      status: p.status ?? "building",
      questionCount: 0,
      usedCount: 0,
      createdAt: this.now().toISOString(),
    });
    await this.db.transact([{ kind: "put", item: { ...keys.pack(hh, pack.packId), type: "pack", ...pack }, conditions: [{ attr: "PK", op: "notExists" }] }]);
    return pack;
  }

  async getPack(hh: string, packId: string): Promise<{ pack: Pack; questions: PackQuestion[] } | undefined> {
    const items = await this.db.query(pk(hh), { skPrefix: `PACK#${packId}` });
    const packItem = items.find((i) => i.type === "pack" && i.packId === packId);
    if (!packItem) return undefined;
    return {
      pack: strip<Pack>(packItem),
      questions: items.filter((i) => i.type === "question" && i.packId === packId).map((i) => strip<PackQuestion>(i)),
    };
  }

  /**
   * Add questions to a pack. With `finish`, also mark the pack ready and add a
   * news item so the host announces it next session (R7.7).
   */
  async addPackQuestions(
    hh: string,
    packId: string,
    questions: Array<Omit<PackQuestion, "packId" | "n" | "usedAt">>,
    opts: { finish?: boolean; announce?: boolean; newsText?: string } = {},
  ): Promise<void> {
    const existing = await this.getPack(hh, packId);
    if (!existing) throw new UserError("That pack doesn't exist.", "unknown_pack");
    let next = existing.questions.reduce((m, q) => Math.max(m, q.n), 0) + 1;
    const items = questions.map((q) => ({
      ...keys.question(hh, packId, next),
      type: "question",
      ...clean({ packId, n: next++, question: q.question, answer: q.answer, accept: q.accept, explanation: q.explanation, difficulty: q.difficulty }),
    }));
    const chunks: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += 90) chunks.push(items.slice(i, i + 90));
    if (chunks.length === 0) chunks.push([]);
    for (const [idx, chunk] of chunks.entries()) {
      const last = idx === chunks.length - 1;
      const writes: Write[] = chunk.map((item) => ({ kind: "put", item }));
      const set: Record<string, unknown> = {};
      if (last && opts.finish) set.status = "ready";
      writes.push({
        kind: "update",
        key: keys.pack(hh, packId),
        add: { questionCount: chunk.length },
        set,
        remove: last && opts.finish ? ["failReason"] : [],
      });
      if (last && opts.finish && opts.announce !== false) {
        writes.push(this.news(hh, opts.newsText ?? `A new pack is ready: ${existing.pack.title}.`));
      }
      await this.db.transact(writes);
    }
  }

  async updatePackQuestion(
    hh: string,
    packId: string,
    n: number,
    q: Partial<Pick<PackQuestion, "question" | "answer" | "accept" | "explanation" | "difficulty">>,
  ): Promise<void> {
    await this.db.transact([{ kind: "update", key: keys.question(hh, packId, n), set: clean(q), conditions: [{ attr: "PK", op: "exists" }] }]);
  }

  async deletePackQuestion(hh: string, packId: string, n: number): Promise<void> {
    const q = await this.db.get(keys.question(hh, packId, n));
    if (!q) return;
    await this.db.transact([
      { kind: "delete", key: keys.question(hh, packId, n) },
      { kind: "update", key: keys.pack(hh, packId), add: { questionCount: -1, usedCount: q.usedAt ? -1 : 0 } },
    ]);
  }

  async deletePack(hh: string, packId: string): Promise<void> {
    const items = await this.db.query(pk(hh), { skPrefix: `PACK#${packId}` });
    const mine = items.filter((i) => i.packId === packId);
    for (let i = 0; i < mine.length; i += 100) {
      await this.db.transact(mine.slice(i, i + 100).map((it) => ({ kind: "delete" as const, key: { PK: it.PK, SK: it.SK } })));
    }
  }

  async setPackStatus(hh: string, packId: string, status: "building" | "failed", failReason?: string, newsText?: string): Promise<void> {
    const writes: Write[] = [
      {
        kind: "update",
        key: keys.pack(hh, packId),
        set: clean({ status, failReason }),
        remove: status === "building" ? ["failReason"] : [],
        conditions: [{ attr: "PK", op: "exists" }],
      },
    ];
    if (newsText) writes.push(this.news(hh, newsText));
    await this.db.transact(writes);
  }

  /** Recently missed questions for a player (pack builder context, R7.3). */
  async recentMisses(hh: string, playerName: string, limit = 10): Promise<Array<{ question: string; correctAnswer: string; guess: string }>> {
    const rounds = await this.db.query(pk(hh), { skPrefix: "ROUND#", filters: [{ attr: "status", op: "=", value: "closed" }] });
    const misses: Array<{ question: string; correctAnswer: string; guess: string }> = [];
    for (const r of rounds.reverse()) {
      const g = (r.guesses as RoundResult[] | undefined)?.find((x) => x.player === playerName && x.verdict !== "correct");
      if (g) misses.push({ question: r.question as string, correctAnswer: r.correctAnswer as string, guess: g.guess });
      if (misses.length >= limit) break;
    }
    return misses;
  }

  async addNews(hh: string, text: string): Promise<void> {
    await this.db.transact([this.news(hh, text)]);
  }

  async markNewsSeen(hh: string, news: NewsItem[]): Promise<void> {
    if (!news.length) return;
    await this.db.transact(news.slice(0, 100).map((n) => ({ kind: "update" as const, key: { PK: pk(hh), SK: n.sk }, set: { seen: true } })));
  }

  private news(hh: string, text: string): Write {
    const at = this.now().toISOString();
    return { kind: "put", item: { PK: pk(hh), SK: `NEWS#${at}#${shortId()}`, type: "news", text, seen: false, at } };
  }

  // ---------------------------------------------------------------------------
  // Sign-in lookups
  // ---------------------------------------------------------------------------

  async householdForToken(token: string): Promise<string | undefined> {
    return (await this.db.get(keys.token(token)))?.householdId as string | undefined;
  }

  async addDevToken(token: string, hh: string): Promise<void> {
    await this.db.transact([{ kind: "put", item: { ...keys.token(token), type: "token", householdId: hh } }]);
  }

  async householdForUser(sub: string): Promise<string | undefined> {
    return (await this.db.get(keys.user(sub)))?.householdId as string | undefined;
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  scoreboard(state: Pick<State, "meta" | "players" | "chores">): Scoreboard {
    const name = (id: string) => state.players.find((p) => p.playerId === id)?.name ?? id;
    return {
      showTitle: state.meta.showTitle,
      players: [...state.players]
        .sort((a, b) => b.balance - a.balance || b.lifetime - a.lifetime || a.name.localeCompare(b.name))
        .map((p) => ({ name: p.name, role: p.role, balance: p.balance, lifetime: p.lifetime, streak: p.streak })),
      lastRound: state.meta.lastRound ?? null,
      openChores: state.chores.map((c) => ({ choreId: c.choreId, label: c.label, owedBy: name(c.owedBy) })),
    };
  }

  packSummaries(state: Pick<State, "packs" | "players">) {
    return [...state.packs]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((p) =>
        clean({
          packId: p.packId,
          title: p.title,
          topic: p.topic,
          kind: p.kind,
          status: p.status,
          remaining: Math.max(0, p.questionCount - p.usedCount),
          forPlayer: p.forPlayerId ? state.players.find((x) => x.playerId === p.forPlayerId)?.name : undefined,
          failReason: p.failReason,
        }),
      );
  }
}

export type { Difficulty };
