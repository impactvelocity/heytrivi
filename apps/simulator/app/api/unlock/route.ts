/**
 * The hidden switch between the scripted demo and live play (lib/live-access.ts).
 * POST { code } unlocks this browser; DELETE locks it again. A wrong code is
 * answered slowly, so guessing a short code takes a long time.
 */

import { demoLockOn, lock, unlock } from "@/lib/live-access";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!demoLockOn()) return Response.json({ unlocked: true });
  const { code } = (await req.json().catch(() => ({}))) as { code?: unknown };
  if (typeof code === "string" && code.length <= 200 && (await unlock(code))) return Response.json({ unlocked: true });
  await new Promise((r) => setTimeout(r, 1200));
  return Response.json({ error: "That code isn't right." }, { status: 401 });
}

export async function DELETE() {
  await lock();
  return Response.json({ unlocked: false });
}
