/**
 * spend_points — "Sally spends 3 points to pick the movie" (R5.2, R5.3, R13.2, R13.3).
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ok, plural, withHousehold } from "./shared.js";

export const parentPhraseSchema = z
  .string()
  .max(200)
  .optional()
  .describe("The parent phrase exactly as a parent said it. Never repeat it out loud.");

export function registerSpendPoints(server: McpServer): void {
  server.registerTool(
    "spend_points",
    {
      title: "Spend points",
      description:
        "Spend a player's points on something: 'Sally spends 3 points to pick the movie', 'I'll use 5 points for no dishes'. " +
        "If the result says a parent phrase is needed, ask a parent to say it, then call again with parentPhrase. " +
        "Never say the phrase back.",
      inputSchema: z.object({
        player: z.string().describe("Who is spending"),
        amount: z.number().int().positive(),
        reason: z.string().max(120).describe("What it's for, like 'pick the movie'"),
        parentPhrase: parentPhraseSchema,
      }),
    },
    async (input) =>
      withHousehold(async ({ repo, hh, state }) => {
        const r = await repo.spendPoints(hh, state, input);
        return ok(r, `${r.player} spent ${plural(r.spent, "point")} to ${r.reason}. ${r.player} has ${plural(r.balance, "point")} left.`);
      }),
  );
}
