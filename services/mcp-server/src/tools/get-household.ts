/**
 * get_household — "Let's play Hey Trivi", "What's the score?"
 *
 * Called at the start of every session. Returns players, scores, open chores,
 * the open round if any, ready packs, and unseen news (R2.1). News is marked
 * seen once returned, so the host announces it once.
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ok, withHousehold } from "./shared.js";

export function registerGetHousehold(server: McpServer): void {
  server.registerTool(
    "get_household",
    {
      title: "Get the family game",
      description:
        "Load the family's game: players, scores, chores owed, any question still open, question packs, and news to announce. " +
        "Call this first in every conversation, whenever someone says 'let's play Hey Trivi', 'what's the score', " +
        "'who owes the garbage', or asks you to settle something with a question.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async () =>
      withHousehold(async ({ repo, hh, state }) => {
        const name = (id: string) => state.players.find((p) => p.playerId === id)?.name ?? id;
        const open = state.meta.openRound;
        const structured = {
          showTitle: state.meta.showTitle,
          players: state.players.map((p) => ({
            name: p.name,
            role: p.role,
            ...(p.gradeBand ? { gradeBand: p.gradeBand } : {}),
            balance: p.balance,
            lifetime: p.lifetime,
            streak: p.streak,
          })),
          openChores: state.chores.map((c) => ({ choreId: c.choreId, label: c.label, owedBy: name(c.owedBy) })),
          openRound: open
            ? {
                roundId: open.roundId,
                mode: open.mode,
                stake: open.stake ?? null,
                players: open.playerIds?.map(name) ?? null,
                tiebreakOf: open.tiebreakOf ?? null,
                question: open.question ?? null,
                answerKey: open.question
                  ? {
                      answer: open.correctAnswer,
                      accept: open.accept ?? [],
                      explanation: open.explanation ?? "",
                      hostNote: "do not reveal before guesses are recorded",
                    }
                  : null,
              }
            : null,
          packs: repo.packSummaries(state).filter((p) => p.status === "ready"),
          news: state.news.map((n) => n.text),
          pointSettings: state.meta.pointSettings,
          parentPhraseRequiredFor: state.meta.phraseHash ? (state.meta.phraseRequiredFor ?? "spend") : "nothing",
          resetSchedule: state.meta.resetSchedule,
        };
        await repo.markNewsSeen(hh, state.news);

        const ranked = [...state.players].sort((a, b) => b.balance - a.balance);
        const parts = [
          `${state.meta.showTitle}.`,
          `Scores: ${ranked.map((p) => `${p.name} ${p.balance}`).join(", ")}.`,
          state.chores.length
            ? `Chores: ${state.chores.map((c) => `${name(c.owedBy)} has to ${c.label}`).join("; ")}.`
            : "No chores owed.",
          open ? `A question is still open${open.question ? `: ${open.question}` : ""}.` : "",
          state.news.length ? `News to announce: ${state.news.map((n) => n.text).join(" ")}` : "",
        ];
        return ok(structured, parts.filter(Boolean).join(" "));
      }),
  );
}
