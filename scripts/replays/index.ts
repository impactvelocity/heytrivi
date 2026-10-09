/**
 * Replay scripts (R10.8).
 *
 * Each script is a list of steps. A step is either a line someone says, or a
 * "new session" press. With a real model the simulator just feeds the lines
 * in order. With MOCK_MODEL=1 there is no model: each line carries the host's
 * turn as written below (the tool calls to make and what to say), so the
 * whole simulator runs with no AWS account. The tool calls still go to the
 * real MCP server.
 *
 * Templates in `args` and `say`:
 *   {{tool.path.to.field}}  a field of the latest structuredContent from that tool
 *   {{tool#text}}           the text content of the latest result from that tool
 *   {{uuid}}                a fresh id (for idempotency keys)
 */

export interface MockCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ReplayLine {
  /** Who is talking, shown in the conversation panel. */
  speaker?: string;
  user: string;
  mock: { calls: MockCall[]; say: string };
}

export type ReplayStep = ReplayLine | { newSession: true };

export interface ReplayScript {
  id: string;
  title: string;
  description: string;
  steps: ReplayStep[];
}

const uuid = "{{uuid}}";

export const REPLAYS: ReplayScript[] = [
  {
    id: "one-breath",
    title: "One-breath round",
    description: "The family asks, answers, and gets a verdict in one breath. The scoreboard appears.",
    steps: [
      {
        user: "Hey Trivi, the question is: can you look at the sun through sunglasses? Mom says no, never. Dad says only when you're upside down. Sally says yes. John says yes.",
        mock: {
          calls: [
            { name: "get_household", args: {} },
            {
              name: "record_round",
              args: {
                question: "Can you look at the sun through sunglasses?",
                correctAnswer: "No, never",
                explanation: "Sunglasses don't block enough light to make it safe.",
                guesses: [
                  { player: "Mom", guess: "no, never", verdict: "correct" },
                  { player: "Dad", guess: "only when you're upside down", verdict: "wrong" },
                  { player: "Sally", guess: "yes", verdict: "wrong" },
                  { player: "John", guess: "yes", verdict: "wrong" },
                ],
                idempotencyKey: uuid,
              },
            },
          ],
          say: "Mom's right, and it isn't close. Sunglasses don't block enough light to make it safe. {{record_round#text}}",
        },
      },
      {
        user: "Show the scores.",
        mock: { calls: [{ name: "show_scoreboard", args: {} }], say: "Here you go. {{show_scoreboard#text}}" },
      },
    ],
  },
  {
    id: "chore-tiebreak",
    title: "Chore with a tiebreak",
    description: "A round for the garbage ends in a tie, and a tiebreak settles who owes it.",
    steps: [
      {
        user: "Let's play Hey Trivi for the garbage. How many legs does a spider have? Mom says eight. Dad says six. Sally says eight. John says ten.",
        mock: {
          calls: [
            { name: "get_household", args: {} },
            {
              name: "record_round",
              args: {
                question: "How many legs does a spider have?",
                correctAnswer: "eight",
                explanation: "Spiders are arachnids, and every arachnid has eight legs.",
                stake: { type: "chore", label: "take out the garbage" },
                guesses: [
                  { player: "Mom", guess: "eight", verdict: "correct" },
                  { player: "Dad", guess: "six", verdict: "wrong" },
                  { player: "Sally", guess: "eight", verdict: "correct" },
                  { player: "John", guess: "ten", verdict: "wrong" },
                ],
                idempotencyKey: uuid,
              },
            },
            { name: "start_round", args: { mode: "family", tiebreakOf: "{{record_round.roundId}}" } },
          ],
          say: "Eight is right, so Mom and Sally are safe. Dad and John are tied for the garbage. Tiebreak time: give me a question for Dad and John.",
        },
      },
      {
        user: "What do bees make from flower nectar? Dad says honey. John says wax.",
        mock: {
          calls: [
            {
              name: "record_round",
              args: {
                roundId: "{{start_round.roundId}}",
                question: "What do bees make from flower nectar?",
                correctAnswer: "honey",
                explanation: "Bees store nectar in the hive and fan it until it thickens into honey.",
                guesses: [
                  { player: "Dad", guess: "honey", verdict: "correct" },
                  { player: "John", guess: "wax", verdict: "wrong" },
                ],
                idempotencyKey: uuid,
              },
            },
          ],
          say: "Honey it is. Dad's off the hook. John, the garbage is yours. {{record_round#text}}",
        },
      },
    ],
  },
  {
    id: "next-day",
    title: "Next-day session",
    description: "A chore is settled, the session ends, and the host remembers it the next day.",
    steps: [
      {
        user: "Hey Trivi, for the dishes: what is frozen water called? Mom says ice. Dad says snow.",
        mock: {
          calls: [
            { name: "get_household", args: {} },
            {
              name: "record_round",
              args: {
                question: "What is frozen water called?",
                correctAnswer: "ice",
                stake: { type: "chore", label: "do the dishes" },
                guesses: [
                  { player: "Mom", guess: "ice", verdict: "correct" },
                  { player: "Dad", guess: "snow", verdict: "wrong" },
                ],
                idempotencyKey: uuid,
              },
            },
          ],
          say: "It's ice. Snow is frozen water too, but it's made of crystals, so I'll say no. Dad, you've got the dishes. {{record_round#text}}",
        },
      },
      { newSession: true },
      {
        user: "Hey Trivi, what's the score?",
        mock: {
          calls: [{ name: "get_household", args: {} }],
          say: "Welcome back. {{get_household#text}}",
        },
      },
    ],
  },
  {
    id: "trade-and-spend",
    title: "Points for a chore, then a protected spend",
    description: "John pays Sally to take the garbage, then Sally spends points after Mom says the parent phrase.",
    steps: [
      {
        user: "Hey Trivi, for the garbage: how many continents are there? John says five. Sally says seven.",
        mock: {
          calls: [
            { name: "get_household", args: {} },
            {
              name: "record_round",
              args: {
                question: "How many continents are there?",
                correctAnswer: "seven",
                stake: { type: "chore", label: "take out the garbage" },
                guesses: [
                  { player: "John", guess: "five", verdict: "wrong" },
                  { player: "Sally", guess: "seven", verdict: "correct" },
                ],
                idempotencyKey: uuid,
              },
            },
          ],
          say: "Seven is right. John, that's the garbage for you. {{record_round#text}}",
        },
      },
      {
        speaker: "John",
        user: "I'll give Sally 3 points to take the garbage for me.",
        mock: { calls: [], say: "Sally, John offers you three points to take the garbage for him. Do you agree?" },
      },
      {
        speaker: "Sally",
        user: "Yes, deal!",
        mock: {
          calls: [{ name: "transfer_points", args: { from: "John", to: "Sally", amount: 3, reason: "take the garbage for John", chore: "garbage" } }],
          say: "Deal done. {{transfer_points#text}}",
        },
      },
      {
        speaker: "Sally",
        user: "I want to spend 3 points to pick the movie.",
        mock: {
          calls: [{ name: "spend_points", args: { player: "Sally", amount: 3, reason: "pick the movie" } }],
          say: "Spending points needs a grown-up. Can a parent say the parent phrase?",
        },
      },
      {
        speaker: "Mom",
        user: "Purple pancakes.",
        mock: {
          calls: [{ name: "spend_points", args: { player: "Sally", amount: 3, reason: "pick the movie", parentPhrase: "Purple pancakes." } }],
          say: "Thanks. Sally, you pick the movie. {{spend_points#text}}",
        },
      },
    ],
  },
];

export function isNewSession(step: ReplayStep): step is { newSession: true } {
  return "newSession" in step;
}
