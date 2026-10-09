/**
 * Hey Trivi — local dev entry point
 *
 * Runs the MCP server on @hono/node-server so you can reach it at
 * http://localhost:4787/mcp without any AWS account.
 *
 * Usage:  pnpm dev:local   (from the workspace root or from this package)
 */

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 4787);

const app = createApp();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Hey Trivi MCP server running at http://localhost:${info.port}`);
  console.log(`  MCP endpoint: http://localhost:${info.port}/mcp`);
  console.log(`  Health check: http://localhost:${info.port}/health`);
});
