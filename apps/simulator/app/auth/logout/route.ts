/** Sign out here, and on managed login too so the next sign-in asks again. */

import { cookies } from "next/headers";
import { appUrl, clearTokens, cognitoConfig, seeOther } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  clearTokens(await cookies());
  const base = appUrl(req);
  const cfg = cognitoConfig();
  if (!cfg) return seeOther(`${base}/parent`);
  const params = new URLSearchParams({ client_id: cfg.clientId, logout_uri: `${base}/parent` });
  return seeOther(`${cfg.domain}/logout?${params}`);
}
