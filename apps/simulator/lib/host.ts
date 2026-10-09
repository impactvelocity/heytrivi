/**
 * The host loop, in the browser.
 *
 * Real model: the conversation lives here. Each step posts it to /api/model
 * (Bedrock), which returns either speech or tool calls. Tool calls run here
 * through the MCP client, so the protocol panel shows them, and the results go
 * back to the model until it answers (R10.3).
 *
 * Mock model (MOCK_MODEL=1): no model at all. Replay lines carry the host's
 * turn, which is played against the real MCP server.
 */

import type { MockCall } from "@hey-trivi/replays";
import { maskText } from "./mask";
import { resultText, type LoggedMcpClient, type ToolResult } from "./mcp";

type Json = unknown;
type Message = { role: string; content: Json };

export interface HostEvents {
  onToolCall?: (name: string, args: Record<string, unknown>, result: ToolResult) => void;
}

const MAX_STEPS = 8;

export class Host {
  private messages: Message[] = [];
  private calledHousehold = false;
  private last = new Map<string, ToolResult>();

  constructor(
    private readonly mcp: LoggedMcpClient,
    private readonly events: HostEvents = {},
  ) {}

  private async runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    let result: ToolResult;
    try {
      result = await this.mcp.callTool(name, args);
    } catch (err) {
      result = { isError: true, content: [{ type: "text", text: `The game server didn't answer: ${(err as Error).message}` }] };
    }
    if (name === "get_household" && !result.isError) this.calledHousehold = true;
    this.last.set(name, result);
    this.events.onToolCall?.(name, args, result);
    return result;
  }

  /** One user turn with the real model. Returns what the host says. */
  async turn(userText: string): Promise<string> {
    this.messages.push({ role: "user", content: userText });
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await fetch("/api/model", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: this.messages,
          tools: this.mcp.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
          // R10.5: the first thing a session does is load the household.
          forceTool: this.calledHousehold ? undefined : "get_household",
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Model call failed (${res.status})`);
      }
      const out = (await res.json()) as {
        text: string;
        toolCalls: Array<{ toolCallId: string; toolName: string; input: Record<string, unknown> }>;
        responseMessages: Message[];
      };
      this.messages.push(...out.responseMessages);
      if (!out.toolCalls.length) return this.clean(out.text);

      const results = [];
      for (const call of out.toolCalls) {
        const r = await this.runTool(call.toolName, call.input ?? {});
        results.push({
          type: "tool-result",
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          output: { type: "json", value: { isError: !!r.isError, text: resultText(r), data: r.structuredContent ?? null } },
        });
      }
      this.messages.push({ role: "tool", content: results });
    }
    return "Sorry, I got a bit lost there. Can you say that again?";
  }

  /** One user turn in mock mode, played from a replay line. */
  async mockTurn(turn: { calls: MockCall[]; say: string } | undefined): Promise<string> {
    if (!turn) {
      const r = await this.runTool("get_household", {});
      return this.clean(`I'm in mock mode, so I can only play the replay scripts. ${resultText(r)}`);
    }
    for (const call of turn.calls) {
      await this.runTool(call.name, this.resolve(call.args) as Record<string, unknown>);
    }
    return this.clean(this.resolve(turn.say) as string);
  }

  /** Keep spoken output plain and never let the parent phrase through. */
  private clean(text: string): string {
    return maskText(text.replace(/[*_#`]+/g, "").trim(), this.mcp.secrets);
  }

  private lookup(ref: string): unknown {
    if (ref === "uuid") return crypto.randomUUID();
    const [tool, path] = ref.includes("#") ? [ref.split("#")[0]!, "#text"] : [ref.split(".")[0]!, ref.split(".").slice(1).join(".")];
    const r = this.last.get(tool);
    if (!r) return "";
    if (path === "#text") return resultText(r);
    return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), r.structuredContent) ?? "";
  }

  private resolve(value: unknown): unknown {
    if (typeof value === "string") {
      const whole = value.match(/^\{\{([^}]+)\}\}$/);
      if (whole) return this.lookup(whole[1]!);
      return value.replace(/\{\{([^}]+)\}\}/g, (_, ref: string) => String(this.lookup(ref)));
    }
    if (Array.isArray(value)) return value.map((v) => this.resolve(v));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.resolve(v)]));
    }
    return value;
  }
}
