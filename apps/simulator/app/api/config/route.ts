/**
 * Runtime settings for the browser: where the MCP server is, which token to
 * use, and whether the model is mocked.
 *
 * A signed-in parent's access token is used when there is one, so the
 * simulator plays as their family. Otherwise it's the development token for
 * the demo household (R9.7). While the demo lock is on (lib/live-access.ts)
 * and this browser hasn't unlocked it, there's no token: the page plays the
 * scripted demo.
 */

import { accessToken } from "@/lib/auth";
import { demoLockOn, liveAllowed } from "@/lib/live-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const lockable = demoLockOn();
  if (!(await liveAllowed())) return Response.json({ locked: true, lockable, mcpUrl: "", token: "", account: "demo", mock: true });
  const token = await accessToken();
  return Response.json({
    mcpUrl: process.env.MCP_SERVER_URL ?? "http://localhost:4787/mcp",
    token: token ?? process.env.MCP_DEV_TOKEN ?? "dev-token-demo",
    account: token ? "family" : "demo",
    mock: process.env.MOCK_MODEL === "1",
    locked: false,
    lockable,
  });
}
