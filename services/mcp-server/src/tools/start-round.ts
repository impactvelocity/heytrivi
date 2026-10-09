/**
 * start_round — "Ask us one", "quiz us", "for the garbage", "riddles", tiebreaks.
 * (R3.2, R3.3, R4.4)
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { listNames } from "@hey-trivi/core";
import { z } from "zod";
import { ok, withHousehold } from "./shared.js";

export const stakeSchema = z
  .object({
    type: z.enum(["none", "chore", "pick"]).describe("chore: the loser owes it. pick: the winner gets it."),
    label: z.string().max(80).optional().describe("What's at stake in family words, like 'take out the garbage' or 'pick the movie'"),
  })
  .describe("What the round is for, if anything");

export function registerStartRound(server: McpServer): void {
  server.registerTool(
    "start_round",
    {
      title: "Ask the family a question",
      description:
        "Start a round where you ask the question: 'ask us one', 'quiz us', 'let's play for the garbage', 'riddles', " +
        "'play the fractions pack', or a tiebreak after record_round says tiebreak_needed. " +
        "Returns the question and an answer key. Ask the question out loud, never reveal the answer key before everyone has guessed. " +
        "If needsHostQuestion is true, make up a fair question yourself and pass it to record_round with the roundId. " +
        "Use mode 'family' with a stake when the family will ask their own question for a chore or a pick.",
      inputSchema: z.object({
        mode: z.enum(["hosted", "riddle", "family"]).default("hosted").describe("hosted: trivia from a pack. riddle: a riddle. family: the family asks"),
        pack: z.string().optional().describe("A pack title or id, if they asked for a specific pack"),
        stake: stakeSchema.optional(),
        players: z.array(z.string()).optional().describe("Only these players answer, for example the tied players in a tiebreak"),
        tiebreakOf: z.string().optional().describe("The roundId that ended in tiebreak_needed. The stake carries forward."),
      }),
    },
    async ({ mode, pack, stake, players, tiebreakOf }) =>
      withHousehold(async ({ repo, hh, state }) => {
        const r = await repo.startRound(hh, state, { mode, packId: pack, stake, players, tiebreakOf });
        const who = r.players.length < state.players.length ? ` Only ${listNames(r.players)} answer.` : "";
        const forWhat = r.stake ? ` This round is for ${r.stake.label ?? r.stake.type}.` : "";
        const text = r.needsHostQuestion
          ? `Round ${r.roundId} is open. No unused pack questions are left, so ask your own question and pass it to record_round.${forWhat}${who}`
          : `Ask: ${r.question}${forWhat}${who} (Answer key is in structured content. Don't say it until everyone has guessed.)`;
        return ok({ ...r }, text);
      }),
  );
}
