/**
 * Demo family seed: Mom, Dad, Sally, and John, one trivia pack and one riddle
 * pack of original questions, and the demo parent phrase.
 *
 * The demo parent phrase is "purple pancakes". It is documented in the README
 * so judges can try a protected spend. Change it on the parent page.
 */

import { periodStartFor, type Stake, type Verdict } from "@hey-trivi/core";
import { ConditionFailedError, type Write } from "./item-store.js";
import { Repo } from "./repo.js";
import type { Difficulty, RoundMode } from "./types.js";

export const DEMO_HOUSEHOLD_ID = "demo";
export const DEMO_PARENT_PHRASE = "purple pancakes";
export const DEMO_DEV_TOKEN = "dev-token-demo";

type Q = { question: string; answer: string; accept: string[]; explanation: string; difficulty: Difficulty };

export const TRIVIA_PACK: Q[] = [
  { question: "How many legs does a spider have?", answer: "eight", accept: ["8"], explanation: "Spiders are arachnids, and every arachnid has eight legs.", difficulty: "easy" },
  { question: "What is the largest planet in our solar system?", answer: "Jupiter", accept: [], explanation: "Jupiter is so big that more than a thousand Earths could fit inside it.", difficulty: "easy" },
  { question: "What gas do plants take in from the air to make their food?", answer: "carbon dioxide", accept: ["CO2"], explanation: "Plants use sunlight to turn carbon dioxide and water into sugar, and give off oxygen.", difficulty: "medium" },
  { question: "How many sides does a hexagon have?", answer: "six", accept: ["6"], explanation: "Hex means six, like the cells in a honeycomb.", difficulty: "easy" },
  { question: "Which ocean is the biggest?", answer: "the Pacific Ocean", accept: ["Pacific"], explanation: "The Pacific covers about a third of the whole planet.", difficulty: "easy" },
  { question: "What is frozen water called?", answer: "ice", accept: [], explanation: "Water freezes into ice at zero degrees Celsius.", difficulty: "easy" },
  { question: "What is the closest star to Earth?", answer: "the Sun", accept: ["Sun", "our sun"], explanation: "The Sun is a star, and it is much closer than any star we see at night.", difficulty: "medium" },
  { question: "How many minutes are in two hours?", answer: "one hundred twenty", accept: ["120"], explanation: "Each hour has sixty minutes, and sixty plus sixty is one hundred twenty.", difficulty: "easy" },
  { question: "Which animal is the tallest in the world?", answer: "the giraffe", accept: ["giraffe"], explanation: "A grown giraffe can be taller than a one-story house.", difficulty: "easy" },
  { question: "What do bees make from flower nectar?", answer: "honey", accept: [], explanation: "Bees store nectar in the hive and fan it with their wings until it thickens into honey.", difficulty: "easy" },
  { question: "What is the hardest natural material on Earth?", answer: "diamond", accept: ["diamonds"], explanation: "Diamond is so hard that it is used on saw blades to cut stone.", difficulty: "medium" },
  { question: "How many continents are there?", answer: "seven", accept: ["7"], explanation: "Africa, Antarctica, Asia, Australia, Europe, North America, and South America.", difficulty: "easy" },
  { question: "What part of your body has the smallest bones?", answer: "the ear", accept: ["ear", "inner ear", "middle ear"], explanation: "Three tiny bones in your middle ear pass sound along to your inner ear.", difficulty: "hard" },
  { question: "Is a tomato a fruit or a vegetable, to a botanist?", answer: "a fruit", accept: ["fruit"], explanation: "Botanists call it a fruit because it grows from the flower and holds the seeds.", difficulty: "medium" },
  { question: "What is the boiling point of water in degrees Celsius at sea level?", answer: "one hundred", accept: ["100", "100 degrees"], explanation: "At sea level, water boils at one hundred degrees Celsius.", difficulty: "medium" },
];

export const RIDDLE_PACK: Q[] = [
  { question: "I have hands but I can't clap. What am I?", answer: "a clock", accept: ["clock", "watch"], explanation: "A clock has an hour hand and a minute hand.", difficulty: "easy" },
  { question: "The more of me you take, the more you leave behind. What am I?", answer: "footsteps", accept: ["steps", "footprints"], explanation: "Every step you take leaves a footprint behind you.", difficulty: "medium" },
  { question: "What gets wetter the more it dries?", answer: "a towel", accept: ["towel"], explanation: "A towel soaks up water as it dries you off.", difficulty: "easy" },
  { question: "I go up and down but never move from my spot. What am I?", answer: "a staircase", accept: ["stairs", "steps", "staircase"], explanation: "Stairs go up and down, but they stay right where they are built.", difficulty: "medium" },
  { question: "What has a neck but no head?", answer: "a bottle", accept: ["bottle"], explanation: "The narrow top of a bottle is called its neck.", difficulty: "easy" },
  { question: "I have lots of teeth but I never bite. What am I?", answer: "a comb", accept: ["comb", "zipper", "saw"], explanation: "A comb has a row of teeth for your hair.", difficulty: "easy" },
  { question: "What can you catch but never throw?", answer: "a cold", accept: ["cold", "the flu", "your breath"], explanation: "You can catch a cold, but you can't throw one back.", difficulty: "medium" },
  { question: "What has one eye but can't see?", answer: "a needle", accept: ["needle"], explanation: "The hole you thread at the top of a needle is called its eye.", difficulty: "medium" },
  { question: "What belongs to you, but other people say it more than you do?", answer: "your name", accept: ["name", "my name"], explanation: "Everyone else uses your name to talk to you.", difficulty: "hard" },
  { question: "What has words but never speaks?", answer: "a book", accept: ["book"], explanation: "A book is full of words, but it is quiet until you read it.", difficulty: "easy" },
  { question: "What runs all day but never gets tired?", answer: "a river", accept: ["river", "water", "a clock", "a refrigerator", "a fridge"], explanation: "A river keeps running from its source to the sea.", difficulty: "medium" },
  { question: "I'm full of holes but I still hold water. What am I?", answer: "a sponge", accept: ["sponge"], explanation: "A sponge's tiny holes soak up and hold water.", difficulty: "easy" },
];

/**
 * Give a household the two starter packs, so "quiz us" and "riddles" work
 * from the first game. Every new family gets them.
 */
export async function addStarterPacks(repo: Repo, hh: string): Promise<void> {
  const trivia = await repo.createPack(hh, { packId: "starter-trivia", title: "Starter Trivia", topic: "general knowledge", kind: "trivia", status: "building" });
  await repo.addPackQuestions(hh, trivia.packId, TRIVIA_PACK, { finish: true, announce: false });
  const riddles = await repo.createPack(hh, { packId: "starter-riddles", title: "Starter Riddles", topic: "riddles", kind: "riddle", status: "building" });
  await repo.addPackQuestions(hh, riddles.packId, RIDDLE_PACK, { finish: true, announce: false });
}

/** The show title a family gets when they start by voice, before naming it. */
export const DEFAULT_SHOW_TITLE = "Family Trivia Night";

/** A new family: the household, then the starter packs. */
export async function createFamily(repo: Repo, input: Parameters<Repo["createHousehold"]>[0]): Promise<string> {
  const hh = await repo.createHousehold(input);
  await addStarterPacks(repo, hh);
  return hh;
}

const DEMO_FAMILY = {
  showTitle: "The Jones Family Trivia Night",
  timeZone: "America/New_York",
  resetSchedule: "weekly" as const,
  players: [
    { playerId: "mom", name: "Mom", role: "parent" as const, balance: 6, lifetime: 11, streak: 1 },
    { playerId: "dad", name: "Dad", role: "parent" as const, balance: 4, lifetime: 9 },
    { playerId: "sally", name: "Sally", role: "kid" as const, gradeBand: "3-5" as const, balance: 3, lifetime: 6, streak: 1 },
    { playerId: "john", name: "John", role: "kid" as const, gradeBand: "6-8" as const, balance: 5, lifetime: 8 },
  ],
};

/**
 * Create the demo household if it doesn't exist. Safe to call repeatedly.
 * With `history`, the family is made two weeks ago and plays its way to today
 * (see playDemoHistory), so the parent page has points and questions to show.
 */
export async function seedDemo(repo: Repo, opts: { householdId?: string; devToken?: string; history?: boolean } = {}): Promise<string> {
  const hh = opts.householdId ?? DEMO_HOUSEHOLD_ID;
  if (await repo.db.get({ PK: `HH#${hh}`, SK: "META" })) {
    // The family is already there, but a deploy may bring a new token for it.
    if (opts.devToken && (await repo.householdForToken(opts.devToken)) !== hh) await repo.addDevToken(opts.devToken, hh);
    return hh;
  }
  if (opts.history) {
    await playDemoHistory(repo, hh);
  } else {
    await repo.createHousehold({ householdId: hh, ...DEMO_FAMILY });
    await addStarterPacks(repo, hh);
    await repo.setPhrase(hh, DEMO_PARENT_PHRASE, "spend");
  }
  if (opts.devToken) await repo.addDevToken(opts.devToken, hh);
  return hh;
}

// ---------------------------------------------------------------------------
// Keeping the shared demo family clean
// ---------------------------------------------------------------------------

/** The demo family goes back to how it was seeded after this long with no requests. */
export const DEMO_IDLE_MS = 10 * 60_000;
/** Or after this long since it last went back, at the first pause between games. */
export const DEMO_MAX_AGE_MS = 60 * 60_000;
const DEMO_PAUSE_MS = 2 * 60_000;

/**
 * Anyone can play the demo family, so anything a visitor adds (a rude name,
 * a renamed show, a theme) would otherwise stay for everyone after them. Call
 * this before each request for the demo household: once the family has sat
 * idle, it is wiped and seeded again. The marker lives outside the family's
 * partition so the wipe doesn't take it, and claiming the restore is
 * conditional so two requests at once don't both do it.
 */
export async function restoreDemoWhenIdle(
  repo: Repo,
  opts: { householdId?: string; history?: boolean; now?: number } = {},
): Promise<boolean> {
  const hh = opts.householdId ?? DEMO_HOUSEHOLD_ID;
  const now = opts.now ?? Date.now();
  const key = { PK: `DEMO#${hh}`, SK: "STATE" };
  const mark = await repo.db.get(key);
  const touchedAt = mark?.touchedAt as number | undefined;
  const restoredAt = (mark?.restoredAt as number | undefined) ?? now;
  if (touchedAt === undefined) {
    await repo.db.transact([{ kind: "put", item: { ...key, type: "demo", touchedAt: now, restoredAt: now } }]);
    return false;
  }
  const idle = now - touchedAt;
  const due = idle >= DEMO_IDLE_MS || (now - restoredAt >= DEMO_MAX_AGE_MS && idle >= DEMO_PAUSE_MS);
  if (!due) {
    // One write a minute is enough to know the family is in use.
    if (idle >= 60_000) await repo.db.transact([{ kind: "update", key, set: { touchedAt: now } }]);
    return false;
  }
  try {
    await repo.db.transact([
      { kind: "update", key, set: { touchedAt: now, restoredAt: now }, conditions: [{ attr: "touchedAt", op: "=", value: touchedAt }] },
    ]);
  } catch (err) {
    if (err instanceof ConditionFailedError) return false;
    throw err;
  }
  const items = await repo.db.query(`HH#${hh}`);
  for (let i = 0; i < items.length; i += 25) {
    await repo.db.transact(items.slice(i, i + 25).map((it): Write => ({ kind: "delete", key: { PK: it.PK, SK: it.SK } })));
  }
  await seedDemo(repo, { householdId: hh, history: opts.history });
  return true;
}

// ---------------------------------------------------------------------------
// Demo history
// ---------------------------------------------------------------------------

/** Wrong answers the family gives to each starter question. */
const WRONG: Record<string, [string, string]> = {
  "How many legs does a spider have?": ["six", "ten"],
  "What is the largest planet in our solar system?": ["Saturn", "the Sun"],
  "What gas do plants take in from the air to make their food?": ["oxygen", "air"],
  "How many sides does a hexagon have?": ["eight", "five"],
  "Which ocean is the biggest?": ["the Atlantic", "the Indian Ocean"],
  "What is frozen water called?": ["snow", "hail"],
  "What is the closest star to Earth?": ["the North Star", "the Moon"],
  "How many minutes are in two hours?": ["one hundred", "two hundred"],
  "Which animal is the tallest in the world?": ["the elephant", "the ostrich"],
  "What do bees make from flower nectar?": ["wax", "pollen"],
  "What is the hardest natural material on Earth?": ["gold", "steel"],
  "How many continents are there?": ["six", "eight"],
  "What part of your body has the smallest bones?": ["the fingers", "the toes"],
  "Is a tomato a fruit or a vegetable, to a botanist?": ["a vegetable", "both"],
  "What is the boiling point of water in degrees Celsius at sea level?": ["two hundred twelve", "fifty"],
  "I have hands but I can't clap. What am I?": ["a statue", "a robot"],
  "The more of me you take, the more you leave behind. What am I?": ["cookies", "time"],
  "What gets wetter the more it dries?": ["a sponge", "rain"],
  "I go up and down but never move from my spot. What am I?": ["an elevator", "a yo-yo"],
  "What has a neck but no head?": ["a giraffe", "a guitar"],
  "I have lots of teeth but I never bite. What am I?": ["a shark", "a gear"],
  "What can you catch but never throw?": ["a ball", "a fish"],
  "What has one eye but can't see?": ["a pirate", "a potato"],
  "What belongs to you, but other people say it more than you do?": ["my toys", "my room"],
  "What has words but never speaks?": ["a sign", "a mime"],
  "What runs all day but never gets tired?": ["a dog", "a car"],
  "I'm full of holes but I still hold water. What am I?": ["a net", "a bucket"],
};

const V: Record<string, Verdict> = { c: "correct", p: "partial", w: "wrong" };
const ORDER = ["Mom", "Dad", "Sally", "John"];

/**
 * What the family did, oldest first. `day` counts from this week's Monday
 * (-7 is last Monday) and `at` is the local hour. Rounds give verdicts in
 * ORDER: "cwcc" is Mom right, Dad wrong, Sally and John right.
 */
type Step = { day: number; at: number } & (
  | { round: RoundMode; v: string; stake?: Stake; question?: string; answer?: string; guesses?: string[] }
  | { spend: { player: string; amount: number; reason: string } }
  | { give: { from: string; to: string; amount: number; reason: string; chore?: string } }
  | { choreDone: string }
);
const HISTORY: Step[] = [
  { day: -7, at: 19, round: "hosted", v: "ccwc" },
  { day: -7, at: 19.1, round: "riddle", v: "cwcc" },
  { day: -5, at: 19, round: "hosted", v: "wwwc", stake: { type: "pick", label: "pick Friday's movie" } },
  { day: -5, at: 19.1, round: "riddle", v: "cccw" },
  {
    day: -4,
    at: 18.5,
    round: "family",
    v: "cwcc",
    stake: { type: "chore", label: "load the dishwasher" },
    question: "What was the name of our first goldfish?",
    answer: "Bubbles",
    guesses: ["Bubbles", "Goldie", "Bubbles", "Bubbles"],
  },
  { day: -3, at: 9, choreDone: "load the dishwasher" },
  { day: -3, at: 15, spend: { player: "Sally", amount: 2, reason: "fifteen extra minutes of tablet time" } },
  { day: -2, at: 18.5, round: "hosted", v: "cccc" },
  { day: -2, at: 18.6, round: "riddle", v: "wccc" },
  { day: 0, at: 19, round: "hosted", v: "cwcc" },
  { day: 0, at: 19.1, round: "hosted", v: "cccw", stake: { type: "chore", label: "take out the recycling" } },
  { day: 1, at: 19, round: "riddle", v: "ccwc" },
  { day: 1, at: 20, give: { from: "John", to: "Sally", amount: 1, reason: "taking the recycling", chore: "take out the recycling" } },
  { day: 2, at: 19, round: "hosted", v: "cccw" },
  {
    day: 2,
    at: 19.1,
    round: "family",
    v: "wwcw",
    stake: { type: "pick", label: "choose Saturday's breakfast" },
    question: "Where did we go camping last summer?",
    answer: "Lake George",
    guesses: ["the Adirondacks", "Lake Placid", "Lake George", "the beach"],
  },
];

/**
 * Make the demo family two weeks ago and replay HISTORY through the real
 * game code, with the clock set back for each step. The weekly reset happens
 * on the way, the way it would for a real family. Steps that would land after
 * now are squeezed into the part of this week that has passed.
 */
async function playDemoHistory(repo: Repo, hh: string): Promise<void> {
  const now = Date.now();
  const monday = Date.parse(`${periodStartFor(new Date(now), "weekly", DEMO_FAMILY.timeZone)}T00:00:00Z`);
  // Local evening hours, roughly: New York is four or five hours behind UTC.
  const time = (s: Step) => monday + s.day * 86_400_000 + (s.at + 4) * 3_600_000;
  const last = Math.max(...HISTORY.map(time));
  const weekStart = monday + 4 * 3_600_000;
  const squeeze = last < now ? 1 : (now - 10 * 60_000 - weekStart) / (last - weekStart);
  const when = (s: Step) => (time(s) < weekStart ? time(s) : weekStart + (time(s) - weekStart) * squeeze);

  let clock = new Date(monday - 7 * 86_400_000 + 21 * 3_600_000);
  const past = new Repo(repo.db, () => clock);
  await past.createHousehold({
    householdId: hh,
    ...DEMO_FAMILY,
    players: DEMO_FAMILY.players.map(({ balance: _b, lifetime: _l, streak: _s, ...p }) => p),
  });
  await addStarterPacks(past, hh);
  await past.setPhrase(hh, DEMO_PARENT_PHRASE, "spend");

  for (const step of HISTORY) {
    clock = new Date(when(step));
    const state = await past.begin(hh);
    if ("spend" in step) {
      await past.spendPoints(hh, state, { ...step.spend, parentPhrase: DEMO_PARENT_PHRASE });
    } else if ("give" in step) {
      await past.transferPoints(hh, state, step.give);
    } else if ("choreDone" in step) {
      await past.completeChore(hh, state, { label: step.choreDone });
    } else {
      const started = await past.startRound(hh, state, { mode: step.round, stake: step.stake });
      const question = started.question ?? step.question!;
      const answer = started.answerKey?.answer ?? step.answer!;
      const wrong = WRONG[question] ?? ["I don't know", "pass"];
      let misses = 0;
      const guesses = ORDER.map((player, i) => {
        const verdict = V[step.v[i]!]!;
        const guess = step.guesses?.[i] ?? (verdict === "correct" ? answer : wrong[misses++ % 2]!);
        return { player, guess, verdict };
      });
      clock = new Date(clock.getTime() + 2 * 60_000);
      await past.recordRound(hh, await past.load(hh), { roundId: started.roundId, question, correctAnswer: answer, guesses });
    }
  }
}
