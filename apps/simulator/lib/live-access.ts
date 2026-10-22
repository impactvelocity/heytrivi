/**
 * Demo lock, server side only. With DEMO_UNLOCK_CODE set, the site plays the
 * scripted demo for everyone: no model, no Polly, no game server, so a public
 * link costs nothing and can't be used as a free model. Whoever knows the
 * code unlocks live play for their browser (POST /api/unlock), which sets an
 * httpOnly cookie signed with the code. Changing the code locks everyone out
 * again. Without DEMO_UNLOCK_CODE (local development) everything is live.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/auth";

export const LIVE_COOKIE = "ht_live";
/** How long an unlocked browser stays unlocked. */
export const LIVE_DAYS = 30;

const code = () => process.env.DEMO_UNLOCK_CODE?.trim() ?? "";

/** True when the site is locked to the scripted demo unless unlocked. */
export const demoLockOn = () => code() !== "";

const stamp = (c: string) => createHmac("sha256", c).update("heytrivi-live-v1").digest("base64url");

const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

/** Whether this request may use live play: the lock is off, or the browser unlocked it. */
export async function liveAllowed(): Promise<boolean> {
  const c = code();
  if (!c) return true;
  const value = (await cookies()).get(LIVE_COOKIE)?.value;
  return !!value && same(value, stamp(c));
}

/** Checks a typed code and, if it's right, unlocks this browser. */
export async function unlock(typed: string): Promise<boolean> {
  const c = code();
  if (!c || !same(typed.trim(), c)) return false;
  (await cookies()).set(LIVE_COOKIE, stamp(c), cookieOptions(LIVE_DAYS * 24 * 3600));
  return true;
}

export async function lock(): Promise<void> {
  (await cookies()).delete(LIVE_COOKIE);
}

/** What a paid route returns while the site is locked. */
export const lockedResponse = () => Response.json({ error: "Live play is locked here. This is the scripted demo." }, { status: 403 });
