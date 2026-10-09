/**
 * record_round — after the guesses are in. "Mom says... Dad says..."
 * (R3.1, R3.4, R3.5, R4.1 to R4.3, R8.1)
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { listNames } from "@hey-trivi/core";
import { z } from "zod";
import { SCOREBOARD_TOOL_META, ok, plural, withHousehold } from "./shared.js";
import { stakeSchema } from "./start-round.js";

export function registerRecordRound(server: McpServer): void {
  server.registerTool(
    "record_round",
    {
      title: "Record the answers",
      description:
        "Record a finished round once everyone has answered: 'Mom says no, Dad says yes, Sally says yes'. " +
        "You decide each verdict: correct, partial (close but not quite), or wrong. " +
        "For a question the family asked themselves, pass question and correctAnswer. For a round from start_round, pass its roundId. " +
        "Returns points awarded, the scoreboard, and the outcome: none, settled (who owes the chore or wins the pick), " +
        "or tiebreak_needed (call start_round with tiebreakOf and the tied players). " +
        "Use a fresh idempotencyKey per round so a retry never double-counts.",
      inputSchema: z.object({
        roundId: z.string().optional().describe("The roundId from start_round, if you asked the question"),
        question: z.string().max(400).optional().describe("The question, in a sentence"),
        correctAnswer: z.string().max(200).optional().describe("The right answer"),
        explanation: z.string().max(300).optional().describe("One sentence on why"),
        guesses: z
          .array(
            z.object({
              player: z.string().describe("First name"),
              guess: z.string().max(200).describe("What they said"),
              verdict: z.enum(["correct", "partial", "wrong"]),
            }),
          )
          .min(1),
        stake: stakeSchema.optional(),
        idempotencyKey: z.string().max(80).optional(),
      }),
      _meta: SCOREBOARD_TOOL_META,
    },
    async (input) =>
      withHousehold(async ({ repo, hh, state }) => {
        const r = await repo.recordRound(hh, state, input);
        const winners = r.results.filter((x) => x.points > 0);
        const partials = r.results.filter((x) => x.verdict === "partial").map((x) => x.player);
        const leader = r.scoreboard.players[0];
        const parts = [
          winners.length
            ? winners.map((w) => `${w.player} gets ${plural(w.points, "point")}.`).join(" ")
            : "Nobody scores this time.",
          partials.length ? `${listNames(partials)} ${partials.length === 1 ? "was" : "were"} close.` : "",
          leader ? `${leader.name} leads with ${leader.balance}.` : "",
        ];
        const o = r.outcome;
        if (o.type === "settled" && o.stake === "chore") parts.push(`${o.loser} has to ${o.label}.`);
        if (o.type === "settled" && o.stake === "pick") parts.push(`${o.winner} gets to ${o.label}.`);
        if (o.type === "tiebreak_needed") {
          parts.push(`Tie between ${listNames(o.tied)}. Call start_round with tiebreakOf ${r.roundId} for a tiebreak.`);
        }
        return ok({ ...r }, parts.filter(Boolean).join(" "), { scoreboard: true });
      }),
  );
}
