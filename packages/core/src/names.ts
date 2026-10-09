/**
 * Matching spoken names to players.
 */

import type { Player } from "./types.js";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]s$/, "")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case-insensitive match on the first name. Returns undefined if nobody matches. */
export function findPlayer<P extends Pick<Player, "name">>(players: P[], name: string): P | undefined {
  const want = normalizeName(name);
  return players.find((p) => normalizeName(p.name) === want);
}

/** "Mom, Dad, Sally, and John" */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** First name only: one word, letters, up to 20 characters. */
export function isValidFirstName(name: string): boolean {
  return /^[\p{L}][\p{L}'-]{0,19}$/u.test(name.trim());
}
