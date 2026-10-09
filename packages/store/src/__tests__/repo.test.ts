import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { DEMO_PARENT_PHRASE, MemoryItemStore, PHRASE_LOCKED, PHRASE_NEEDED, Repo, UserError, seedDemo, type ItemStore } from "../index.js";
import { DynamoItemStore } from "../dynamo-store.js";

// Set TEST_DYNAMO_TABLE to run the same tests against a real DynamoDB table.
// Each test then uses its own throwaway household.
const TABLE = process.env.TEST_DYNAMO_TABLE;
let HH: string;
let now: Date;
let db: ItemStore;
let repo: Repo;

beforeEach(async () => {
  now = new Date("2026-10-07T18:00:00Z"); // a Wednesday
  HH = TABLE ? `test-${randomUUID().slice(0, 8)}` : "demo";
  db = TABLE ? new DynamoItemStore(TABLE) : new MemoryItemStore();
  repo = new Repo(db, () => now);
  await seedDemo(repo, { householdId: HH, devToken: `dev-token-${HH}` });
});

const bal = async (name: string) => (await repo.load(HH)).players.find((p) => p.name === name)!;

describe("household and players", () => {
  it("seeds the demo family with packs and a dev token", async () => {
    const s = await repo.begin(HH);
    expect(s.players.map((p) => p.name)).toEqual(["Dad", "John", "Mom", "Sally"]);
    expect(s.packs.map((p) => [p.title, p.status, p.questionCount])).toEqual([
      ["Starter Riddles", "ready", 12],
      ["Starter Trivia", "ready", 15],
    ]);
    expect(s.news).toEqual([]);
    expect(await repo.householdForToken(`dev-token-${HH}`)).toBe(HH);
    expect(s.meta.phraseHash).toBeDefined();
    expect(JSON.stringify(s.meta)).not.toContain(DEMO_PARENT_PHRASE);
  });

  it("adds a player with first name, role, and grade band only", async () => {
    const players = await repo.addPlayer(HH, await repo.begin(HH), { name: "Grandma", role: "parent" });
    expect(players.map((p) => p.name)).toContain("Grandma");
    const g = players.find((p) => p.name === "Grandma")!;
    expect(Object.keys(g).sort()).toEqual(["balance", "lifetime", "name", "playerId", "role", "streak"]);
  });

  it("refuses duplicate names and lists known names for unknown players", async () => {
    const s = await repo.begin(HH);
    await expect(repo.addPlayer(HH, s, { name: "sally", role: "kid" })).rejects.toThrow("already playing");
    expect(() => repo.resolvePlayer(s, "Grandpa")).toThrow("The players are Dad, John, Mom, and Sally.");
  });
});

describe("record_round", () => {
  it("stores a family round and awards points", async () => {
    const r = await repo.recordRound(HH, await repo.begin(HH), {
      question: "Can you look at the sun through sunglasses?",
      correctAnswer: "No, never",
      guesses: [
        { player: "Mom", guess: "no, never", verdict: "correct" },
        { player: "dad", guess: "only upside down", verdict: "wrong" },
        { player: "Sally", guess: "yes", verdict: "wrong" },
      ],
    });
    expect(r.results.map((x) => [x.player, x.points])).toEqual([
      ["Mom", 1],
      ["Dad", 0],
      ["Sally", 0],
    ]);
    expect(r.outcome).toEqual({ type: "none" });
    expect(r.scoreboard.players[0]).toMatchObject({ name: "Mom", balance: 7 });
    expect(await bal("Mom")).toMatchObject({ balance: 7, lifetime: 12, streak: 2 });
    expect(await bal("Sally")).toMatchObject({ streak: 0 });
    const ledger = await repo.ledgerFor(HH);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ playerId: "mom", change: 1, reason: "round" });
  });

  it("is idempotent on idempotencyKey", async () => {
    const input = {
      question: "q",
      correctAnswer: "a",
      guesses: [{ player: "John", guess: "a", verdict: "correct" as const }],
      idempotencyKey: "k1",
    };
    const first = await repo.recordRound(HH, await repo.begin(HH), input);
    const second = await repo.recordRound(HH, await repo.begin(HH), input);
    expect(second).toEqual(first);
    expect(await bal("John")).toMatchObject({ balance: 6, lifetime: 9 });
  });

  it("errors on an unknown player and changes nothing", async () => {
    await expect(
      repo.recordRound(HH, await repo.begin(HH), {
        question: "q",
        correctAnswer: "a",
        guesses: [
          { player: "Mom", guess: "a", verdict: "correct" },
          { player: "Zed", guess: "a", verdict: "correct" },
        ],
      }),
    ).rejects.toThrow(UserError);
    expect(await bal("Mom")).toMatchObject({ balance: 6 });
  });
});

describe("hosted rounds", () => {
  it("starts a round from a pack, keeps it open across sessions, and closes it", async () => {
    const started = await repo.startRound(HH, await repo.begin(HH), { mode: "hosted" });
    expect(started.needsHostQuestion).toBe(false);
    expect(started.packTitle).toBe("Starter Trivia");
    expect(started.answerKey?.hostNote).toBe("do not reveal before guesses are recorded");

    // New session: the open round is still there (R3.6).
    const s = await repo.begin(HH);
    expect(s.meta.openRound?.roundId).toBe(started.roundId);

    const r = await repo.recordRound(HH, s, {
      roundId: started.roundId,
      guesses: [{ player: "Sally", guess: "x", verdict: "correct" }],
    });
    expect(r.question).toBe(started.question);
    expect(r.correctAnswer).toBe(started.answerKey!.answer);

    const after = await repo.begin(HH);
    expect(after.meta.openRound).toBeUndefined();
    expect(repo.packSummaries(after).find((p) => p.title === "Starter Trivia")!.remaining).toBe(14);
    await expect(
      repo.recordRound(HH, after, { roundId: started.roundId, guesses: [{ player: "Sally", guess: "x", verdict: "correct" }] }),
    ).rejects.toThrow("already finished");
  });

  it("never repeats a question and asks the host for one when the pack runs out", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const s = await repo.startRound(HH, await repo.begin(HH), { mode: "riddle" });
      expect(s.needsHostQuestion).toBe(false);
      expect(seen.has(s.question!)).toBe(false);
      seen.add(s.question!);
      await repo.recordRound(HH, await repo.begin(HH), { roundId: s.roundId, guesses: [{ player: "Mom", guess: "?", verdict: "wrong" }] });
    }
    const out = await repo.startRound(HH, await repo.begin(HH), { mode: "riddle" });
    expect(out.needsHostQuestion).toBe(true);
    // The host supplies its own question for the open round.
    const r = await repo.recordRound(HH, await repo.begin(HH), {
      roundId: out.roundId,
      question: "What has four wheels and flies?",
      correctAnswer: "a garbage truck",
      guesses: [{ player: "John", guess: "garbage truck", verdict: "correct" }],
    });
    expect(r.question).toBe("What has four wheels and flies?");
  });

  it("can play from a named pack", async () => {
    const s = await repo.startRound(HH, await repo.begin(HH), { mode: "hosted", packId: "Starter Riddles" });
    expect(s.packTitle).toBe("Starter Riddles");
  });
});

describe("stakes, tiebreaks, and chores", () => {
  it("chore with a tiebreak, then the loser owes it", async () => {
    const start = await repo.startRound(HH, await repo.begin(HH), { mode: "hosted", stake: { type: "chore", label: "take out the garbage" } });
    const r1 = await repo.recordRound(HH, await repo.begin(HH), {
      roundId: start.roundId,
      guesses: [
        { player: "Mom", guess: "a", verdict: "correct" },
        { player: "Dad", guess: "b", verdict: "wrong" },
        { player: "Sally", guess: "a", verdict: "correct" },
        { player: "John", guess: "b", verdict: "wrong" },
      ],
    });
    expect(r1.outcome).toEqual({ type: "tiebreak_needed", stake: { type: "chore", label: "take out the garbage" }, tied: ["Dad", "John"] });

    const tb = await repo.startRound(HH, await repo.begin(HH), { mode: "hosted", tiebreakOf: r1.roundId });
    expect(tb.players).toEqual(["Dad", "John"]);
    expect(tb.stake).toEqual({ type: "chore", label: "take out the garbage" });

    const r2 = await repo.recordRound(HH, await repo.begin(HH), {
      roundId: tb.roundId,
      guesses: [
        { player: "Dad", guess: "x", verdict: "wrong" },
        { player: "John", guess: "y", verdict: "correct" },
        { player: "Mom", guess: "y", verdict: "correct" }, // not in the tiebreak: ignored
      ],
    });
    expect(r2.outcome).toMatchObject({ type: "settled", stake: "chore", loser: "Dad", label: "take out the garbage" });
    expect(r2.results.map((x) => x.player)).toEqual(["Dad", "John"]);

    const s = await repo.begin(HH);
    expect(repo.scoreboard(s).openChores).toEqual([expect.objectContaining({ label: "take out the garbage", owedBy: "Dad" })]);

    const done = await repo.completeChore(HH, s, { player: "Dad" });
    expect(done.openChores).toEqual([]);
    expect((await repo.begin(HH)).chores).toEqual([]);
  });

  it("pick stake returns the single winner", async () => {
    const r = await repo.recordRound(HH, await repo.begin(HH), {
      question: "q",
      correctAnswer: "a",
      stake: { type: "pick", label: "pick the movie" },
      guesses: [
        { player: "Sally", guess: "a", verdict: "correct" },
        { player: "John", guess: "b", verdict: "wrong" },
      ],
    });
    expect(r.outcome).toEqual({ type: "settled", stake: "pick", winner: "Sally", label: "pick the movie" });
  });
});

describe("spending and trading", () => {
  it("spend without the phrase is refused; with the phrase it lowers balance, not lifetime", async () => {
    await expect(repo.spendPoints(HH, await repo.begin(HH), { player: "Sally", amount: 3, reason: "pick the movie" })).rejects.toThrow(PHRASE_NEEDED);
    const r = await repo.spendPoints(HH, await repo.begin(HH), {
      player: "Sally",
      amount: 3,
      reason: "pick the movie",
      parentPhrase: "Purple, pancakes!",
    });
    expect(r).toMatchObject({ balance: 0, lifetime: 6 });
    expect(await bal("Sally")).toMatchObject({ balance: 0, lifetime: 6 });
  });

  it("reports a shortfall", async () => {
    await repo.setPhrase(HH, null);
    await expect(repo.spendPoints(HH, await repo.begin(HH), { player: "Sally", amount: 5, reason: "x" })).rejects.toThrow(
      "Sally has 3 points, 2 short of 5.",
    );
  });

  it("locks protected actions after five wrong phrases in ten minutes", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(repo.spendPoints(HH, await repo.begin(HH), { player: "Mom", amount: 1, reason: "x", parentPhrase: "nope" })).rejects.toThrow(PHRASE_NEEDED);
    }
    await expect(repo.spendPoints(HH, await repo.begin(HH), { player: "Mom", amount: 1, reason: "x", parentPhrase: "nope" })).rejects.toThrow(PHRASE_LOCKED);
    // Even the right phrase is refused while locked.
    await expect(
      repo.spendPoints(HH, await repo.begin(HH), { player: "Mom", amount: 1, reason: "x", parentPhrase: DEMO_PARENT_PHRASE }),
    ).rejects.toThrow(PHRASE_LOCKED);
    now = new Date(now.getTime() + 11 * 60 * 1000);
    await expect(
      repo.spendPoints(HH, await repo.begin(HH), { player: "Mom", amount: 1, reason: "x", parentPhrase: DEMO_PARENT_PHRASE }),
    ).resolves.toMatchObject({ balance: 5 });
  });

  it("transfers points and hands over a chore in one operation", async () => {
    await repo.recordRound(HH, await repo.begin(HH), {
      question: "q",
      correctAnswer: "a",
      stake: { type: "chore", label: "take out the garbage" },
      guesses: [
        { player: "John", guess: "b", verdict: "wrong" },
        { player: "Sally", guess: "a", verdict: "correct" },
      ],
    });
    const t = await repo.transferPoints(HH, await repo.begin(HH), { from: "John", to: "Sally", amount: 3, reason: "garbage deal", chore: "garbage" });
    expect(t).toMatchObject({ from: { name: "John", balance: 2 }, to: { name: "Sally", balance: 7 }, chore: { owedBy: "Sally" } });
    const s = await repo.begin(HH);
    expect(s.chores[0]).toMatchObject({ owedBy: "sally", transferredFrom: "john" });
    expect(s.players.find((p) => p.name === "Sally")).toMatchObject({ balance: 7, lifetime: 7 });
    expect(s.players.find((p) => p.name === "John")).toMatchObject({ lifetime: 8 });
  });

  it("refuses a transfer of a chore the giver doesn't owe, and changes nothing", async () => {
    await repo.recordRound(HH, await repo.begin(HH), {
      question: "q",
      correctAnswer: "a",
      stake: { type: "chore", label: "dishes" },
      guesses: [
        { player: "Dad", guess: "b", verdict: "wrong" },
        { player: "Sally", guess: "a", verdict: "correct" },
      ],
    });
    await expect(repo.transferPoints(HH, await repo.begin(HH), { from: "John", to: "Sally", amount: 1, reason: "x", chore: "dishes" })).rejects.toThrow(
      "John doesn't owe dishes.",
    );
    await expect(repo.transferPoints(HH, await repo.begin(HH), { from: "John", to: "John", amount: 1, reason: "x" })).rejects.toThrow("yourself");
    await expect(repo.transferPoints(HH, await repo.begin(HH), { from: "John", to: "Sally", amount: 9, reason: "x" })).rejects.toThrow("short");
    expect(await bal("John")).toMatchObject({ balance: 5 });
  });

  it("asks for the phrase on trades only when set to spend_and_trade", async () => {
    await repo.setPhraseScope(HH, "spend_and_trade");
    await expect(repo.transferPoints(HH, await repo.begin(HH), { from: "John", to: "Sally", amount: 1, reason: "gift" })).rejects.toThrow(PHRASE_NEEDED);
    await expect(
      repo.transferPoints(HH, await repo.begin(HH), { from: "John", to: "Sally", amount: 1, reason: "gift", parentPhrase: DEMO_PARENT_PHRASE }),
    ).resolves.toMatchObject({ amount: 1 });
  });
});

describe("resets", () => {
  it("resets balances at the start of a new week, keeps lifetime and chores, and adds news", async () => {
    await repo.recordRound(HH, await repo.begin(HH), {
      question: "q",
      correctAnswer: "a",
      stake: { type: "chore", label: "dishes" },
      guesses: [
        { player: "Dad", guess: "b", verdict: "wrong" },
        { player: "Mom", guess: "a", verdict: "correct" },
      ],
    });
    now = new Date("2026-10-12T16:00:00Z"); // next Monday
    const s = await repo.begin(HH);
    expect(s.players.every((p) => p.balance === 0)).toBe(true);
    expect(s.players.find((p) => p.name === "Mom")!.lifetime).toBe(12);
    expect(s.chores).toHaveLength(1);
    expect(s.meta.periodStart).toBe("2026-10-12");
    expect(s.news.map((n) => n.text)).toEqual(["Scores were reset for a new week. Mom led with 7 points."]);
    // Only once.
    await repo.markNewsSeen(HH, s.news);
    const again = await repo.begin(HH);
    expect(again.news).toEqual([]);
  });

  it("never resets on 'never', and resets immediately on demand", async () => {
    await repo.updateSettings(HH, { resetSchedule: "never" });
    now = new Date("2027-03-01T16:00:00Z");
    expect((await repo.begin(HH)).players.find((p) => p.name === "Mom")!.balance).toBe(6);
    await repo.resetNow(HH);
    expect((await repo.begin(HH)).players.every((p) => p.balance === 0)).toBe(true);
  });
});

describe("packs and news", () => {
  it("building pack becomes ready with news, and can fail with a reason", async () => {
    const pack = await repo.createPack(HH, { title: "Fractions for Sally", topic: "fractions", forPlayerId: "sally" });
    expect(repo.packSummaries(await repo.begin(HH)).find((p) => p.packId === pack.packId)).toMatchObject({ status: "building", remaining: 0, forPlayer: "Sally" });
    await repo.addPackQuestions(
      HH,
      pack.packId,
      [{ question: "What is half of ten?", answer: "five", accept: ["5"], explanation: "Ten split into two equal parts is five each.", difficulty: "easy" }],
      { finish: true, newsText: "Sally's fractions pack is ready." },
    );
    const s = await repo.begin(HH);
    expect(repo.packSummaries(s).find((p) => p.packId === pack.packId)).toMatchObject({ status: "ready", remaining: 1 });
    expect(s.news.map((n) => n.text)).toEqual(["Sally's fractions pack is ready."]);

    const bad = await repo.createPack(HH, { title: "Bad", topic: "bad" });
    await repo.setPackStatus(HH, bad.packId, "failed", "That topic isn't right for kids.");
    expect(repo.packSummaries(await repo.begin(HH)).find((p) => p.packId === bad.packId)).toMatchObject({ status: "failed", failReason: "That topic isn't right for kids." });
  });
});
