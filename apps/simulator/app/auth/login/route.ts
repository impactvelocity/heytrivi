/**
 * Start sign-in or signup.
 *
 * Cognito: redirect to managed login (/oauth2/authorize, or /signup for new
 * parents) with PKCE. Local dev (no Cognito): sign in straight away as the demo
 * family (?as=demo) or as a brand-new parent (?as=new).
 */

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE, SCOPES, appUrl, cognitoConfig, cookieOptions, pkcePair, seeOther } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const cfg = cognitoConfig();
  const base = appUrl(req);

  if (!cfg) {
    const token = url.searchParams.get("as") === "new" ? `dev-user-${randomBytes(5).toString("hex")}` : "dev-user-demo";
    jar.set(COOKIE.access, token, cookieOptions(30 * 24 * 3600));
    return seeOther(`${base}/parent`);
  }

  const { verifier, challenge, state } = pkcePair();
  jar.set(COOKIE.pkce, JSON.stringify({ verifier, state }), cookieOptions(600));
  const page = url.searchParams.get("screen") === "signup" ? "signup" : "oauth2/authorize";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: `${base}/auth/callback`,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return seeOther(`${cfg.domain}/${page}?${params}`);
}
