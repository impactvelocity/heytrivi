/**
 * Parent sign-in, server side only.
 *
 * With COGNITO_DOMAIN and COGNITO_CLIENT_ID set, parents sign up and sign in on
 * Cognito managed login (authorization code flow with PKCE). The access and
 * refresh tokens live in httpOnly cookies and never reach page scripts, except
 * that /api/config hands the access token to the simulator's MCP client so it
 * plays as the signed-in family.
 *
 * Without Cognito (a fresh clone, no AWS account), sign-in is a local dev
 * sign-in: the cookie holds a `dev-user-<name>` token, which the MCP server
 * accepts only in local mode.
 */

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = { access: "ht_at", refresh: "ht_rt", pkce: "ht_pkce" } as const;
export const SCOPES = "openid email profile";

type Jar = Awaited<ReturnType<typeof cookies>>;
interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export function cognitoConfig(): { domain: string; clientId: string } | null {
  const domain = process.env.COGNITO_DOMAIN?.replace(/\/$/, "");
  const clientId = process.env.COGNITO_CLIENT_ID;
  return domain && clientId ? { domain, clientId } : null;
}

/** The app's public origin, for OAuth redirects. */
export function appUrl(req: Request): string {
  return (process.env.APP_URL ?? new URL(req.url).origin).replace(/\/$/, "");
}

/** The MCP server's origin; the parent API is at /parent on the same server. */
export function parentApiBase(): string {
  const explicit = process.env.PARENT_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return (process.env.MCP_SERVER_URL ?? "http://localhost:4787/mcp").replace(/\/mcp\/?$/, "").replace(/\/$/, "");
}

const secure = process.env.NODE_ENV === "production";
export const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge });

function jwtExpiry(token: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export function pkcePair(): { verifier: string; challenge: string; state: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(16).toString("base64url") };
}

export async function tokenRequest(params: Record<string, string>): Promise<Tokens | undefined> {
  const cfg = cognitoConfig();
  if (!cfg) return undefined;
  const res = await fetch(`${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, ...params }),
    cache: "no-store",
  });
  if (!res.ok) return undefined;
  return (await res.json()) as Tokens;
}

export function saveTokens(jar: Jar, t: Tokens): void {
  jar.set(COOKIE.access, t.access_token, cookieOptions(t.expires_in));
  if (t.refresh_token) jar.set(COOKIE.refresh, t.refresh_token, cookieOptions(30 * 24 * 3600));
}

export function clearTokens(jar: Jar): void {
  jar.delete(COOKIE.access);
  jar.delete(COOKIE.refresh);
}

/** True when a sign-in cookie is present. Safe in server components. */
export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.has(COOKIE.access) || jar.has(COOKIE.refresh);
}

/**
 * A current access token for the signed-in parent, refreshed if it is about
 * to expire. Sets cookies, so call it from route handlers only.
 */
export async function accessToken(): Promise<string | undefined> {
  const jar = await cookies();
  const at = jar.get(COOKIE.access)?.value;
  if (at?.startsWith("dev-user-")) return at;
  if (at && (jwtExpiry(at) ?? 0) > Date.now() + 60_000) return at;
  const rt = jar.get(COOKIE.refresh)?.value;
  if (!rt) return undefined;
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: rt });
  if (!tokens) {
    clearTokens(jar);
    return undefined;
  }
  saveTokens(jar, tokens);
  return tokens.access_token;
}

/**
 * A 303 redirect. Built by hand because Response.redirect() has immutable
 * headers, and Next.js adds the cookies set through cookies() to the response.
 */
export function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { location } });
}
