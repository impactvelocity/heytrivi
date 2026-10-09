/**
 * Helpers shared by every tool: the result shape from tech.md, the per-call
 * reset check, and turning UserErrors into results the host can say aloud.
 */

import type { CallToolResult } from "@modelcontextprotocol/server";
import { UserError, type Repo, type State } from "@hey-trivi/store";
import { currentHousehold, getRepo } from "../context.js";

export const SCOREBOARD_URI = "ui://hey-trivi/scoreboard";

/** Tool-definition _meta for tools that show the scoreboard (MCP Apps). */
export const SCOREBOARD_TOOL_META = {
  ui: { resourceUri: SCOREBOARD_URI },
  "ui/resourceUri": SCOREBOARD_URI,
};

export interface ToolEnv {
  repo: Repo;
  hh: string;
  state: State;
}

export function ok(structured: Record<string, unknown>, text: string, opts: { scoreboard?: boolean } = {}): CallToolResult {
  return {
    structuredContent: structured,
    content: [{ type: "text", text }],
    ...(opts.scoreboard ? { _meta: SCOREBOARD_TOOL_META } : {}),
  };
}

export function fail(message: string, code = "user_error"): CallToolResult {
  return {
    isError: true,
    structuredContent: { error: code, message },
    content: [{ type: "text", text: message }],
  };
}

/**
 * Run a tool body for the caller's household. Every call starts with the
 * reset check (R13.8), via repo.begin.
 */
export async function withHousehold(fn: (env: ToolEnv) => Promise<CallToolResult>): Promise<CallToolResult> {
  const repo = await getRepo();
  const hh = currentHousehold();
  try {
    const state = await repo.begin(hh);
    return await fn({ repo, hh, state });
  } catch (err) {
    if (err instanceof UserError) return fail(err.message, err.code);
    // Never echo arguments: they may contain the parent phrase.
    console.error("tool error", (err as Error).name, (err as Error).message);
    return fail("Sorry, something went wrong keeping score. Try that again.", "internal");
  }
}

export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
