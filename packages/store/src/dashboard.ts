/**
 * What the parent page shows, built from the store: the dashboard every call
 * returns, and one pack with its questions. The MCP server's /parent API
 * serves these; the website builds them itself for its offline demo (DEMO=1).
 */

import { nextPeriodStart, type PhraseScope } from "@hey-trivi/core";
import { UserError, type Repo } from "./repo.js";
import { DEMO_HOUSEHOLD_ID } from "./seed.js";

/** Everything the parent page shows. */
export async function parentDashboard(repo: Repo, hh: string) {
  // begin() applies a due reset first, so the page never shows stale balances.
  const state = await repo.begin(hh);
  const [ledger, rounds] = await Promise.all([repo.ledgerFor(hh, 300), repo.roundsFor(hh, 150)]);
  const { meta } = state;
  const packTitle = (id?: string) => (id ? state.packs.find((p) => p.packId === id)?.title : undefined);
  return {
    household: {
      householdId: meta.householdId,
      /** The shared demo family, which resets itself (restoreDemoWhenIdle). */
      demo: hh === DEMO_HOUSEHOLD_ID,
      showTitle: meta.showTitle,
      timeZone: meta.timeZone,
      resetSchedule: meta.resetSchedule,
      periodStart: meta.periodStart ?? null,
      nextReset: meta.periodStart ? nextPeriodStart(meta.periodStart, meta.resetSchedule) : null,
      phraseSet: !!meta.phraseHash,
      phraseRequiredFor: (meta.phraseRequiredFor ?? "spend") as PhraseScope,
      pointSettings: meta.pointSettings,
      stage: repo.stageSettings(state),
    },
    players: state.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      role: p.role,
      gradeBand: p.gradeBand ?? null,
      balance: p.balance,
      lifetime: p.lifetime,
      streak: p.streak,
    })),
    openChores: state.chores.map((c) => ({ choreId: c.choreId, label: c.label, owedBy: c.owedBy })),
    ledger: ledger.map((e) => ({ playerId: e.playerId, change: e.change, reason: e.reason, roundId: e.roundId ?? null, at: e.at })),
    rounds: rounds.map((r) => ({ ...r, packTitle: packTitle(r.packId) ?? null })),
    packs: [...state.packs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({
        packId: p.packId,
        title: p.title,
        topic: p.topic,
        kind: p.kind,
        status: p.status,
        failReason: p.failReason ?? null,
        paused: !!p.paused,
        questionCount: p.questionCount,
        remaining: Math.max(0, p.questionCount - p.usedCount),
        forPlayerId: p.forPlayerId ?? null,
        createdAt: p.createdAt,
      })),
  };
}

/** One pack with its questions, in order. */
export async function packDetail(repo: Repo, hh: string, packId: string) {
  const found = await repo.getPack(hh, packId);
  if (!found) throw new UserError("That theme doesn't exist.", "unknown_pack");
  return {
    packId: found.pack.packId,
    title: found.pack.title,
    topic: found.pack.topic,
    kind: found.pack.kind,
    forPlayerId: found.pack.forPlayerId ?? null,
    questions: found.questions
      .sort((a, b) => a.n - b.n)
      .map((q) => ({
        n: q.n,
        question: q.question,
        answer: q.answer,
        accept: q.accept ?? [],
        explanation: q.explanation ?? "",
        difficulty: q.difficulty,
        kind: q.kind ?? (found.pack.kind === "riddle" ? "riddle" : "trivia"),
        used: !!q.usedAt,
      })),
  };
}
