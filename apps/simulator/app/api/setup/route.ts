/**
 * Ask Trivi (the /demo settings drawer). Takes the chat so far, lets a model
 * make changes through the parent API (lib/setup.ts), and returns the reply,
 * what changed, the updated dashboard, and a pack draft if one was written.
 */

import { generateText, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { parentApiBase, parentToken } from "@/lib/auth";
import { liveAllowed, lockedResponse } from "@/lib/live-access";
import { PROVIDER, languageModel, modelErrorMessage } from "@/lib/model";
import { mockDraft } from "@/lib/pack-helper";
import type { Dashboard } from "@/lib/parent";
import { SETUP_PROMPT, familySummary, setupTools, type ParentCall } from "@/lib/setup";

export const dynamic = "force-dynamic";
// Drafting a pack writes and fact-checks it, about 30 seconds.
export const maxDuration = 60;

const input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) })).min(1).max(20),
});

// Tool use with a parent's family needs a careful model; Haiku is quick and
// follows tool rules well. The pack writer and checker match app/api/pack-draft.
const setupModel = languageModel({ gateway: process.env.SETUP_MODEL_ID ?? "anthropic/claude-haiku-5.5", bedrock: process.env.PACK_BEDROCK_MODEL_ID });
const writer = languageModel({ gateway: process.env.PACK_WRITER_MODEL_ID ?? "anthropic/claude-haiku-5.5", bedrock: process.env.PACK_BEDROCK_MODEL_ID });
const checker = languageModel({ gateway: process.env.PACK_FACT_MODEL_ID ?? "anthropic/claude-sonnet-5.5", bedrock: process.env.PACK_BEDROCK_MODEL_ID });

export async function POST(req: Request) {
  if (!(await liveAllowed())) return lockedResponse();
  const token = await parentToken();
  if (!token) return Response.json({ error: "Sign in on the parent page to change settings." }, { status: 401 });

  const call: ParentCall = async (path, opts = {}) => {
    const res = await fetch(`${parentApiBase()}/parent/${path}`, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Dashboard & { error?: string };
    if (!res.ok) throw new Error(json.error ?? `The game server said ${res.status}.`);
    return json;
  };

  const parsed = input.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ error: "Type what you'd like to set up." }, { status: 400 });

  let state: { dashboard: Dashboard; draft?: ReturnType<typeof mockDraft>; changes?: string[] };
  try {
    state = { dashboard: await call("me") };
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }

  if (process.env.MOCK_MODEL === "1") {
    const draft = mockDraft({ request: parsed.data.messages.at(-1)!.content, count: 4, kind: "mixed", players: [] });
    return Response.json({ reply: "I'm in mock mode, so here's a sample draft. Read it and press Save to add it.", dashboard: state.dashboard, draft, mock: true });
  }

  try {
    const result = await generateText({
      model: setupModel,
      system: `${SETUP_PROMPT}\n\nThe family right now:\n${familySummary(state.dashboard)}`,
      messages: parsed.data.messages as ModelMessage[],
      tools: setupTools(call, state, { writer, checker }),
      stopWhen: stepCountIs(6),
      maxOutputTokens: 500,
      temperature: 0.3,
    });
    const reply = result.text.trim() || "Done.";
    return Response.json({ reply, dashboard: state.dashboard, draft: state.draft ?? null, changes: state.changes ?? [] });
  } catch (err) {
    console.error("setup error", PROVIDER, (err as Error).name, (err as Error).message);
    return Response.json({ error: modelErrorMessage(err), dashboard: state.dashboard }, { status: 502 });
  }
}
