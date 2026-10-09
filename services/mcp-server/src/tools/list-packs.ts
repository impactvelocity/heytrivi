/**
 * list_packs — "What packs do we have?" (R6.1).
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ok, plural, withHousehold } from "./shared.js";

export function registerListPacks(server: McpServer): void {
  server.registerTool(
    "list_packs",
    {
      title: "List question packs",
      description: "List the family's question packs and how many questions are left: 'what packs do we have', 'is Sally's pack ready'.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      withHousehold(async ({ repo, state }) => {
        const packs = repo.packSummaries(state);
        const text = packs.length
          ? packs
              .map((p) =>
                p.status === "ready"
                  ? `${p.title}: ${plural(p.remaining, "question")} left.`
                  : p.status === "building"
                    ? `${p.title}: still being built.`
                    : `${p.title}: couldn't be built. ${p.failReason ?? ""}`.trim(),
              )
              .join(" ")
          : "No packs yet.";
        return ok({ packs }, text);
      }),
  );
}
