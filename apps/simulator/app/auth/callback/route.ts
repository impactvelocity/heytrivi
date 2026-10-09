/** Managed login redirects here with a code; swap it for tokens (PKCE). */

import { cookies } from "next/headers";
import { COOKIE, appUrl, saveTokens, tokenRequest, seeOther } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = appUrl(req);
  const jar = await cookies();
  const saved = jar.get(COOKIE.pkce)?.value;
  jar.delete(COOKIE.pkce);
  const fail = (why: string) => seeOther(`${base}/parent?error=${why}`);

  if (url.searchParams.get("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  if (!saved || !code) return fail("expired");
  const { verifier, state } = JSON.parse(saved) as { verifier: string; state: string };
  if (url.searchParams.get("state") !== state) return fail("expired");

  const tokens = await tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: `${base}/auth/callback` });
  if (!tokens) return fail("signin");
  saveTokens(jar, tokens);
  return seeOther(`${base}/parent`);
}
