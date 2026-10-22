/**
 * The pack helper's endpoint: a signed-in parent describes a pack, and gets
 * back a draft to review. Two stages, called one after the other by the page:
 * "write" returns the draft, "check" returns a check per question. Nothing is
 * saved here; the page saves the reviewed pack through the parent API.
 */

import { z } from "zod";
import { accessToken, parentApiBase } from "@/lib/auth";
import { demoOnly, liveAllowed, lockedResponse } from "@/lib/live-access";
import { PROVIDER, languageModel, modelErrorMessage } from "@/lib/model";
import { NotForKids, checkDraft, mockDraft, writeDraft } from "@/lib/pack-helper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const writeInput = z.object({
  stage: z.literal("write"),
  request: z.string().trim().min(3).max(600),
  // 10 keeps each step near 20 seconds. Parents can add more by hand or ask again.
  count: z.number().int().min(1).max(10),
  kind: z.enum(["trivia", "riddle", "mixed"]),
  players: z
    .array(z.object({ name: z.string().max(20), role: z.enum(["parent", "kid"]), gradeBand: z.string().max(5).nullable() }))
    .max(12)
    .default([]),
});
const checkInput = z.object({
  stage: z.literal("check"),
  questions: z
    .array(z.object({ question: z.string().max(400), answer: z.string().max(120), accept: z.array(z.string().max(120)).max(12), explanation: z.string().max(400) }))
    .min(1)
    .max(10),
});
const input = z.discriminatedUnion("stage", [writeInput, checkInput]);

// Facts for children need stronger models than the host's: in testing, Nova 2
// Lite wrote that T. rex walked on four legs and its own fact-check missed it
// (docs/decisions.md #26). A fast model writes and answers blind, so each call
// stays well under a hosting timeout; a careful one checks the facts.
// Override with PACK_WRITER_MODEL_ID and PACK_FACT_MODEL_ID (gateway) or
// PACK_BEDROCK_MODEL_ID (Bedrock).
const fastModel = languageModel({ gateway: process.env.PACK_WRITER_MODEL_ID ?? "anthropic/claude-haiku-5.5", bedrock: process.env.PACK_BEDROCK_MODEL_ID });
const carefulModel = languageModel({ gateway: process.env.PACK_FACT_MODEL_ID ?? "anthropic/claude-sonnet-5.5", bedrock: process.env.PACK_BEDROCK_MODEL_ID });

export async function POST(req: Request) {
  // DEMO=1: the parent page's demo gets the fixed sample, with no model call.
  if (demoOnly()) {
    const parsed = input.safeParse(await req.json().catch(() => undefined));
    if (!parsed.success) return Response.json({ error: "Tell the helper what the questions should be about." }, { status: 400 });
    const body = parsed.data;
    return body.stage === "write"
      ? Response.json({ draft: mockDraft(body), mock: true })
      : Response.json({ checks: body.questions.map(() => ({ status: "agreed" })), mock: true });
  }
  if (!(await liveAllowed())) return lockedResponse();
  // Only a signed-in parent may spend model calls. The parent API checks the token.
  const token = await accessToken();
  const ok = token && (await fetch(`${parentApiBase()}/parent/session`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null))?.ok;
  if (!ok) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = input.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ error: "Tell the helper what the questions should be about." }, { status: 400 });

  const body = parsed.data;
  if (process.env.MOCK_MODEL === "1") {
    return body.stage === "write"
      ? Response.json({ draft: mockDraft(body), mock: true })
      : Response.json({ checks: body.questions.map(() => ({ status: "agreed" })), mock: true });
  }

  try {
    if (body.stage === "write") return Response.json({ draft: await writeDraft(fastModel, body) });
    return Response.json({ checks: await checkDraft({ quick: fastModel, careful: carefulModel }, body.questions) });
  } catch (err) {
    if (err instanceof NotForKids) return Response.json({ error: err.message }, { status: 422 });
    console.error("pack helper error", PROVIDER, (err as Error).name, (err as Error).message);
    return Response.json({ error: modelErrorMessage(err) }, { status: 502 });
  }
}
