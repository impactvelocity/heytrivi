/**
 * "Ask Trivi" in the /demo settings drawer: a parent sets things up by asking
 * ("add Grandma", "make a space theme for a 7-year-old", "read questions
 * twice"). A model picks from the tools here, and each tool calls the parent
 * API, so a change lands in the same store the game plays from.
 *
 * Themes (packs, in the code) are drafted, never saved here: the writer and fact-checker from the
 * pack helper (lib/pack-helper.ts) make a draft, and the parent saves it from
 * the drawer after reading it.
 */

import { tool, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";
import { checkDraft, writeDraft, type Draft } from "./pack-helper";
import type { Dashboard } from "./parent";

/** Calls the parent API with the parent's token. Throws the API's message on an error. */
export type ParentCall = (path: string, opts?: { method?: "GET" | "POST" | "DELETE"; body?: unknown }) => Promise<Dashboard>;

export const SETUP_PROMPT = `You are Trivi, helping a parent set up Hey Trivi, a family trivia game played by voice. You are in the settings screen, not the game.

Make changes only with the tools, then confirm what changed in one or two short, friendly sentences. Plain text, no markdown.
- Players are a first name, kid or grown-up, and for kids an optional grade band. Ask nothing else about a child.
- Remove a player only when the parent asks for that by name.
- A theme is a set of questions and riddles on one topic. For a new theme, call draft_theme. It is not saved yet: tell the parent to read it and press Save.
- Points: right answers can be worth 0 to 10 and close answers 0 to 10. There is no weekend or per-player scoring; say so and offer what exists.
- Riddle difficulty per player isn't a setting. Offer to draft a harder theme for the grown-ups instead.
- If a tool returns an error, say it in your own words.
- Earlier replies' changes are already made and show in the family below; each says what it changed in "(Changes made: ...)". Don't redo or take back earlier turns.`;

/** The family as the model sees it, kept short. */
export function familySummary(d: Dashboard): string {
  const h = d.household;
  const players = d.players.map((p) => `${p.name} (${p.role === "kid" ? `kid${p.gradeBand ? `, grades ${p.gradeBand}` : ""}` : "grown-up"})`);
  const packs = d.packs.map((p) => `${p.title} (${p.questionCount} questions${p.paused ? ", paused" : ""})`);
  return [
    `Show name: ${h.showTitle}.`,
    `Players: ${players.join(", ") || "none yet"}.`,
    `Themes: ${packs.join(", ") || "none"}.`,
    `Points: ${h.pointSettings.correct} for right, ${h.pointSettings.partial} for close. Scores reset: ${h.resetSchedule}.`,
    `Read questions twice: ${h.stage.readTwice ? "on" : "off"}. Celebrate scores: ${h.stage.celebrate ? "on" : "off"}. Marquee lights: ${h.stage.lights ? "on" : "off"}.`,
  ].join("\n");
}

const norm = (s: string) => s.trim().toLowerCase().replace(/^the /, "").replace(/ (pack|theme)$/, "");

/** A pack by what the parent called it, or undefined if none or several match. */
export function findPack(d: Dashboard, ref: string): Dashboard["packs"][number] | undefined {
  const want = norm(ref);
  const exact = d.packs.find((p) => norm(p.title) === want);
  if (exact) return exact;
  const loose = d.packs.filter((p) => want.length >= 3 && (norm(p.title).includes(want) || p.topic.toLowerCase().includes(want)));
  return loose.length === 1 ? loose[0] : undefined;
}

/**
 * The tools, bound to one request. `state.dashboard` follows every change so
 * later tools and the reply see it; `state.changes` lists what changed, and
 * `state.draft` holds a pack draft.
 */
export function setupTools(
  call: ParentCall,
  state: { dashboard: Dashboard; draft?: Draft; changes?: string[] },
  models: { writer: LanguageModel; checker: LanguageModel } | null,
): ToolSet {
  /** Run a change; the model gets a short result or the API's error. */
  const change = async (fn: () => Promise<Dashboard>, done: string) => {
    try {
      state.dashboard = await fn();
      (state.changes ??= []).push(done);
      return done;
    } catch (err) {
      return `Error: ${(err as Error).message}`;
    }
  };
  const player = (name: string) => state.dashboard.players.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  return {
    add_player: tool({
      description: "Add a player to the family.",
      inputSchema: z.object({
        name: z.string().describe("First name only"),
        role: z.enum(["kid", "parent"]).describe("parent means any grown-up"),
        gradeBand: z.enum(["K-2", "3-5", "6-8", "9-12"]).optional().describe("For kids, only if the parent says"),
      }),
      execute: async (a) =>
        change(() => call("players", { body: a }), `Added ${a.name}.`),
    }),
    remove_player: tool({
      description: "Remove a player and their points. Only when the parent asks by name.",
      inputSchema: z.object({ name: z.string() }),
      execute: async ({ name }) => {
        const p = player(name);
        if (!p) return `Error: nobody called ${name} is playing.`;
        return change(() => call(`players/${p.playerId}`, { method: "DELETE" }), `Removed ${p.name}.`);
      },
    }),
    rename_show: tool({
      description: "Change the show's name, like 'The Jones Family Trivia Night'.",
      inputSchema: z.object({ title: z.string() }),
      execute: async ({ title }) => change(() => call("settings", { body: { showTitle: title } }), `Renamed to ${title}.`),
    }),
    set_reset_schedule: tool({
      description: "How often points go back to zero.",
      inputSchema: z.object({ schedule: z.enum(["never", "weekly", "monthly"]) }),
      execute: async ({ schedule }) =>
        change(() => call("settings", { body: { resetSchedule: schedule } }), `Scores now reset: ${schedule}.`),
    }),
    set_points: tool({
      description: "Points for a right answer and for a close one.",
      inputSchema: z.object({ correct: z.number().int().min(0).max(10), partial: z.number().int().min(0).max(10) }),
      execute: async (p) =>
        change(() => call("settings", { body: { pointSettings: { ...p, wrong: 0 } } }), `Right answers are worth ${p.correct}, close ones ${p.partial}.`),
    }),
    set_show_options: tool({
      description: "Read questions twice (for little ones), celebrate scores with lights, or turn the marquee lights on or off.",
      inputSchema: z.object({ readTwice: z.boolean().optional(), celebrate: z.boolean().optional(), lights: z.boolean().optional() }),
      execute: async (stage) =>
        change(() => call("settings", { body: { stage } }), "Show options updated."),
    }),
    set_theme_playing: tool({
      description: "Put a theme in the mix or take it out. A paused theme still plays when someone asks for it by name.",
      inputSchema: z.object({ theme: z.string(), playing: z.boolean() }),
      execute: async ({ theme, playing }) => {
        const p = findPack(state.dashboard, theme);
        if (!p) return `Error: which theme? There are ${state.dashboard.packs.map((x) => x.title).join(", ")}.`;
        return change(() => call(`packs/${p.packId}`, { body: { paused: !playing } }), `${p.title} is ${playing ? "in the mix" : "paused"}.`);
      },
    }),
    draft_theme: tool({
      description: "Write a new theme as a draft for the parent to review. Nothing is saved.",
      inputSchema: z.object({
        request: z.string().describe("What the theme is about and who it's for, in the parent's words"),
        count: z.number().int().min(3).max(10),
        kind: z.enum(["trivia", "riddle", "mixed"]),
      }),
      execute: async (a) => {
        if (!models) return "Error: the theme writer isn't available right now.";
        try {
          const players = state.dashboard.players.map((p) => ({ name: p.name, role: p.role, gradeBand: p.gradeBand }));
          const draft = await writeDraft(models.writer, { ...a, players });
          const checks = await checkDraft({ quick: models.writer, careful: models.checker }, draft.questions);
          draft.questions = draft.questions.map((q, i) => ({ ...q, check: checks[i] ?? q.check }));
          state.draft = draft;
          const flagged = checks.filter((c) => c.status === "disputed").length;
          return `Draft "${draft.title}" with ${draft.questions.length} questions is on screen for the parent to read and save.${flagged ? ` The fact-check flagged ${flagged}.` : ""}`;
        } catch (err) {
          return `Error: ${(err as Error).message}`;
        }
      },
    }),
  };
}
