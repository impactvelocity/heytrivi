/**
 * show_scoreboard — "Show the scores" (R8.1).
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { SCOREBOARD_TOOL_META, ok, withHousehold } from "./shared.js";

export function registerShowScoreboard(server: McpServer): void {
  server.registerTool(
    "show_scoreboard",
    {
      title: "Show the scoreboard",
      description: "Show the family scoreboard on the screen: 'show the scores', 'put the scoreboard up', 'who's winning'.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
      _meta: SCOREBOARD_TOOL_META,
    },
    async () =>
      withHousehold(async ({ repo, state }) => {
        const sb = repo.scoreboard(state);
        const text =
          `${sb.showTitle}: ` +
          sb.players.map((p) => `${p.name} ${p.balance}`).join(", ") +
          "." +
          (sb.openChores.length ? ` Chores: ${sb.openChores.map((c) => `${c.owedBy} has to ${c.label}`).join("; ")}.` : "");
        return ok({ scoreboard: sb }, text, { scoreboard: true });
      }),
  );
}
