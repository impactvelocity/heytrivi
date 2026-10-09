/**
 * Hey Trivi — Lambda entry point
 *
 * Wraps the Hono app in @hono/aws-lambda so the same createApp() function
 * runs both locally (via @hono/node-server in local.ts) and on Lambda.
 *
 * The function URL is configured with NONE auth so the MCP server can
 * implement its own bearer-token check (R9.1).  CORS headers are added here
 * rather than in the Hono app so they apply uniformly to all responses
 * including Lambda preflight rejections.
 */

import { handle } from "@hono/aws-lambda";
import { createApp } from "./app.js";

const app = createApp();

export const handler = handle(app);
