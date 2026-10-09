/**
 * transfer_points — "I'll give Sally 3 points", "I'll pay John 2 points to take
 * the garbage for me" (R5.5 to R5.7).
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ok, plural, withHousehold } from "./shared.js";
import { parentPhraseSchema } from "./spend-points.js";

export function registerTransferPoints(server: McpServer): void {
  server.registerTool(
    "transfer_points",
    {
      title: "Give or trade points",
      description:
        "Move points from one player to another, as a gift or a deal: 'I'll give Sally 3 points', " +
        "'I'll pay John 2 points to take the garbage for me'. For a deal, first ask the receiving player to agree out loud, " +
        "and only call this after they say yes. Pass the chore to hand it over in the same step. " +
        "If the result says a parent phrase is needed, ask a parent to say it and call again with parentPhrase.",
      inputSchema: z.object({
        from: z.string().describe("Who gives the points"),
        to: z.string().describe("Who gets the points"),
        amount: z.number().int().positive(),
        reason: z.string().max(120).describe("Why, like 'gift' or 'taking the garbage for me'"),
        chore: z.string().max(80).optional().describe("A chore the giver owes that moves to the receiver, like 'garbage'"),
        parentPhrase: parentPhraseSchema,
      }),
    },
    async (input) =>
      withHousehold(async ({ repo, hh, state }) => {
        const r = await repo.transferPoints(hh, state, input);
        const text =
          `${r.from.name} gave ${r.to.name} ${plural(r.amount, "point")}.` +
          (r.chore ? ` ${r.to.name} now has to ${r.chore.label}.` : "") +
          ` ${r.from.name} has ${r.from.balance}, ${r.to.name} has ${r.to.balance}.`;
        return ok({ ...r }, text);
      }),
  );
}
