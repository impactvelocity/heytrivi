/**
 * Bearer-token check.
 *
 * Accepts the token only in the Authorization header (R9.5). A token maps to
 * exactly one household (R9.6). Development tokens (R9.7) are TOKEN# items in
 * the store; the local in-memory store seeds `dev-token-demo` for the demo
 * family.
 */

import { getRepo } from "./context.js";

const cache = new Map<string, { hh: string; until: number }>();
const CACHE_MS = 60_000;

export function bearerToken(req: Request): string | undefined {
  const h = req.headers.get("authorization");
  const m = h?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1];
}

/** Resolve a request to its household, or undefined if unauthenticated. */
export async function householdForRequest(req: Request): Promise<string | undefined> {
  const token = bearerToken(req);
  if (!token) return undefined;
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.hh;
  const repo = await getRepo();
  const hh = await repo.householdForToken(token);
  if (hh) cache.set(token, { hh, until: Date.now() + CACHE_MS });
  return hh;
}

/** 401 with no WWW-Authenticate header (R9.1). */
export function unauthorized(): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized: a valid bearer token is required" } }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}
