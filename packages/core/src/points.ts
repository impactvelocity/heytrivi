/**
 * Spending, trading, and resets.
 */

import type { Chore, Player } from "./types.js";

export type SpendCheck = { ok: true } | { ok: false; reason: "bad_amount" | "shortfall"; shortfall?: number };

export function checkSpend(player: Player, amount: number): SpendCheck {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: "bad_amount" };
  if (player.balance < amount) return { ok: false, reason: "shortfall", shortfall: amount - player.balance };
  return { ok: true };
}

/** Spending lowers the balance and never the lifetime total. */
export function applySpend(player: Player, amount: number): Player {
  return { ...player, balance: player.balance - amount };
}

export type TransferCheck =
  | { ok: true }
  | { ok: false; reason: "bad_amount" | "same_player" | "shortfall" | "chore_not_owed"; shortfall?: number };

export function checkTransfer(from: Player, to: Player, amount: number, chore?: Chore): TransferCheck {
  if (from.playerId === to.playerId) return { ok: false, reason: "same_player" };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: "bad_amount" };
  if (from.balance < amount) return { ok: false, reason: "shortfall", shortfall: amount - from.balance };
  if (chore && (chore.owedBy !== from.playerId || chore.status !== "open")) {
    return { ok: false, reason: "chore_not_owed" };
  }
  return { ok: true };
}

/** Trades move balance only. Lifetime totals are untouched. */
export function applyTransfer(
  from: Player,
  to: Player,
  amount: number,
  chore?: Chore,
): { from: Player; to: Player; chore?: Chore } {
  return {
    from: { ...from, balance: from.balance - amount },
    to: { ...to, balance: to.balance + amount },
    chore: chore ? { ...chore, owedBy: to.playerId, transferredFrom: from.playerId } : undefined,
  };
}

export interface ResetResult {
  /** Player ids with the top balance. Empty if everyone had zero. */
  leaders: string[];
  finalBalances: Record<string, number>;
  players: Player[];
}

/** A reset zeroes balances and leaves lifetime totals (and chores) alone. */
export function resetBalances(players: Player[]): ResetResult {
  const finalBalances = Object.fromEntries(players.map((p) => [p.playerId, p.balance]));
  const top = Math.max(0, ...players.map((p) => p.balance));
  const leaders = top > 0 ? players.filter((p) => p.balance === top).map((p) => p.playerId) : [];
  return { leaders, finalBalances, players: players.map((p) => ({ ...p, balance: 0 })) };
}
