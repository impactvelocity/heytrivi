import { describe, expect, it } from "vitest";
import { REPLAYS, isNewSession, type ReplayLine } from "@hey-trivi/replays";
import { Host } from "../host";
import type { LoggedMcpClient, ToolResult } from "../mcp";

/** A stand-in MCP client that records calls and returns canned results. */
function fakeMcp(results: Record<string, ToolResult>) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const mcp = {
    secrets: new Set<string>(),
    tools: [],
    async callTool(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      if (typeof args.parentPhrase === "string") mcp.secrets.add(args.parentPhrase);
      return results[name] ?? { content: [{ type: "text", text: `${name} ok` }], structuredContent: {} };
    },
  };
  return { mcp: mcp as unknown as LoggedMcpClient, calls };
}

describe("mock host turns", () => {
  it("fills templates from earlier tool results", async () => {
    const { mcp, calls } = fakeMcp({
      record_round: { content: [{ type: "text", text: "Mom gets 1 point." }], structuredContent: { roundId: "r_123" } },
      start_round: { content: [{ type: "text", text: "open" }], structuredContent: { roundId: "r_456" } },
    });
    const host = new Host(mcp);
    const script = REPLAYS.find((r) => r.id === "chore-tiebreak")!;
    const lines = script.steps.filter((s): s is ReplayLine => !isNewSession(s));
    const say1 = await host.mockTurn(lines[0]!.mock);
    expect(say1).toContain("Dad and John are tied");
    expect(calls[2]).toEqual({ name: "start_round", args: { mode: "family", tiebreakOf: "r_123" } });
    const idem = calls[1]!.args.idempotencyKey as string;
    expect(idem).toMatch(/^[0-9a-f-]{36}$/);

    const say2 = await host.mockTurn(lines[1]!.mock);
    expect(calls[3]!.args.roundId).toBe("r_456");
    expect(say2).toBe("Honey it is. Dad's off the hook. John, the garbage is yours. Mom gets 1 point.");
  });

  it("never says the parent phrase back", async () => {
    const { mcp } = fakeMcp({});
    const host = new Host(mcp);
    const say = await host.mockTurn({ calls: [{ name: "spend_points", args: { parentPhrase: "purple pancakes" } }], say: "You said purple pancakes!" });
    expect(say).not.toMatch(/purple/i);
  });

  it("every replay script has lines with a mock turn", () => {
    expect(REPLAYS.map((r) => r.id)).toEqual(["one-breath", "chore-tiebreak", "next-day", "trade-and-spend"]);
    for (const r of REPLAYS) for (const s of r.steps) if (!isNewSession(s)) expect(s.mock.say.length).toBeGreaterThan(0);
  });
});
