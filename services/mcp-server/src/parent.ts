/**
 * The parent page's API (R11, R13). Mounted at /parent on the same server as
 * /mcp, so the game and the parent page share one store, locally and on AWS.
 *
 * Every route needs a signed-in user (a Cognito access token, or a local dev
 * user). The user's household comes from USER#<sub>; a new user has none until
 * they create one with POST /parent/household.
 *
 * Every successful call returns the whole dashboard, so the page can replace
 * its state in one step.
 */

import { Hono, type Context } from "hono";
import { GRADE_BANDS, nextPeriodStart, type GradeBand, type PhraseScope, type ResetSchedule, type Role } from "@hey-trivi/core";
import { UserError, type NewPlayer } from "@hey-trivi/store";
import { z } from "zod";
import { userForRequest } from "./auth.js";
import { getRepo } from "./context.js";

type Env = { Variables: { sub: string } };

const role = z.enum(["parent", "kid"]);
const gradeBand = z.enum(GRADE_BANDS);
const schedule = z.enum(["never", "weekly", "monthly"]);
const scope = z.enum(["spend", "spend_and_trade"]);
const newPlayer = z.object({ name: z.string().max(40), role, gradeBand: gradeBand.optional() });

const schemas = {
  household: z.object({
    showTitle: z.string().max(80),
    timeZone: z.string().max(64).optional(),
    resetSchedule: schedule.optional(),
    players: z.array(newPlayer).max(12).default([]),
  }),
  settings: z.object({ showTitle: z.string().max(80).optional(), timeZone: z.string().max(64).optional(), resetSchedule: schedule.optional() }),
  phrase: z.object({ phrase: z.string().max(120).optional(), requiredFor: scope }),
  player: newPlayer,
  playerEdit: z.object({ name: z.string().max(40).optional(), role: role.optional(), gradeBand: gradeBand.optional() }),
};

async function body<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await c.req.json().catch(() => undefined));
  if (!parsed.success) throw new UserError("That request didn't look right. Reload the page and try again.", "bad_request");
  return parsed.data;
}

const toPlayer = (p: { name: string; role: Role; gradeBand?: GradeBand }): NewPlayer => ({
  name: p.name,
  role: p.role,
  gradeBand: p.role === "kid" ? p.gradeBand : undefined,
});

/** Everything the parent page shows. */
export async function dashboard(hh: string) {
  const repo = await getRepo();
  // begin() applies a due reset first, so the page never shows stale balances.
  const state = await repo.begin(hh);
  const [ledger, rounds] = await Promise.all([repo.ledgerFor(hh, 300), repo.roundsFor(hh, 150)]);
  const { meta } = state;
  const packTitle = (id?: string) => (id ? state.packs.find((p) => p.packId === id)?.title : undefined);
  return {
    household: {
      householdId: meta.householdId,
      showTitle: meta.showTitle,
      timeZone: meta.timeZone,
      resetSchedule: meta.resetSchedule,
      periodStart: meta.periodStart ?? null,
      nextReset: meta.periodStart ? nextPeriodStart(meta.periodStart, meta.resetSchedule) : null,
      phraseSet: !!meta.phraseHash,
      phraseRequiredFor: (meta.phraseRequiredFor ?? "spend") as PhraseScope,
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
  };
}

export function parentRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const sub = await userForRequest(c.req.raw);
    if (!sub) return c.json({ error: "Please sign in again." }, 401);
    c.set("sub", sub);
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof UserError) return c.json({ error: err.message, code: err.code }, 400);
    console.error("parent api error", err);
    return c.json({ error: "Something went wrong on our side. Try again." }, 500);
  });

  /** The household for this user, or a 404 the page turns into the setup screen. */
  async function household(c: Context<Env>): Promise<string> {
    const hh = await (await getRepo()).householdForUser(c.get("sub"));
    if (!hh) throw new UserError("Set up your family first.", "no_household");
    return hh;
  }

  app.get("/me", async (c) => {
    const hh = await (await getRepo()).householdForUser(c.get("sub"));
    return c.json(hh ? await dashboard(hh) : { household: null });
  });

  app.post("/household", async (c) => {
    const b = await body(c, schemas.household);
    const repo = await getRepo();
    const hh = await repo.createHousehold({
      showTitle: b.showTitle,
      timeZone: b.timeZone,
      resetSchedule: b.resetSchedule as ResetSchedule | undefined,
      players: b.players.map(toPlayer),
      ownerSub: c.get("sub"),
    });
    return c.json(await dashboard(hh));
  });

  app.post("/settings", async (c) => {
    const hh = await household(c);
    const b = await body(c, schemas.settings);
    if (b.showTitle !== undefined && !b.showTitle.trim()) throw new UserError("Give your show a name.");
    await (await getRepo()).updateSettings(hh, b);
    return c.json(await dashboard(hh));
  });

  app.post("/phrase", async (c) => {
    const hh = await household(c);
    const b = await body(c, schemas.phrase);
    const repo = await getRepo();
    if (b.phrase?.trim()) await repo.setPhrase(hh, b.phrase, b.requiredFor);
    else {
      const state = await repo.load(hh);
      if (!state.meta.phraseHash) throw new UserError("Type a phrase first.");
      await repo.setPhraseScope(hh, b.requiredFor);
    }
    return c.json(await dashboard(hh));
  });

  app.delete("/phrase", async (c) => {
    const hh = await household(c);
    await (await getRepo()).setPhrase(hh, null);
    return c.json(await dashboard(hh));
  });

  app.post("/players", async (c) => {
    const hh = await household(c);
    const b = await body(c, schemas.player);
    const repo = await getRepo();
    await repo.addPlayer(hh, await repo.load(hh), toPlayer(b));
    return c.json(await dashboard(hh));
  });

  app.post("/players/:id", async (c) => {
    const hh = await household(c);
    const b = await body(c, schemas.playerEdit);
    const repo = await getRepo();
    const state = await repo.load(hh);
    if (!state.players.some((p) => p.playerId === c.req.param("id"))) throw new UserError("That player isn't in your family.", "unknown_player");
    await repo.updatePlayer(hh, c.req.param("id"), b);
    return c.json(await dashboard(hh));
  });

  app.delete("/players/:id", async (c) => {
    const hh = await household(c);
    const repo = await getRepo();
    const state = await repo.load(hh);
    if (!state.players.some((p) => p.playerId === c.req.param("id"))) throw new UserError("That player isn't in your family.", "unknown_player");
    await repo.removePlayer(hh, c.req.param("id"));
    return c.json(await dashboard(hh));
  });

  app.post("/reset", async (c) => {
    const hh = await household(c);
    await (await getRepo()).resetNow(hh);
    return c.json(await dashboard(hh));
  });

  return app;
}
