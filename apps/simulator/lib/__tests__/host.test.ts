import { afterEach, describe, expect, it, vi } from "vitest";
import { REPLAYS, isNewSession, type ReplayLine } from "@hey-trivi/replays";
import { Host, stripReasoning } from "../host";
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

/** Stub /api/model with one canned step per call, recording each request body. */
function stubModel(steps: Array<{ text?: string; toolCalls?: Array<{ toolName: string; input: Record<string, unknown> }> }>) {
  const bodies: Array<{ messages: Array<{ role: string; content: unknown }> }> = [];
  let n = 0;
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    bodies.push(JSON.parse(init.body));
    const step = steps[n++]!;
    const toolCalls = (step.toolCalls ?? []).map((c, i) => ({ toolCallId: `c${n}_${i}`, ...c }));
    const content = [
      ...(step.text ? [{ type: "text", text: step.text }] : []),
      ...toolCalls.map((c) => ({ type: "tool-call", ...c })),
    ];
    return new Response(JSON.stringify({ text: step.text ?? "", toolCalls, responseMessages: [{ role: "assistant", content }] }));
  });
  return bodies;
}

describe("real host turns", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("speaks only the say tool's text, never the model's loose reasoning", async () => {
    const { mcp, calls } = fakeMcp({});
    stubModel([
      { toolCalls: [{ toolName: "get_household", input: {} }] },
      {
        text: "The answer key says the Sun, but I must not reveal that yet.",
        toolCalls: [{ toolName: "say", input: { text: "What is the closest star to Earth?" } }],
      },
    ]);
    const say = await new Host(mcp).turn("Ask us one");
    expect(say).toBe("What is the closest star to Earth?");
    expect(calls.map((c) => c.name)).toEqual(["get_household"]);
  });

  it("doesn't speak a say made alongside game tools, and asks again after their results", async () => {
    const { mcp, calls } = fakeMcp({});
    const bodies = stubModel([
      { toolCalls: [{ toolName: "get_household", input: {} }] },
      {
        toolCalls: [
          { toolName: "start_round", input: { mode: "hosted" } },
          { toolName: "say", input: { text: "Too early" } },
        ],
      },
      { toolCalls: [{ toolName: "say", input: { text: "Here's your question." } }] },
    ]);
    const host = new Host(mcp);
    expect(await host.turn("Ask us one")).toBe("Here's your question.");
    expect(calls.map((c) => c.name)).toEqual(["get_household", "start_round"]);
    // `say` is never sent to the MCP server, but every call gets a result.
    const last = bodies.at(-1)!.messages.at(-1)!;
    expect(last.role).toBe("tool");
    expect(JSON.stringify(last.content)).toContain("Not spoken");

    // The next turn starts from a history where the final say was answered.
    stubModel([{ toolCalls: [{ toolName: "say", input: { text: "Next!" } }] }]);
    await host.turn("Again");
    const history = (host as unknown as { messages: Array<{ role: string }> }).messages;
    // get_household, start_round + early say, final say, and this turn's say.
    expect(history.filter((m) => m.role === "tool").length).toBe(4);
    expect(history.at(-1)!.role).toBe("tool");
  });

  it("strips tagged reasoning when the model answers in plain text", async () => {
    const { mcp } = fakeMcp({});
    stubModel([
      { toolCalls: [{ toolName: "get_household", input: {} }] },
      { text: "<thinking>Answer is the Sun. Don't say it.</thinking>What is the closest star to Earth?" },
    ]);
    expect(await new Host(mcp).turn("Ask us one")).toBe("What is the closest star to Earth?");
  });
});

describe("stripReasoning", () => {
  it("drops thinking blocks, unclosed ones too, and unwraps a response", () => {
    expect(stripReasoning("<thinking>plan</thinking><response>Hi Mom!</response>")).toBe("Hi Mom!");
    expect(stripReasoning("Hi! <thinking>the answer is 4")).toBe("Hi!");
    expect(stripReasoning("No tags here.")).toBe("No tags here.");
  });
});
