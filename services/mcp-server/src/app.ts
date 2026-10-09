/**
 * Hey Trivi — MCP server
 *
 * Hono app that mounts the MCP handler at /mcp.
 * In local dev mode (src/local.ts) this runs on @hono/node-server.
 * On Lambda the same app is wrapped by @hono/aws-lambda (src/lambda.ts).
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMcpHandler } from "mcp-handler";
import { householdForRequest, unauthorized } from "./auth.js";
import { runWithContext } from "./context.js";
import { registerTools } from "./tools/index.js";

export function createApp(): Hono {
  const app = new Hono();

  // Browsers (the simulator) call the server directly. Lambda function URLs
  // add their own CORS headers, so only add them when running locally.
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.use(
      "*",
      cors({
        origin: "*",
        allowHeaders: ["authorization", "content-type", "accept", "mcp-protocol-version", "mcp-session-id", "last-event-id"],
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
      }),
    );
  }

  // Health check — keeps Lambda warm and lets load balancers verify it.
  app.get("/health", (c) => c.json({ status: "ok", service: "hey-trivi-mcp" }));

  const mcpHandler = createMcpHandler(
    (server) => {
      registerTools(server);
    },
    {
      serverInfo: { name: "hey-trivi", version: "0.1.0" },
      instructions:
        "Hey Trivi keeps a family's trivia scoreboard, chores, and points. Call get_household at the start of every conversation. " +
        "You judge answers; the server keeps the record. Keep spoken replies short. Never reveal an answer key before guesses are recorded, " +
        "and never repeat a parent phrase.",
    },
  );

  app.all("/mcp", async (c) => {
    const hh = await householdForRequest(c.req.raw);
    if (!hh) return unauthorized();
    return runWithContext({ householdId: hh }, () => mcpHandler(c.req.raw));
  });

  return app;
}
