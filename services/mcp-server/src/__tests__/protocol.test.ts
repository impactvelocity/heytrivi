/**
 * Protocol tests — task 1.4
 *
 * Verifies R1.1 to R1.4 and R9.1 by sending real JSON-RPC requests over HTTP.
 * No AWS account needed.
 *
 * mcp-handler 2.x serves Streamable HTTP (MCP spec 2026-07-28 + 2025 fallback).
 * It requires `Accept: application/json, text/event-stream` and responds with
 * SSE (`event: message\ndata: {...}\n\n`) for POST requests.
 *
 * Runs against:
 *   - the in-process server started by beforeAll (default)
 *   - an external URL when TEST_MCP_URL is set (the deployed Lambda), using
 *     TEST_MCP_TOKEN as the bearer token (default: dev-token-demo)
 */

import { serve } from "@hono/node-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const TOKEN = process.env.TEST_MCP_TOKEN ?? "dev-token-demo";
const ALL_TOOLS = [
  "get_household",
  "add_player",
  "start_round",
  "record_round",
  "complete_chore",
  "spend_points",
  "transfer_points",
  "show_scoreboard",
  "list_packs",
];

let baseUrl: string;
let serverHandle: { close: () => void } | undefined;

beforeAll(async () => {
  if (process.env.TEST_MCP_URL) {
    baseUrl = process.env.TEST_MCP_URL.replace(/\/(mcp)?\/?$/, "");
    return;
  }
  await new Promise<void>((resolve) => {
    const server = serve({ fetch: createApp().fetch, port: 0 }, (info) => {
      baseUrl = `http://localhost:${info.port}`;
      resolve();
    });
    serverHandle = server as unknown as { close: () => void };
  });
});

afterAll(() => {
  serverHandle?.close();
});

function parseSseBody(text: string): Record<string, unknown> {
  if (text.trimStart().startsWith("{")) return JSON.parse(text) as Record<string, unknown>;
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) return JSON.parse(line.slice("data: ".length)) as Record<string, unknown>;
  }
  throw new Error(`No data: line in SSE body:\n${text}`);
}

async function post(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
      Authorization: `Bearer ${TOKEN}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function rpc(method: string, params?: unknown, id: number | string = 1) {
  const res = await post({ jsonrpc: "2.0", id, method, params });
  expect(res.ok, `HTTP ${res.status} on ${method}`).toBe(true);
  return parseSseBody(await res.text());
}

describe("R1.1 — initialize", () => {
  it("accepts protocolVersion 2025-11-25 and agrees a version", async () => {
    const body = await rpc("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "test-client", version: "0.0.1" },
    });
    expect(body.error, "should not return error").toBeUndefined();
    const result = body.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe("2025-11-25");
    expect((result.serverInfo as Record<string, unknown>).name).toBe("hey-trivi");
  });
});

describe("R1.2 — no session required", () => {
  it("answers tools/list without any session header or prior initialize", async () => {
    const res = await post({ jsonrpc: "2.0", id: 9, method: "tools/list", params: {} });
    expect(res.ok).toBe(true);
    expect(res.headers.get("mcp-session-id")).toBeNull();
  });
});

describe("R1.3 — tools/list", () => {
  it("returns every tool with an input schema and a description", async () => {
    const body = await rpc("tools/list", {});
    expect(body.error).toBeUndefined();
    const tools = (body.result as { tools: Array<Record<string, unknown>> }).tools;
    for (const name of ALL_TOOLS) {
      const t = tools.find((x) => x.name === name);
      expect(t, `${name} should be listed`).toBeDefined();
      expect((t!.description as string).length).toBeGreaterThan(20);
      expect(t!.inputSchema).toMatchObject({ type: "object" });
    }
  });
});

describe("R1.4 — tools/call returns structuredContent and text", () => {
  it("get_household", async () => {
    const body = await rpc("tools/call", { name: "get_household", arguments: {} });
    expect(body.error).toBeUndefined();
    const result = body.result as { structuredContent: Record<string, unknown>; content: Array<{ type: string; text?: string }> };
    expect(result.structuredContent).toBeDefined();
    const text = result.content.filter((c) => c.type === "text");
    expect(text[0]!.text!.length).toBeGreaterThan(0);
    const players = result.structuredContent.players as Array<Record<string, unknown>>;
    expect(players.length).toBeGreaterThan(0);
    expect(players[0]).toHaveProperty("name");
    expect(players[0]).toHaveProperty("balance");
    expect(players[0]).toHaveProperty("lifetime");
  });

  it("show_scoreboard references the scoreboard UI", async () => {
    const body = await rpc("tools/call", { name: "show_scoreboard", arguments: {} });
    const result = body.result as { structuredContent: unknown; _meta?: { ui?: { resourceUri?: string } } };
    expect(result.structuredContent).toBeDefined();
    expect(result._meta?.ui?.resourceUri).toBe("ui://hey-trivi/scoreboard");
  });
});

describe("R9.1 / R9.5 — bearer token", () => {
  it("401s with no token and no WWW-Authenticate header", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, { Authorization: "" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBeNull();
  });

  it("401s with a wrong token", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, { Authorization: "Bearer nope" });
    expect(res.status).toBe(401);
  });

  it("does not accept the token in the query string", async () => {
    const res = await fetch(`${baseUrl}/mcp?access_token=${TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(res.status).toBe(401);
  });
});
