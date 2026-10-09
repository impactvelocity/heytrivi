/**
 * The parent page's API and Cognito tokens on /mcp, against the in-memory
 * store. Cognito itself is replaced by a stub verifier; the real one is
 * aws-jwt-verify, configured from COGNITO_USER_POOL_ID and COGNITO_CLIENT_IDS.
 */

import { MemoryItemStore, Repo, seedDemo } from "@hey-trivi/store";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { setVerifier } from "../auth.js";
import { LOCAL_DEMO_USER, setRepo } from "../context.js";

const app = createApp();
let repo: Repo;

beforeEach(async () => {
  repo = new Repo(new MemoryItemStore());
  await seedDemo(repo, { devToken: "dev-token-demo" });
  await repo.linkUser(LOCAL_DEMO_USER, "demo");
  setRepo(repo);
  setVerifier(null);
});

afterAll(() => setVerifier(null));

type Json = Record<string, any>;

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<{ status: number; json: Json }> {
  const res = await app.request(`/parent${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(opts.token !== "" ? { authorization: `Bearer ${opts.token ?? "dev-user-demo"}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as Json };
}

describe("parent API", () => {
  it("needs a signed-in user; household dev tokens are not users", async () => {
    expect((await api("/me", { token: "" })).status).toBe(401);
    expect((await api("/me", { token: "dev-token-demo" })).status).toBe(401);
  });

  it("returns the dashboard for the demo family", async () => {
    const { status, json } = await api("/me");
    expect(status).toBe(200);
    expect(json.household).toMatchObject({ showTitle: "The Jones Family Trivia Night", resetSchedule: "weekly", phraseSet: true });
    expect(json.household).not.toHaveProperty("phraseHash");
    expect(JSON.stringify(json)).not.toContain("phraseSalt");
    expect(json.players.map((p: Json) => p.name)).toEqual(["Dad", "John", "Mom", "Sally"]);
    expect(json.household.nextReset).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("a new user sets up a family, then plays as it over MCP", async () => {
    const token = "dev-user-newfam";
    expect((await api("/me", { token })).json).toEqual({ household: null });
    expect((await api("/players", { token, body: { name: "Ava", role: "kid" } })).status).toBe(400);

    const created = await api("/household", {
      token,
      body: {
        showTitle: "Kitchen Table Trivia",
        timeZone: "America/Chicago",
        resetSchedule: "monthly",
        players: [
          { name: "Mom", role: "parent", gradeBand: "3-5" },
          { name: "Ava", role: "kid", gradeBand: "K-2" },
        ],
      },
    });
    expect(created.status).toBe(200);
    expect(created.json.household).toMatchObject({ showTitle: "Kitchen Table Trivia", resetSchedule: "monthly", phraseSet: false });
    expect(created.json.players.map((p: Json) => [p.name, p.gradeBand])).toEqual([
      ["Ava", "K-2"],
      ["Mom", null],
    ]);
    expect((await api("/household", { token, body: { showTitle: "Twice" } })).json.error).toMatch(/already has a family/);

    // The same user token works on /mcp and loads this family, not the demo one.
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_household", arguments: {} } }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Kitchen Table Trivia");
    expect(text).not.toContain("Jones");
  });

  it("edits players, settings, and the phrase", async () => {
    let r = await api("/players", { body: { name: "Grandma", role: "parent" } });
    expect(r.json.players.map((p: Json) => p.name)).toContain("Grandma");
    const grandma = r.json.players.find((p: Json) => p.name === "Grandma");

    r = await api(`/players/${grandma.playerId}`, { body: { name: "Nana" } });
    expect(r.json.players.map((p: Json) => p.name)).toContain("Nana");
    expect((await api(`/players/${grandma.playerId}`, { body: { name: "Mom" } })).json.error).toMatch(/already playing/);

    r = await api(`/players/${grandma.playerId}`, { method: "DELETE" });
    expect(r.json.players.map((p: Json) => p.name)).not.toContain("Nana");
    expect((await api("/players/nobody", { method: "DELETE" })).status).toBe(400);

    r = await api("/settings", { body: { resetSchedule: "never", timeZone: "Europe/London", showTitle: "Game Night" } });
    expect(r.json.household).toMatchObject({ resetSchedule: "never", timeZone: "Europe/London", showTitle: "Game Night", nextReset: null });
    expect((await api("/settings", { body: { timeZone: "Mars/Olympus" } })).status).toBe(400);

    expect((await api("/phrase", { body: { phrase: "pancakes", requiredFor: "spend" } })).json.error).toMatch(/two words/);
    r = await api("/phrase", { body: { requiredFor: "spend_and_trade" } });
    expect(r.json.household.phraseRequiredFor).toBe("spend_and_trade");
    r = await api("/phrase", { method: "DELETE" });
    expect(r.json.household.phraseSet).toBe(false);
  });

  it("resets balances now and shows it in the points history", async () => {
    const r = await api("/reset", { body: {} });
    expect(r.json.players.every((p: Json) => p.balance === 0)).toBe(true);
    expect(r.json.players.find((p: Json) => p.name === "Mom").lifetime).toBe(11);
    expect(r.json.ledger.filter((e: Json) => e.reason === "reset")).toHaveLength(4);
  });
});

describe("question packs", () => {
  const dino = { question: "Which dinosaur had three horns?", answer: "Triceratops", accept: ["tricerotops"], explanation: "Tri means three.", difficulty: "easy", kind: "trivia" };
  const riddle = { question: "I have a long neck and eat treetops. What dinosaur am I?", answer: "a sauropod", kind: "riddle" };

  it("a parent writes a mixed pack, edits it, and the game plays it by name", async () => {
    let r = await api("/packs", { body: { title: "Dinosaur Discoveries", topic: "dinosaurs for 6 and 8", kind: "mixed", forPlayerId: "sally", questions: [dino, riddle] } });
    expect(r.status).toBe(200);
    expect(r.json.pack).toMatchObject({ title: "Dinosaur Discoveries", kind: "mixed", forPlayerId: "sally" });
    expect(r.json.pack.questions.map((q: Json) => [q.n, q.kind, q.difficulty, q.explanation])).toEqual([
      [1, "trivia", "easy", "Tri means three."],
      [2, "riddle", "easy", ""],
    ]);
    expect(r.json.packs[0]).toMatchObject({ title: "Dinosaur Discoveries", questionCount: 2, remaining: 2 });
    const id = r.json.pack.packId;

    r = await api(`/packs/${id}/questions`, { body: { questions: [{ question: "Did T. rex have big arms or small arms?", answer: "small arms", kind: "trivia" }] } });
    expect(r.json.pack.questions).toHaveLength(3);
    r = await api(`/packs/${id}/questions/3`, { body: { question: "Did T. rex have big arms or tiny arms?", answer: "tiny arms", kind: "trivia" } });
    expect(r.json.pack.questions[2].answer).toBe("tiny arms");
    r = await api(`/packs/${id}/questions/1`, { method: "DELETE" });
    expect(r.json.pack.questions.map((q: Json) => q.n)).toEqual([2, 3]);
    r = await api(`/packs/${id}`, { body: { title: "Dino Days", forPlayerId: null } });
    expect(r.json.pack).toMatchObject({ title: "Dino Days", forPlayerId: null });

    // Alexa: "play the dino pack, riddles"
    const res = await app.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer dev-token-demo" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "start_round", arguments: { mode: "riddle", pack: "dino pack" } } }),
    });
    expect(await res.text()).toContain("long neck");

    expect((await api(`/packs/${id}/replay`, { body: {} })).json.pack.questions.every((q: Json) => !q.used)).toBe(true);
    r = await api(`/packs/${id}`, { method: "DELETE" });
    expect(r.json.packs.map((p: Json) => p.title)).not.toContain("Dino Days");
  });

  it("refuses empty packs, bad questions, and other families' packs", async () => {
    expect((await api("/packs", { body: { title: "Empty", kind: "trivia", questions: [] } })).status).toBe(400);
    expect((await api("/packs", { body: { title: "Bad", kind: "trivia", questions: [{ question: " ", answer: "x" }] } })).status).toBe(400);
    expect((await api("/packs", { body: { title: "  ", kind: "trivia", questions: [dino] } })).json.error).toMatch(/name/);

    const other = await api("/household", { token: "dev-user-other", body: { showTitle: "Other", players: [{ name: "Pat", role: "parent" }] } });
    const theirPack = other.json.packs[0].packId;
    expect((await api(`/packs/${theirPack}`, { method: "DELETE" })).status).toBe(200); // starter-trivia exists in the demo family too
    const custom = await api("/packs", { token: "dev-user-other", body: { title: "Secret", kind: "trivia", questions: [dino] } });
    expect((await api(`/packs/${custom.json.pack.packId}`)).json.error).toMatch(/doesn't exist/);
  });
});

describe("Cognito access tokens", () => {
  it("map to the user's household on /parent and /mcp, and bad tokens are refused", async () => {
    const jwt = "aaa.bbb.ccc";
    setVerifier({
      verify: async (t) => {
        if (t !== jwt) throw new Error("bad signature");
        return { sub: "cognito-sub-1", exp: Math.floor(Date.now() / 1000) + 3600 };
      },
    });
    expect((await api("/me", { token: jwt })).json).toEqual({ household: null });
    await api("/household", { token: jwt, body: { showTitle: "The Cloud Family", players: [{ name: "Pat", role: "parent" }] } });
    expect((await api("/me", { token: jwt })).json.household.showTitle).toBe("The Cloud Family");
    expect((await api("/me", { token: "aaa.bbb.ddd" })).status).toBe(401);

    const mcp = (token: string) =>
      app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
    expect((await mcp(jwt)).status).toBe(200);
    expect((await mcp("aaa.bbb.ddd")).status).toBe(401);
  });
});

describe("Alexa+ account linking", () => {
  const mcpCall = (token: string, name: string, args: Record<string, unknown> = {}) =>
    app.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: "a-1", method: "tools/call", params: { name, arguments: args } }),
    });
  const result = async (res: Response) => {
    const line = (await res.text()).split("\n").find((l) => l.startsWith("data: "))!;
    return JSON.parse(line.slice(6)).result as { isError?: boolean; structuredContent: Json; content: Array<{ text: string }> };
  };

  beforeEach(() => {
    // Tokens Alexa+ gets carry aud = this server's /mcp URL (Cognito resource binding).
    setVerifier({
      verify: async (t) => {
        const [sub, aud] = t.split(".");
        return { sub: sub!, exp: Math.floor(Date.now() / 1000) + 3600, aud: aud === "here" ? "http://localhost/mcp" : aud === "none" ? undefined : `https://${aud}/mcp` };
      },
    });
  });

  it("a parent who links by voice first gets a new family with the starter packs, and the host asks who's playing", async () => {
    const token = "voicefirst.here.sig";
    const first = await result(await mcpCall(token, "get_household"));
    expect(first.structuredContent).toMatchObject({ showTitle: "Family Trivia Night", needsPlayers: true, players: [] });
    expect(first.structuredContent.packs.map((p: Json) => p.title).sort()).toEqual(["Starter Riddles", "Starter Trivia"]);
    expect(first.content[0]!.text).toMatch(/ask who's playing/);

    expect((await result(await mcpCall(token, "add_player", { name: "Mom", role: "parent" }))).isError).toBeFalsy();
    const round = await result(await mcpCall(token, "start_round", { mode: "riddle" }));
    expect(round.structuredContent.needsHostQuestion).toBe(false);

    // The same account on the parent page sees that family.
    expect((await api("/me", { token })).json.household.showTitle).toBe("Family Trivia Night");
  });

  it("refuses a token bound to a different resource", async () => {
    expect((await mcpCall("someone.elsewhere.sig", "get_household")).status).toBe(401);
    expect((await mcpCall("someone.none.sig", "get_household")).status).toBe(200);
  });
});
