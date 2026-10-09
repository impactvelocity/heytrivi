/**
 * Bearer-token check.
 *
 * Accepts the token only in the Authorization header (R9.5). A token maps to
 * exactly one household (R9.6). Three kinds of token:
 *
 *   - Cognito access tokens (R9.4). The signature, issuer, expiry, and client
 *     id are checked, then USER#<sub> names the household.
 *   - Development tokens (R9.7): TOKEN# items in the store. The demo seed adds
 *     `dev-token-demo` for the demo family.
 *   - Local dev sign-in, local mode only: `dev-user-<name>` stands in for a
 *     Cognito user called `dev:<name>`, so the parent page's signup works with
 *     no AWS account.
 */

import { CognitoJwtVerifier } from "aws-jwt-verify";
import { getRepo } from "./context.js";

const cache = new Map<string, { hh: string; until: number }>();
const CACHE_MS = 60_000;

/** Local mode: the in-memory store, no AWS account (R12.1). */
export const isLocalMode = () => !process.env.DYNAMODB_TABLE;

type Verifier = { verify(token: string): Promise<{ sub: string; exp: number }> };
let verifier: Verifier | null | undefined;

function getVerifier(): Verifier | null {
  if (verifier !== undefined) return verifier;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = (process.env.COGNITO_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  verifier = userPoolId && clientId.length ? CognitoJwtVerifier.create({ userPoolId, tokenUse: "access", clientId }) : null;
  return verifier;
}

/** For tests: replace the Cognito verifier. */
export function setVerifier(v: Verifier | null): void {
  verifier = v;
  cache.clear();
}

export function bearerToken(req: Request): string | undefined {
  const h = req.headers.get("authorization");
  const m = h?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1];
}

const looksLikeJwt = (t: string) => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(t);

/** The signed-in user's id for a token, or undefined if it isn't a valid user token. */
async function userForToken(token: string): Promise<{ sub: string; exp?: number } | undefined> {
  if (isLocalMode()) {
    const m = token.match(/^dev-user-([a-z0-9-]{1,40})$/);
    if (m) return { sub: `dev:${m[1]}` };
  }
  const v = getVerifier();
  if (!v || !looksLikeJwt(token)) return undefined;
  try {
    const payload = await v.verify(token);
    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return undefined;
  }
}

/** The signed-in user (parent page), or undefined. Dev household tokens are not users. */
export async function userForRequest(req: Request): Promise<string | undefined> {
  const token = bearerToken(req);
  return token ? (await userForToken(token))?.sub : undefined;
}

/** Resolve a request to its household, or undefined if unauthenticated. */
export async function householdForRequest(req: Request): Promise<string | undefined> {
  const token = bearerToken(req);
  if (!token) return undefined;
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.hh;
  const repo = await getRepo();
  let hh: string | undefined;
  let until = Date.now() + CACHE_MS;
  const user = await userForToken(token);
  if (user) {
    hh = await repo.householdForUser(user.sub);
    // Never cache a token past its expiry.
    if (user.exp) until = Math.min(until, user.exp * 1000);
  } else if (!looksLikeJwt(token)) {
    hh = await repo.householdForToken(token);
  }
  if (hh) cache.set(token, { hh, until });
  return hh;
}

/** 401 with no WWW-Authenticate header (R9.1). */
export function unauthorized(): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized: a valid bearer token is required" } }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}
