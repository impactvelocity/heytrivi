import { describe, expect, it } from "vitest";
import {
  DEFAULT_POINT_SETTINGS,
  applySpend,
  applyTransfer,
  checkSpend,
  checkTransfer,
  findPlayer,
  hashPhrase,
  isLockedOut,
  listNames,
  normalizePhrase,
  periodHasEnded,
  periodStartFor,
  phraseMatches,
  pointsFor,
  recordFailure,
  resetBalances,
  resolveStake,
  scoreRound,
  tiebreakGuesses,
  type Chore,
  type Guess,
  type Player,
} from "../index.js";

const p = (playerId: string, balance = 0, lifetime = 0, streak = 0): Player => ({
  playerId,
  name: playerId[0]!.toUpperCase() + playerId.slice(1),
  role: "kid",
  balance,
  lifetime,
  streak,
});
const g = (playerId: string, verdict: Guess["verdict"]): Guess => ({ playerId, guess: "x", verdict });

describe("verdicts and points", () => {
  it("correct earns 1, partial 0, wrong 0 by default", () => {
    expect(pointsFor("correct", DEFAULT_POINT_SETTINGS)).toBe(1);
    expect(pointsFor("partial", DEFAULT_POINT_SETTINGS)).toBe(0);
    expect(pointsFor("wrong", DEFAULT_POINT_SETTINGS)).toBe(0);
  });

  it("point values are configurable per household", () => {
    const { awards } = scoreRound([p("mom")], [g("mom", "partial")], { correct: 3, partial: 1, wrong: 0 });
    expect(awards[0]!.points).toBe(1);
  });

  it("adds points to balance and lifetime and tracks the streak", () => {
    const { players } = scoreRound(
      [p("mom", 6, 10, 2), p("dad", 4, 4, 3), p("sally")],
      [g("mom", "correct"), g("dad", "wrong")],
      DEFAULT_POINT_SETTINGS,
    );
    expect(players[0]).toMatchObject({ balance: 7, lifetime: 11, streak: 3 });
    expect(players[1]).toMatchObject({ balance: 4, lifetime: 4, streak: 0 });
    // Players who did not guess are unchanged.
    expect(players[2]).toMatchObject({ balance: 0, lifetime: 0, streak: 0 });
  });

  it("lifetime never goes down and balance never below zero, even with negative points", () => {
    const { players } = scoreRound([p("john", 0, 5)], [g("john", "wrong")], { correct: 1, partial: 0, wrong: -2 });
    expect(players[0]).toMatchObject({ balance: 0, lifetime: 5 });
  });
});

describe("stakes and tiebreaks", () => {
  const chore = { type: "chore" as const, label: "take out the garbage" };
  const pick = { type: "pick" as const, label: "pick the movie" };

  it("no stake → no outcome", () => {
    expect(resolveStake(undefined, [g("mom", "wrong")])).toEqual({ type: "none" });
    expect(resolveStake({ type: "none" }, [g("mom", "wrong")])).toEqual({ type: "none" });
  });

  it("chore: exactly one wrong → that player owes it", () => {
    expect(resolveStake(chore, [g("mom", "correct"), g("dad", "wrong"), g("sally", "partial")])).toEqual({
      type: "settled",
      stake: "chore",
      loser: "dad",
      label: "take out the garbage",
    });
  });

  it("chore: two wrong → tiebreak between them", () => {
    expect(resolveStake(chore, [g("mom", "correct"), g("dad", "wrong"), g("john", "wrong")])).toEqual({
      type: "tiebreak_needed",
      stake: chore,
      tied: ["dad", "john"],
    });
  });

  it("chore: nobody wrong → the lowest verdicts tie", () => {
    const out = resolveStake(chore, [g("mom", "correct"), g("dad", "partial"), g("john", "partial")]);
    expect(out).toMatchObject({ type: "tiebreak_needed", tied: ["dad", "john"] });
  });

  it("chore: everyone right → everyone ties", () => {
    const out = resolveStake(chore, [g("mom", "correct"), g("dad", "correct")]);
    expect(out).toMatchObject({ type: "tiebreak_needed", tied: ["mom", "dad"] });
  });

  it("chore: one lone partial among correct answers loses", () => {
    expect(resolveStake(chore, [g("mom", "correct"), g("dad", "partial")])).toMatchObject({ loser: "dad" });
  });

  it("pick: exactly one correct → that player wins", () => {
    expect(resolveStake(pick, [g("mom", "correct"), g("sally", "wrong")])).toEqual({
      type: "settled",
      stake: "pick",
      winner: "mom",
      label: "pick the movie",
    });
  });

  it("pick: two correct → tiebreak between them", () => {
    expect(resolveStake(pick, [g("mom", "correct"), g("sally", "correct"), g("john", "wrong")])).toMatchObject({
      type: "tiebreak_needed",
      tied: ["mom", "sally"],
    });
  });

  it("pick: nobody correct → best verdicts tie", () => {
    expect(resolveStake(pick, [g("mom", "wrong"), g("sally", "partial")])).toMatchObject({
      type: "settled",
      winner: "sally",
    });
  });

  it("a tiebreak round only counts the tied players", () => {
    const gs = [g("mom", "correct"), g("dad", "wrong"), g("john", "correct")];
    expect(tiebreakGuesses(gs, ["dad", "john"]).map((x) => x.playerId)).toEqual(["dad", "john"]);
    expect(resolveStake(chore, tiebreakGuesses(gs, ["dad", "john"]))).toMatchObject({ loser: "dad" });
  });
});

describe("spending", () => {
  it("spends from balance, never lifetime", () => {
    const sally = p("sally", 5, 9);
    expect(checkSpend(sally, 3)).toEqual({ ok: true });
    expect(applySpend(sally, 3)).toMatchObject({ balance: 2, lifetime: 9 });
  });

  it("reports the shortfall", () => {
    expect(checkSpend(p("sally", 2), 5)).toEqual({ ok: false, reason: "shortfall", shortfall: 3 });
  });

  it("rejects zero, negative, and fractional amounts", () => {
    expect(checkSpend(p("sally", 5), 0)).toMatchObject({ ok: false, reason: "bad_amount" });
    expect(checkSpend(p("sally", 5), -1)).toMatchObject({ ok: false, reason: "bad_amount" });
    expect(checkSpend(p("sally", 5), 1.5)).toMatchObject({ ok: false, reason: "bad_amount" });
  });
});

describe("trading", () => {
  const garbage: Chore = { choreId: "c1", label: "take out the garbage", owedBy: "john", status: "open" };

  it("moves balance only, not lifetime", () => {
    const r = applyTransfer(p("john", 5, 8), p("sally", 3, 6), 3);
    expect(r.from).toMatchObject({ balance: 2, lifetime: 8 });
    expect(r.to).toMatchObject({ balance: 6, lifetime: 6 });
  });

  it("hands over a chore owed by the giver", () => {
    expect(checkTransfer(p("john", 5), p("sally"), 3, garbage)).toEqual({ ok: true });
    const r = applyTransfer(p("john", 5), p("sally"), 3, garbage);
    expect(r.chore).toMatchObject({ owedBy: "sally", transferredFrom: "john" });
  });

  it("refuses a chore the giver does not owe", () => {
    expect(checkTransfer(p("sally", 5), p("john"), 3, garbage)).toMatchObject({ reason: "chore_not_owed" });
    expect(checkTransfer(p("john", 5), p("sally"), 3, { ...garbage, status: "done" })).toMatchObject({
      reason: "chore_not_owed",
    });
  });

  it("refuses same player, shortfall, and bad amounts", () => {
    expect(checkTransfer(p("john", 5), p("john", 5), 1)).toMatchObject({ reason: "same_player" });
    expect(checkTransfer(p("john", 1), p("sally"), 3)).toMatchObject({ reason: "shortfall", shortfall: 2 });
    expect(checkTransfer(p("john", 5), p("sally"), 0)).toMatchObject({ reason: "bad_amount" });
  });
});

describe("parent phrase", () => {
  it("normalises case, punctuation, and spaces", () => {
    expect(normalizePhrase("  Purple,   PANCAKES! ")).toBe("purple pancakes");
    expect(normalizePhrase("Purple pancakes.")).toBe(normalizePhrase("purple pancakes"));
  });

  it("matches the salted hash after normalising", () => {
    const hash = hashPhrase("Purple pancakes", "salt1");
    expect(hash).not.toContain("purple");
    expect(phraseMatches("purple, pancakes!", "salt1", hash)).toBe(true);
    expect(phraseMatches("purple waffles", "salt1", hash)).toBe(false);
    expect(phraseMatches("purple pancakes", "salt2", hash)).toBe(false);
  });

  it("locks for ten minutes after five wrong attempts in ten minutes", () => {
    const t0 = 1_000_000;
    let s = { failures: [] as number[] } as { failures: number[]; lockedUntil?: number };
    for (let i = 0; i < 4; i++) s = recordFailure(s, t0 + i * 1000);
    expect(isLockedOut(s, t0 + 5000)).toBe(false);
    s = recordFailure(s, t0 + 5000);
    expect(isLockedOut(s, t0 + 6000)).toBe(true);
    expect(isLockedOut(s, t0 + 5000 + 10 * 60 * 1000)).toBe(false);
  });

  it("old failures fall out of the window", () => {
    let s = { failures: [] as number[] } as { failures: number[]; lockedUntil?: number };
    for (let i = 0; i < 4; i++) s = recordFailure(s, i);
    s = recordFailure(s, 11 * 60 * 1000);
    expect(isLockedOut(s, 11 * 60 * 1000 + 1)).toBe(false);
    expect(s.failures).toHaveLength(1);
  });
});

describe("resets", () => {
  it("zeroes balances, keeps lifetime, and names the leader", () => {
    const r = resetBalances([p("mom", 7, 12), p("dad", 4, 9)]);
    expect(r.leaders).toEqual(["mom"]);
    expect(r.finalBalances).toEqual({ mom: 7, dad: 4 });
    expect(r.players.map((x) => [x.balance, x.lifetime])).toEqual([
      [0, 12],
      [0, 9],
    ]);
  });

  it("reports ties and no leader when everyone is at zero", () => {
    expect(resetBalances([p("mom", 3), p("dad", 3)]).leaders).toEqual(["mom", "dad"]);
    expect(resetBalances([p("mom", 0), p("dad", 0)]).leaders).toEqual([]);
  });

  it("weekly periods start Monday at midnight in the household time zone", () => {
    // Wednesday 2026-10-07 12:00 UTC
    expect(periodStartFor(new Date("2026-10-07T12:00:00Z"), "weekly", "UTC")).toBe("2026-10-05");
    // Monday 2026-10-05 03:00 UTC is still Sunday evening in New York.
    expect(periodStartFor(new Date("2026-10-05T03:00:00Z"), "weekly", "America/New_York")).toBe("2026-09-28");
    expect(periodStartFor(new Date("2026-10-05T05:00:00Z"), "weekly", "America/New_York")).toBe("2026-10-05");
    // Sunday belongs to the week that started the previous Monday.
    expect(periodStartFor(new Date("2026-10-11T12:00:00Z"), "weekly", "UTC")).toBe("2026-10-05");
  });

  it("monthly periods start on the first, across year boundaries", () => {
    expect(periodStartFor(new Date("2026-10-31T23:00:00Z"), "monthly", "UTC")).toBe("2026-10-01");
    expect(periodStartFor(new Date("2027-01-01T03:00:00Z"), "monthly", "America/Los_Angeles")).toBe("2026-12-01");
  });

  it("never resets on 'never'", () => {
    expect(periodStartFor(new Date(), "never", "UTC")).toBeNull();
    expect(periodHasEnded("2000-01-01", new Date(), "never", "UTC")).toBe(false);
  });

  it("detects when the stored period has ended", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    expect(periodHasEnded("2026-10-05", now, "weekly", "UTC")).toBe(false);
    expect(periodHasEnded("2026-09-28", now, "weekly", "UTC")).toBe(true);
    expect(periodHasEnded("2026-09-01", now, "monthly", "UTC")).toBe(true);
  });
});

describe("names", () => {
  const players = [p("mom"), p("sally")];
  it("matches names ignoring case and possessives", () => {
    expect(findPlayer(players, "SALLY")?.playerId).toBe("sally");
    expect(findPlayer(players, "mom's")?.playerId).toBe("mom");
    expect(findPlayer(players, "grandma")).toBeUndefined();
  });
  it("lists names the way people say them", () => {
    expect(listNames(["Mom"])).toBe("Mom");
    expect(listNames(["Mom", "Dad"])).toBe("Mom and Dad");
    expect(listNames(["Mom", "Dad", "Sally"])).toBe("Mom, Dad, and Sally");
  });
});
