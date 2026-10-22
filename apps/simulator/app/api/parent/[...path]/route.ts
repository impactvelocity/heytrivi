/**
 * The parent page's calls, forwarded to the MCP server's /parent API with the
 * signed-in parent's access token. The token stays in an httpOnly cookie.
 * The /demo settings drawer uses it too; locally, signed out, that's the demo
 * family's parent (parentToken in lib/auth.ts).
 */

import { cookies } from "next/headers";
import { clearTokens, parentApiBase, parentToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PATH = /^[a-z0-9_-]+(\/[a-z0-9_-]+){0,3}$/i;

async function forward(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  if (!PATH.test(path)) return Response.json({ error: "Not found" }, { status: 404 });

  // Changes must come from this site's own pages.
  const origin = req.headers.get("origin");
  if (req.method !== "GET" && origin && process.env.APP_URL && origin !== new URL(process.env.APP_URL).origin) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const token = await parentToken();
  if (!token) return Response.json({ error: "Please sign in again." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${parentApiBase()}/parent/${path}`, {
      method: req.method,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "Can't reach the game server. Is it running?" }, { status: 502 });
  }
  if (res.status === 401) clearTokens(await cookies());
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}

export { forward as GET, forward as POST, forward as DELETE };
