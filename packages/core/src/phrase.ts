/**
 * Parent phrase: normalisation, hashing, and the lockout.
 *
 * The phrase is never stored in plain text. Only a salted scrypt hash is kept.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const LOCKOUT_FAILURES = 5;
export const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;

/** Lowercase, drop punctuation, collapse whitespace. */
export function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashPhrase(phrase: string, salt: string): string {
  return scryptSync(normalizePhrase(phrase), salt, 32).toString("hex");
}

export function phraseMatches(attempt: string, salt: string, hash: string): boolean {
  const a = Buffer.from(hashPhrase(attempt, salt), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface LockoutState {
  /** Epoch ms of recent wrong attempts. */
  failures: number[];
  /** Epoch ms until which protected actions are refused. */
  lockedUntil?: number;
}

export function isLockedOut(state: LockoutState, now: number): boolean {
  return state.lockedUntil !== undefined && now < state.lockedUntil;
}

/** Record a wrong attempt. Five inside ten minutes locks for ten minutes. */
export function recordFailure(state: LockoutState, now: number): LockoutState {
  const failures = [...state.failures.filter((t) => now - t < LOCKOUT_WINDOW_MS), now];
  if (failures.length >= LOCKOUT_FAILURES) return { failures: [], lockedUntil: now + LOCKOUT_WINDOW_MS };
  return { failures, lockedUntil: state.lockedUntil };
}
