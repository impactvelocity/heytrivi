/**
 * complete_chore — "John took out the garbage" (R4.5).
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ok, withHousehold } from "./shared.js";

export function registerCompleteChore(server: McpServer): void {
  server.registerTool(
    "complete_chore",
    {
      title: "Mark a chore done",
      description:
        "Mark a chore as done when someone says 'John took out the garbage' or 'Dad did the dishes'. " +
        "Pass the player and the chore in their words, or the choreId.",
      inputSchema: z.object({
        choreId: z.string().optional(),
        player: z.string().optional().describe("Who did it"),
        chore: z.string().max(80).optional().describe("The chore in family words, like 'garbage'"),
      }),
    },
    async ({ choreId, player, chore }) =>
      withHousehold(async ({ repo, hh, state }) => {
        const r = await repo.completeChore(hh, state, { choreId, player, label: chore });
        const name = (id: string) => state.players.find((p) => p.playerId === id)?.name ?? id;
        const openChores = r.openChores.map((c) => ({ choreId: c.choreId, label: c.label, owedBy: name(c.owedBy) }));
        return ok(
          { done: { choreId: r.done.choreId, label: r.done.label, by: name(r.done.owedBy) }, openChores },
          `Done: ${name(r.done.owedBy)} took care of the chore, ${r.done.label}. ` +
            (openChores.length ? `Still to do: ${openChores.map((c) => `${c.owedBy} has to ${c.label}`).join("; ")}.` : "No chores are owed."),
        );
      }),
  );
}
