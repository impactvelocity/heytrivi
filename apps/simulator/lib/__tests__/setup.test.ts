import { describe, expect, it } from "vitest";
import type { Dashboard } from "../parent";
import { familySummary, findPack, setupTools, type ParentCall } from "../setup";

const dash = (): Dashboard =>
  ({
    household: {
      householdId: "demo",
      showTitle: "Jones Trivia Night",
      timeZone: "America/New_York",
      resetSchedule: "weekly",
      periodStart: null,
      nextReset: null,
      phraseSet: true,
      phraseRequiredFor: "spend",
      pointSettings: { correct: 1, partial: 0, wrong: 0 },
      stage: { theme: "showtime", lights: true, celebrate: true, readTwice: false },
    },
    players: [
      { playerId: "mom", name: "Mom", role: "parent", gradeBand: null, balance: 3, lifetime: 9, streak: 0 },
      { playerId: "sally", name: "Sally", role: "kid", gradeBand: "K-2", balance: 2, lifetime: 4, streak: 1 },
    ],
    openChores: [],
    ledger: [],
    rounds: [],
    packs: [
      { packId: "p1", title: "Starter Trivia", topic: "general knowledge", kind: "trivia", status: "ready", failReason: null, paused: false, questionCount: 15, remaining: 15, forPlayerId: null, createdAt: "" },
      { packId: "p2", title: "Starter Riddles", topic: "riddles", kind: "riddle", status: "ready", failReason: null, paused: true, questionCount: 12, remaining: 12, forPlayerId: null, createdAt: "" },
    ],
  }) as Dashboard;

/** A parent API that records calls and answers with the dashboard, or an error. */
function fakeApi(fail?: string) {
  const calls: Array<{ path: string; method?: string; body?: unknown }> = [];
  const call: ParentCall = async (path, opts = {}) => {
    calls.push({ path, ...opts });
    if (fail) throw new Error(fail);
    return dash();
  };
  return { call, calls };
}

const run = (tools: ReturnType<typeof setupTools>, name: string, input: unknown) =>
  (tools[name]!.execute as (i: unknown, o: unknown) => Promise<string>)(input, { toolCallId: "t", messages: [] });

describe("Ask Trivi tools", () => {
  it("finds packs by loose names and refuses ambiguous ones", () => {
    expect(findPack(dash(), "the riddles pack")?.packId).toBe("p2");
    expect(findPack(dash(), "the starter trivia theme")?.packId).toBe("p1");
    expect(findPack(dash(), "trivia")?.packId).toBe("p1");
    expect(findPack(dash(), "starter")).toBeUndefined();
  });

  it("removes a player by name through the parent API, and says so when nobody matches", async () => {
    const { call, calls } = fakeApi();
    const tools = setupTools(call, { dashboard: dash() }, null);
    expect(await run(tools, "remove_player", { name: "sally" })).toBe("Removed Sally.");
    expect(calls).toEqual([{ path: "players/sally", method: "DELETE" }]);
    expect(await run(tools, "remove_player", { name: "Grandpa" })).toMatch(/^Error: nobody called Grandpa/);
  });

  it("pauses a pack, sets points with wrong answers at zero, and passes API errors back", async () => {
    const { call, calls } = fakeApi();
    const tools = setupTools(call, { dashboard: dash() }, null);
    await run(tools, "set_theme_playing", { theme: "Starter Trivia", playing: false });
    await run(tools, "set_points", { correct: 2, partial: 1 });
    expect(calls).toEqual([
      { path: "packs/p1", body: { paused: true } },
      { path: "settings", body: { pointSettings: { correct: 2, partial: 1, wrong: 0 } } },
    ]);
    const failing = setupTools(fakeApi("Just a first name, please.").call, { dashboard: dash() }, null);
    expect(await run(failing, "add_player", { name: "Grandma Jo", role: "parent" })).toBe("Error: Just a first name, please.");
  });

  it("can't draft a pack without models, and tells the model the family", async () => {
    const tools = setupTools(fakeApi().call, { dashboard: dash() }, null);
    expect(await run(tools, "draft_theme", { request: "space", count: 5, kind: "trivia" })).toMatch(/^Error/);
    expect(familySummary(dash())).toContain("Sally (kid, grades K-2)");
    expect(familySummary(dash())).toContain("Starter Riddles (12 questions, paused)");
  });
});
