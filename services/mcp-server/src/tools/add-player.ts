/**
 * add_player — "Add Grandma to the game" (R2.2, R2.4).
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { GRADE_BANDS, listNames } from "@hey-trivi/core";
import { z } from "zod";
import { ok, withHousehold } from "./shared.js";

export function registerAddPlayer(server: McpServer): void {
  server.registerTool(
    "add_player",
    {
      title: "Add a player",
      description:
        "Add someone to the family game, like 'add Grandma to the game' or 'Leo wants to play'. " +
        "Use a first name only. Role is parent for grown-ups and kid for children. A grade band is optional for kids.",
      inputSchema: z.object({
        name: z.string().min(1).max(20).describe("First name only, as the family says it"),
        role: z.enum(["parent", "kid"]),
        gradeBand: z.enum(GRADE_BANDS).optional().describe("School grade band for kids: K-2, 3-5, 6-8, or 9-12"),
      }),
    },
    async ({ name, role, gradeBand }) =>
      withHousehold(async ({ repo, hh, state }) => {
        const players = await repo.addPlayer(hh, state, { name, role, gradeBand });
        const added = players.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())!;
        return ok(
          {
            added: added.name,
            players: players.map((p) => ({ name: p.name, role: p.role, balance: p.balance, lifetime: p.lifetime })),
          },
          `${added.name} is in the game. Players: ${listNames(players.map((p) => p.name))}.`,
        );
      }),
  );
}
