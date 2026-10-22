/**
 * The pack helper: writes a draft question pack from a parent's request, like
 * "my kids are 6 and 8 and learning about dinosaurs, make 6 questions and
 * riddles". Server side only. The parent reviews and edits the draft before
 * saving it, so nothing reaches the family unseen.
 *
 * The steps (R7.3 to R7.6), in two calls from the page so each stays well
 * under a hosting request timeout ("Writing…", then "Double-checking…"):
 *   1. Writer: drafts the questions, answers, accepted answers, a one-line
 *      explanation, and a difficulty, for the players' ages. Refuses topics
 *      that aren't right for children.
 *   2. Checker (blind): answers each question without seeing the answer key.
 *      Catches questions with more than one fitting answer.
 *   3. Fact-checker (runs alongside 2): sees the key and checks the facts in
 *      the question, answer, and explanation. The blind checker can't catch a
 *      wrong fact when it makes the same mistake.
 *   4. Compare: answers that match on the words are agreed; the rest go to a
 *      judge. Anything still in doubt is flagged for the parent with the
 *      reason, instead of being dropped silently.
 */

import { Output, generateText, type LanguageModel } from "ai";
import { z } from "zod";

export type DraftKind = "trivia" | "riddle" | "mixed";

export interface DraftRequest {
  request: string;
  count: number;
  kind: DraftKind;
  players: Array<{ name: string; role: "parent" | "kid"; gradeBand: string | null }>;
}

export interface DraftQuestion {
  kind: "trivia" | "riddle";
  question: string;
  answer: string;
  accept: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  /** Why the parent should look at this one: a different blind answer, or a fact problem. */
  check: { status: "agreed" } | { status: "disputed"; checkerAnswer?: string; problem?: string };
}

export interface Draft {
  title: string;
  topic: string;
  questions: DraftQuestion[];
}

export class NotForKids extends Error {}

const written = z.object({
  suitable: z.boolean().describe("false if the topic isn't right for a family game with children"),
  reason: z.string().describe("If not suitable, one short sentence for the parent saying why. Otherwise empty."),
  title: z.string().describe("A short, fun theme name, 2 to 4 words, like Dinosaur Discoveries"),
  topic: z.string().describe("The topic in a few words"),
  questions: z.array(
    z.object({
      kind: z.enum(["trivia", "riddle"]),
      question: z.string(),
      answer: z.string().describe("The right answer, 1 to 4 words"),
      accept: z.array(z.string()).describe("Other answers that also count: other names, spellings, singular or plural"),
      explanation: z.string().describe("One fun sentence to say after the answer"),
      difficulty: z.enum(["easy", "medium", "hard"]),
    }),
  ),
});

const checked = z.object({ answers: z.array(z.object({ n: z.number(), answer: z.string() })) });
const judged = z.object({ verdicts: z.array(z.object({ n: z.number(), same: z.boolean() })) });
const reviewed = z.object({
  reviews: z.array(
    z.object({
      n: z.number(),
      accurate: z.boolean().describe("Every fact in the question, answer, and explanation is true"),
      oneAnswer: z.boolean().describe("Only the given answer (or the accepted ones) fits the question"),
      problem: z.string().describe("If either is false, one short sentence a parent can act on. Otherwise empty."),
    }),
  ),
});

const WRITER = `You write question packs for Hey Trivi, a family trivia game played out loud on a voice assistant in a kitchen. A parent describes what they want; you write the questions.

Every question must:
- Work heard aloud: read in under 15 seconds, no pictures, no tables, no "which of these" lists, no lettered choices. "Is it X or Y?" is fine for young children.
- Have one clear right answer of 1 to 4 words that a child can say. If more than one thing could fit, add a detail so only one does. In "accept", list every other way a child might say it, including the everyday name (T. rex, pterodactyl, long-neck dinosaur).
- Be accurate. Skip facts that experts still argue about or that changed recently.
- Fit the players' ages. For ages 5 to 8 (grades K-2), use short sentences, everyday words, and well-known facts. For ages 8 to 11 (grades 3-5), a little harder. Mix easy and medium; use hard only for older kids.
- Be kind and fun: nothing scary, gory, or upsetting, no trick questions, no jokes at anyone's expense.

Riddles are original, in the "I have ... I can ... What am I?" style, with one answer a child could reach by thinking.

The explanation is one short, fun, true fact the host says after revealing the answer. It is never praise: don't start with "Great job", "Yes", "Correct", or "That's right", because nobody may have got it.

If the request isn't right for a family game with children, set suitable to false, give a short reason, and return no questions.`;

const CHECKER = `You are a bright 10-year-old playing a trivia game. Answer each question in a few words. If you don't know, give your best guess. Answer every question.`;

const FACT_CHECKER = `You fact-check a children's trivia pack before a parent sees it. For each item, check that every fact in the question, the answer, and the explanation is true, and that only the given answer (or an accepted answer) fits the question. Be strict about facts: sizes, numbers, what an animal ate, when it lived. Flag anything that's false, misleading for a child, or that more than one answer would fit.`;

const JUDGE = `You check a trivia game's answer key. For each item, decide whether the player's answer means the same thing as the expected answer or any of the accepted answers. Be generous with wording, spelling, articles, and singular or plural. Say same=false only when they name a different thing or give a different fact.`;

/** Lower case, no articles or punctuation: "The T. rex!" → "t rex". */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\b(a|an|the|its|it's|it is)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "");
}

/** True when the checker's answer obviously matches the key, with no model call. */
export function answersMatch(expected: string[], got: string): boolean {
  const g = normalizeAnswer(got);
  if (!g) return false;
  return expected.some((e) => {
    const n = normalizeAnswer(e);
    const words = (x: string) => ` ${x} `;
    // Whole words at any length ("they laid eggs"), substrings once long enough ("triceratops").
    return n === g || words(g).includes(words(n)) || words(n).includes(words(g)) || (n.length >= 5 && g.includes(n));
  });
}

export function describeRequest(r: DraftRequest): string {
  const kids = r.players.filter((p) => p.role === "kid");
  const who = kids.length
    ? `Players: ${kids.map((p) => `${p.name}${p.gradeBand ? ` (grades ${p.gradeBand})` : ""}`).join(", ")}, plus the grown-ups.`
    : "Players: the family.";
  const mix =
    r.kind === "mixed"
      ? `Write exactly ${r.count} items, about half trivia questions and half riddles.`
      : r.kind === "riddle"
        ? `Write exactly ${r.count} riddles.`
        : `Write exactly ${r.count} trivia questions.`;
  return `Parent's request: ${r.request.trim()}\n${who}\n${mix}`;
}

/** Step 1: the writer. Returns questions not yet checked (check: agreed). */
export async function writeDraft(model: LanguageModel, req: DraftRequest): Promise<Draft> {
  const { output: draft } = await generateText({
    model,
    system: WRITER,
    prompt: describeRequest(req),
    output: Output.object({ schema: written }),
    temperature: 0.7,
    // About 250 tokens a question, with room to spare. Running out means no output at all.
    maxOutputTokens: 1000 + req.count * 500,
  });
  if (!draft) throw new Error("The helper didn't return any questions. Try again.");
  if (!draft.suitable) throw new NotForKids(draft.reason || "That topic isn't a good fit for a family game with kids.");
  const questions = draft.questions
    .filter((q) => q.question.trim() && q.answer.trim())
    .slice(0, req.count)
    .map((q) => ({
      ...q,
      kind: req.kind === "mixed" ? q.kind : req.kind,
      accept: q.accept.filter((a) => a.trim() && normalizeAnswer(a) !== normalizeAnswer(q.answer)),
      check: { status: "agreed" as const },
    }));
  if (!questions.length) throw new Error("The helper didn't return any questions. Try again.");
  return { title: draft.title.trim().slice(0, 60) || "New theme", topic: draft.topic.trim().slice(0, 120), questions };
}

/**
 * Steps 2 to 4: the blind checker and the fact-checker side by side, then the
 * judge for answers that don't obviously match. `quick` answers and judges;
 * `careful` checks facts. Returns one check per question, in order.
 */
export async function checkDraft(
  models: { quick: LanguageModel; careful: LanguageModel },
  questions: QuestionToCheck[],
): Promise<DraftQuestion["check"][]> {
  const numbered = questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n");
  const withKey = questions
    .map((q, i) => `${i + 1}. ${q.question}\nAnswer: ${q.answer}${q.accept.length ? ` (also: ${q.accept.join(", ")})` : ""}\nExplanation: ${q.explanation}`)
    .join("\n\n");
  const [{ output: checker }, { output: review }] = await Promise.all([
    generateText({ model: models.quick, system: CHECKER, prompt: numbered, output: Output.object({ schema: checked }), temperature: 0, maxOutputTokens: 500 + questions.length * 100 }),
    generateText({ model: models.careful, system: FACT_CHECKER, prompt: withKey, output: Output.object({ schema: reviewed }), temperature: 0, maxOutputTokens: 1000 + questions.length * 250 }),
  ]);
  const theirs = new Map((checker?.answers ?? []).map((a) => [a.n, a.answer]));
  const problems = new Map(
    (review?.reviews ?? []).filter((r) => !r.accurate || !r.oneAnswer).map((r) => [r.n, r.problem.trim() || (r.accurate ? "Another answer might fit too." : "A fact here may be wrong.")]),
  );

  const unclear = questions.map((q, i) => ({ n: i + 1, q, got: theirs.get(i + 1) ?? "" })).filter((x) => !answersMatch([x.q.answer, ...x.q.accept], x.got));
  const disputed = new Map<number, string>();
  if (unclear.length) {
    const { output: judge } = await generateText({
      model: models.quick,
      system: JUDGE,
      prompt: unclear
        .map((x) => `${x.n}. Question: ${x.q.question}\nExpected: ${x.q.answer}${x.q.accept.length ? ` (also: ${x.q.accept.join(", ")})` : ""}\nPlayer said: ${x.got || "(no answer)"}`)
        .join("\n\n"),
      output: Output.object({ schema: judged }),
      temperature: 0,
      maxOutputTokens: 300 + unclear.length * 60,
    });
    const same = new Map((judge?.verdicts ?? []).map((v) => [v.n, v.same]));
    for (const x of unclear) if (same.get(x.n) !== true) disputed.set(x.n, x.got);
  }

  return questions.map((_, i) => {
    const n = i + 1;
    if (!disputed.has(n) && !problems.has(n)) return { status: "agreed" };
    return { status: "disputed", checkerAnswer: disputed.has(n) ? disputed.get(n) || "(no answer)" : undefined, problem: problems.get(n) };
  });
}

export type QuestionToCheck = Pick<DraftQuestion, "question" | "answer" | "accept" | "explanation">;

/** MOCK_MODEL=1: a fixed sample, so the page works with no model. */
export function mockDraft(req: DraftRequest): Draft {
  const sample: DraftQuestion[] = [
    { kind: "trivia", question: "Which dinosaur had three horns on its face?", answer: "Triceratops", accept: [], explanation: "Its name means three-horned face.", difficulty: "easy", check: { status: "agreed" } },
    { kind: "riddle", question: "I have a very long neck, I eat leaves from the treetops, and I'm as big as a house. What kind of dinosaur am I?", answer: "a long-neck dinosaur", accept: ["sauropod", "brachiosaurus", "brontosaurus", "apatosaurus"], explanation: "Long-necked dinosaurs called sauropods were the biggest animals ever to walk on land.", difficulty: "easy", check: { status: "agreed" } },
    { kind: "trivia", question: "Did Tyrannosaurus rex have big arms or tiny arms?", answer: "tiny arms", accept: ["small arms", "tiny", "small"], explanation: "Its arms were about as long as a grown-up's arm, on a body as long as a bus.", difficulty: "easy", check: { status: "agreed" } },
    { kind: "riddle", question: "I'm hard, I'm found in rock, and I show where a dinosaur once was. What am I?", answer: "a fossil", accept: ["fossils", "dinosaur bone", "bones"], explanation: "Fossils form when bones or footprints slowly turn to stone.", difficulty: "medium", check: { status: "agreed" } },
    { kind: "trivia", question: "Did dinosaurs lay eggs or have live babies?", answer: "eggs", accept: ["lay eggs", "they laid eggs"], explanation: "Every dinosaur hatched from an egg, just like birds do today.", difficulty: "easy", check: { status: "agreed" } },
    { kind: "trivia", question: "Which animals alive today are the closest relatives of dinosaurs?", answer: "birds", accept: ["bird", "chickens"], explanation: "Birds are living dinosaurs, so a chicken is a tiny cousin of T. rex.", difficulty: "medium", check: { status: "disputed", checkerAnswer: "crocodiles", problem: "Crocodiles are close relatives too, so say “the closest relatives” clearly or accept both." } },
  ];
  const fit = sample.filter((q) => req.kind === "mixed" || q.kind === req.kind);
  return { title: "Dinosaur Discoveries (sample)", topic: "dinosaurs", questions: fit.slice(0, req.count) };
}
