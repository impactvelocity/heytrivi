/**
 * The simulator's MCP client: the official SDK client over Streamable HTTP,
 * with every JSON-RPC message recorded for the protocol panel (R10.1, R10.2).
 *
 * Parent phrases are masked before a message is recorded (R13.6).
 */

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { findPhrases, maskArgs } from "./mask";

export interface ProtocolEntry {
  seq: number;
  direction: "out" | "in";
  at: number;
  /** For responses: time since the matching request was sent. */
  durationMs?: number;
  method?: string;
  id?: string | number;
  message: unknown;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

export interface ToolResult {
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  content?: Array<{ type: string; text?: string }>;
  _meta?: Record<string, unknown>;
}

type Listener = (entry: ProtocolEntry) => void;

/** Shared across sessions so protocol rows stay unique after "New session". */
let nextSeq = 0;
export const newSeq = () => ++nextSeq;

export class LoggedMcpClient {
  private client?: Client;
  private pending = new Map<string | number, { at: number; method: string }>();
  tools: McpTool[] = [];
  /** Every parent phrase seen in an outgoing call. */
  readonly secrets = new Set<string>();

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly onEntry: Listener,
  ) {}

  private record(direction: "out" | "in", message: unknown): void {
    const m = message as { id?: string | number; method?: string };
    const at = Date.now();
    let method = m.method;
    let durationMs: number | undefined;
    if (direction === "out" && m.id !== undefined && m.method) this.pending.set(m.id, { at, method: m.method });
    if (direction === "in" && m.id !== undefined) {
      const p = this.pending.get(m.id);
      if (p) {
        durationMs = at - p.at;
        method = p.method;
        this.pending.delete(m.id);
      }
    }
    if (direction === "out") findPhrases(message, this.secrets);
    this.onEntry({ seq: newSeq(), direction, at, durationMs, method, id: m.id, message: maskArgs(message) });
  }

  async connect(): Promise<void> {
    const transport = new StreamableHTTPClientTransport(new URL(this.url), {
      requestInit: { headers: { Authorization: `Bearer ${this.token}` } },
    });

    // Tap outgoing messages.
    const send = transport.send.bind(transport);
    transport.send = async (message, options) => {
      this.record("out", message);
      return send(message, options);
    };
    // Tap incoming messages. The client installs its `onmessage` handler just
    // before it starts the transport, so wrap it at that moment.
    const start = transport.start.bind(transport);
    transport.start = async () => {
      const handler = transport.onmessage;
      transport.onmessage = (message) => {
        this.record("in", message);
        handler?.(message);
      };
      return start();
    };

    this.client = new Client({ name: "hey-trivi-simulator", version: "0.1.0" });
    await this.client.connect(transport);
    const { tools } = await this.client.listTools();
    this.tools = tools as McpTool[];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.client) throw new Error("Not connected");
    return (await this.client.callTool({ name, arguments: args })) as ToolResult;
  }

  async readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }> {
    if (!this.client) throw new Error("Not connected");
    return (await this.client.readResource({ uri })) as { contents: Array<{ uri: string; mimeType?: string; text?: string }> };
  }

  async close(): Promise<void> {
    await this.client?.close().catch(() => {});
    this.client = undefined;
  }
}

export function resultText(r: ToolResult): string {
  return (r.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join(" ");
}
