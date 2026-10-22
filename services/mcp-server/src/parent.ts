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
import { GRADE_BANDS, type GradeBand, type ResetSchedule, type Role } from "@hey-trivi/core";
import { UserError, createFamily, packDetail as packDetailFor, parentDashboard, type NewPlayer } from "@hey-trivi/store";
import { z } from "zod";
import { userForRequest } from "./auth.js";
import { getRepo, prepareHousehold } from "./context.js";

type Env = { Variables: { sub: string } };

const role = z.enum(["parent", "kid"]);
const gradeBand = z.enum(GRADE_BANDS);
const schedule = z.enum(["never", "weekly", "monthly"]);
const scope = z.enum(["spend", "spend_and_trade"]);
const newPlayer = z.object({ name: z.string().max(40), role, gradeBand: gradeBand.optional() });
const packKind = z.enum(["trivia", "riddle", "mixed"]);
const question = z.object({
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().min(1).max(120),
  accept: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  explanation: z.string().trim().max(400).default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  kind: z.enum(["trivia", "riddle"]).optional(),
});
const MAX_QUESTIONS = 50;

const schemas = {
  household: z.object({
    showTitle: z.string().max(80),
    timeZone: z.string().max(64).optional(),
    resetSchedule: schedule.optional(),
    players: z.array(newPlayer).max(12).default([]),
  }),
  settings: z.object({
    showTitle: z.string().max(80).optional(),
    timeZone: z.string().max(64).optional(),
    resetSchedule: schedule.optional(),
    pointSettings: z
      .object({ correct: z.number().int().min(0).max(10), partial: z.number().int().min(0).max(10), wrong: z.number().int().min(0).max(0) })
      .optional(),
    stage: z
      .object({
        theme: z.string().regex(/^[a-z0-9-]{1,30}$/).optional(),
        lights: z.boolean().optional(),
        celebrate: z.boolean().optional(),
        readTwice: z.boolean().optional(),
      })
      .optional(),
  }),
  phrase: z.object({ phrase: z.string().max(120).optional(), requiredFor: scope }),
  player: newPlayer,
  playerEdit: z.object({ name: z.string().max(40).optional(), role: role.optional(), gradeBand: gradeBand.optional() }),
  pack: z.object({
    title: z.string().max(80),
    topic: z.string().max(200).default(""),
    kind: packKind,
    forPlayerId: z.string().max(60).optional(),
    questions: z.array(question).min(1).max(MAX_QUESTIONS),
  }),
  packEdit: z.object({
    title: z.string().max(80).optional(),
    kind: packKind.optional(),
    forPlayerId: z.string().max(60).nullable().optional(),
    paused: z.boolean().optional(),
  }),
  questions: z.object({ questions: z.array(question).min(1).max(MAX_QUESTIONS) }),
  question,
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

const dashboard = async (hh: string) => parentDashboard(await getRepo(), hh);
const packDetail = async (hh: string, packId: string) => packDetailFor(await getRepo(), hh, packId);

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
    await prepareHousehold(hh);
    return hh;
  }

  app.get("/me", async (c) => {
    const hh = await (await getRepo()).householdForUser(c.get("sub"));
    if (hh) await prepareHousehold(hh);
    return c.json(hh ? await dashboard(hh) : { household: null });
  });

  app.post("/household", async (c) => {
    const b = await body(c, schemas.household);
    const repo = await getRepo();
    const hh = await createFamily(repo, {
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

  /** Cheap check that the token is good (the pack helper uses it before calling the model). */
  app.get("/session", (c) => c.json({ ok: true }));

  // ---------------------------------------------------------------------------
  // Question packs (R6.2, R6.3). Pack routes return the dashboard plus `pack`.
  // ---------------------------------------------------------------------------

  async function ownPack(c: Context<Env>): Promise<{ hh: string; packId: string; questionCount: number }> {
    const hh = await household(c);
    const found = await (await getRepo()).getPack(hh, c.req.param("id")!);
    if (!found) throw new UserError("That theme doesn't exist.", "unknown_pack");
    return { hh, packId: found.pack.packId, questionCount: found.questions.length };
  }

  const kindFor = (packKind: "trivia" | "riddle" | "mixed", q: { kind?: "trivia" | "riddle" }) =>
    packKind === "mixed" ? (q.kind ?? "trivia") : packKind;

  app.get("/packs/:id", async (c) => {
    const { hh, packId } = await ownPack(c);
    return c.json({ pack: await packDetail(hh, packId) });
  });

  app.post("/packs", async (c) => {
    const hh = await household(c);
    const b = await body(c, schemas.pack);
    const repo = await getRepo();
    if (!b.title.trim()) throw new UserError("Give the theme a name.");
    if (b.forPlayerId && !(await repo.load(hh)).players.some((p) => p.playerId === b.forPlayerId)) {
      throw new UserError("That player isn't in your family.", "unknown_player");
    }
    const pack = await repo.createPack(hh, { title: b.title, topic: b.topic || b.title, kind: b.kind, forPlayerId: b.forPlayerId });
    const questions = b.questions.map((q) => ({ ...q, kind: kindFor(b.kind, q) }));
    const title = pack.title;
    await repo.addPackQuestions(hh, pack.packId, questions, {
      finish: true,
      newsText: `A new theme is ready: ${title}. Say "play the ${title} theme" to try it.`,
    });
    return c.json({ ...(await dashboard(hh)), pack: await packDetail(hh, pack.packId) });
  });

  app.post("/packs/:id", async (c) => {
    const { hh, packId } = await ownPack(c);
    const b = await body(c, schemas.packEdit);
    await (await getRepo()).updatePack(hh, packId, b);
    return c.json({ ...(await dashboard(hh)), pack: await packDetail(hh, packId) });
  });

  app.delete("/packs/:id", async (c) => {
    const { hh, packId } = await ownPack(c);
    await (await getRepo()).deletePack(hh, packId);
    return c.json(await dashboard(hh));
  });

  app.post("/packs/:id/replay", async (c) => {
    const { hh, packId } = await ownPack(c);
    await (await getRepo()).resetPackUsage(hh, packId);
    return c.json({ ...(await dashboard(hh)), pack: await packDetail(hh, packId) });
  });

  app.post("/packs/:id/questions", async (c) => {
    const { hh, packId, questionCount } = await ownPack(c);
    const b = await body(c, schemas.questions);
    if (questionCount + b.questions.length > MAX_QUESTIONS) throw new UserError(`A theme can hold up to ${MAX_QUESTIONS} questions.`);
    const repo = await getRepo();
    const detail = await packDetail(hh, packId);
    await repo.addPackQuestions(hh, packId, b.questions.map((q) => ({ ...q, kind: kindFor(detail.kind, q) })), { announce: false });
    return c.json({ ...(await dashboard(hh)), pack: await packDetail(hh, packId) });
  });

  app.post("/packs/:id/questions/:n", async (c) => {
    const { hh, packId } = await ownPack(c);
    const b = await body(c, schemas.question);
    const detail = await packDetail(hh, packId);
    const n = Number(c.req.param("n"));
    if (!detail.questions.some((q) => q.n === n)) throw new UserError("That question isn't in this theme.", "unknown_question");
    await (await getRepo()).updatePackQuestion(hh, packId, n, { ...b, kind: kindFor(detail.kind, b) });
    return c.json({ ...(await dashboard(hh)), pack: await packDetail(hh, packId) });
  });

  app.delete("/packs/:id/questions/:n", async (c) => {
    const { hh, packId } = await ownPack(c);
    await (await getRepo()).deletePackQuestion(hh, packId, Number(c.req.param("n")));
    return c.json({ ...(await dashboard(hh)), pack: await packDetail(hh, packId) });
  });

  app.post("/reset", async (c) => {
    const hh = await household(c);
    await (await getRepo()).resetNow(hh);
    return c.json(await dashboard(hh));
  });

  return app;
}
