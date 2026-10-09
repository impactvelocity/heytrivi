/**
 * Tool behaviour through a real MCP client (the official SDK client over
 * Streamable HTTP), against the in-memory store. Covers the key flows in
 * design.md. Local only: these change the demo family's data.
 */

import { serve } from "@hono/node-server";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { MemoryItemStore, Repo, seedDemo } from "@hey-trivi/store";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { setRepo } from "../context.js";

let server: { close: () => void };
let client: Client;

type Result = { isError?: boolean; structuredContent?: Record<string, any>; content: Array<{ type: string; text?: string }>; _meta?: any };

async function call(name: string, args: Record<string, unknown> = {}): Promise<Result> {
  return (await client.callTool({ name, arguments: args })) as Result;
}
const text = (r: Result) => r.content.find((c) => c.type === "text")!.text!;

beforeAll(async () => {
  const repo = new Repo(new MemoryItemStore());
  await seedDemo(repo, { devToken: "dev-token-demo" });
  setRepo(repo);
  const port = await new Promise<number>((resolve) => {
    server = serve({ fetch: createApp().fetch, port: 0 }, (info) => resolve(info.port)) as unknown as { close: () => void };
  });
  client = new Client({ name: "hey-trivi-test", version: "0.0.1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`), {
      requestInit: { headers: { Authorization: "Bearer dev-token-demo" } },
    }),
  );
});

afterAll(async () => {
  await client?.close();
  server?.close();
});

describe("flows over MCP", () => {
  it("get_household returns the family", async () => {
    const r = await call("get_household");
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent!.players.map((p: any) => p.name)).toEqual(["Dad", "John", "Mom", "Sally"]);
    expect(r.structuredContent!.parentPhraseRequiredFor).toBe("spend");
    expect(JSON.stringify(r)).not.toMatch(/purple|phraseHash|phraseSalt/);
  });

  it("one-breath round: record_round with verdicts, scoreboard UI", async () => {
    const r = await call("record_round", {
      question: "Can you look at the sun through sunglasses?",
      correctAnswer: "No, never",
      explanation: "Sunglasses don't block enough light to make it safe.",
      guesses: [
        { player: "Mom", guess: "no, never", verdict: "correct" },
        { player: "Dad", guess: "only when you're upside down", verdict: "wrong" },
        { player: "Sally", guess: "yes", verdict: "wrong" },
        { player: "John", guess: "yes", verdict: "wrong" },
      ],
      idempotencyKey: "sun-1",
    });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toBe("Mom gets 1 point. Mom leads with 7.");
    expect(r._meta?.ui?.resourceUri).toBe("ui://hey-trivi/scoreboard");
    expect(r.structuredContent!.scoreboard.players[0]).toMatchObject({ name: "Mom", balance: 7 });
  });

  it("chore with tiebreak", async () => {
    const start = await call("start_round", { mode: "hosted", stake: { type: "chore", label: "take out the garbage" } });
    expect(start.structuredContent!.answerKey.hostNote).toMatch(/do not reveal/);
    const r1 = await call("record_round", {
      roundId: start.structuredContent!.roundId,
      guesses: [
        { player: "Mom", guess: "a", verdict: "correct" },
        { player: "Dad", guess: "b", verdict: "wrong" },
        { player: "Sally", guess: "a", verdict: "correct" },
        { player: "John", guess: "b", verdict: "wrong" },
      ],
    });
    expect(r1.structuredContent!.outcome).toMatchObject({ type: "tiebreak_needed", tied: ["Dad", "John"] });
    const tb = await call("start_round", { mode: "hosted", tiebreakOf: r1.structuredContent!.roundId, players: ["Dad", "John"] });
    expect(tb.structuredContent!.stake).toEqual({ type: "chore", label: "take out the garbage" });
    const r2 = await call("record_round", {
      roundId: tb.structuredContent!.roundId,
      guesses: [
        { player: "Dad", guess: "a", verdict: "correct" },
        { player: "John", guess: "b", verdict: "wrong" },
      ],
    });
    expect(r2.structuredContent!.outcome).toMatchObject({ type: "settled", loser: "John" });
    expect(text(r2)).toContain("John has to take out the garbage.");
  });

  it("next session remembers scores and the open chore", async () => {
    const r = await call("get_household");
    expect(r.structuredContent!.openChores).toEqual([expect.objectContaining({ label: "take out the garbage", owedBy: "John" })]);
    expect(text(r)).toContain("John has to take out the garbage");
  });

  it("trade with a chore, then a protected spend", async () => {
    const t = await call("transfer_points", { from: "John", to: "Sally", amount: 3, reason: "take the garbage for me", chore: "garbage" });
    expect(t.isError).toBeFalsy();
    expect(text(t)).toBe("John gave Sally 3 points. Sally now has to take out the garbage. John has 2, Sally has 7.");

    const noPhrase = await call("spend_points", { player: "Sally", amount: 3, reason: "pick the movie" });
    expect(noPhrase.isError).toBe(true);
    expect(text(noPhrase)).toBe("That needs the parent phrase. Ask a parent to say it.");

    const wrong = await call("spend_points", { player: "Sally", amount: 3, reason: "pick the movie", parentPhrase: "purple waffles" });
    expect(wrong.isError).toBe(true);
    expect(text(wrong)).toBe("That needs the parent phrase. Ask a parent to say it.");

    const spent = await call("spend_points", { player: "Sally", amount: 3, reason: "pick the movie", parentPhrase: "Purple pancakes." });
    expect(spent.isError).toBeFalsy();
    expect(text(spent)).toBe("Sally spent 3 points to pick the movie. Sally has 4 points left.");
    expect(JSON.stringify(spent)).not.toMatch(/purple/i);
  });

  it("errors a person can fix come back as isError with a sayable message", async () => {
    const r = await call("spend_points", { player: "Grandpa", amount: 1, reason: "x" });
    expect(r.isError).toBe(true);
    expect(text(r)).toBe("I don't know anyone called Grandpa. The players are Dad, John, Mom, and Sally.");
  });

  it("add_player, complete_chore, list_packs, show_scoreboard", async () => {
    expect(text(await call("add_player", { name: "Grandma", role: "parent" }))).toBe("Grandma is in the game. Players: Dad, Grandma, John, Mom, and Sally.");
    expect(text(await call("complete_chore", { player: "Sally", chore: "garbage" }))).toBe("Done: Sally took care of the chore, take out the garbage. No chores are owed.");
    const packs = await call("list_packs");
    expect(packs.structuredContent!.packs.map((p: any) => p.title).sort()).toEqual(["Starter Riddles", "Starter Trivia"]);
    const sb = await call("show_scoreboard");
    expect(sb.structuredContent!.scoreboard.players.map((p: any) => p.name)).toContain("Grandma");
  });
});
