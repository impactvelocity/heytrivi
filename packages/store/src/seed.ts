/**
 * Demo family seed: Mom, Dad, Sally, and John, one trivia pack and one riddle
 * pack of original questions, and the demo parent phrase.
 *
 * The demo parent phrase is "purple pancakes". It is documented in the README
 * so judges can try a protected spend. Change it on the parent page.
 */

import type { Repo } from "./repo.js";
import type { Difficulty } from "./types.js";

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

/** Create the demo household if it doesn't exist. Safe to call repeatedly. */
export async function seedDemo(repo: Repo, opts: { householdId?: string; devToken?: string } = {}): Promise<string> {
  const hh = opts.householdId ?? DEMO_HOUSEHOLD_ID;
  if (await repo.db.get({ PK: `HH#${hh}`, SK: "META" })) return hh;
  await repo.createHousehold({
    householdId: hh,
    showTitle: "The Jones Family Trivia Night",
    timeZone: "America/New_York",
    resetSchedule: "weekly",
    players: [
      { playerId: "mom", name: "Mom", role: "parent", balance: 6, lifetime: 11, streak: 1 },
      { playerId: "dad", name: "Dad", role: "parent", balance: 4, lifetime: 9 },
      { playerId: "sally", name: "Sally", role: "kid", gradeBand: "3-5", balance: 3, lifetime: 6, streak: 1 },
      { playerId: "john", name: "John", role: "kid", gradeBand: "6-8", balance: 5, lifetime: 8 },
    ],
  });
  const trivia = await repo.createPack(hh, { packId: "starter-trivia", title: "Starter Trivia", topic: "general knowledge", kind: "trivia", status: "building" });
  await repo.addPackQuestions(hh, trivia.packId, TRIVIA_PACK, { finish: true, announce: false });
  const riddles = await repo.createPack(hh, { packId: "starter-riddles", title: "Starter Riddles", topic: "riddles", kind: "riddle", status: "building" });
  await repo.addPackQuestions(hh, riddles.packId, RIDDLE_PACK, { finish: true, announce: false });
  await repo.setPhrase(hh, DEMO_PARENT_PHRASE, "spend");
  if (opts.devToken) await repo.addDevToken(opts.devToken, hh);
  return hh;
}
