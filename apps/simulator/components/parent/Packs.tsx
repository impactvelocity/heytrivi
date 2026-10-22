"use client";

/**
 * Themes (R6.2, R7.2): a parent makes a theme, a set of questions and riddles
 * (a "pack" in the code), by hand or with the pack helper, and edits it later.
 * The family plays it by name: "Trivi, play the dinosaur theme."
 */

import { useEffect, useState } from "react";
import {
  PACK_KIND_LABEL,
  dateLabel,
  dayKey,
  parentApi,
  type Dashboard,
  type Draft,
  type DraftQuestion,
  type PackDetail,
  type PackKind,
  type QuestionInput,
} from "@/lib/parent";
import type { Run } from "./ParentApp";
import { Avatar } from "./ui";

type View = { type: "list" } | { type: "helper" } | { type: "draft"; draft: Draft; fromHelper: boolean } | { type: "pack"; packId: string };
type WithPack = Dashboard & { pack?: PackDetail };

const EXAMPLE = "My kids are 6 and 8 and they're learning a lot about dinosaurs. Make questions and riddles about dinosaurs.";

const blankQuestion = (kind: PackKind): QuestionInput => ({
  kind: kind === "riddle" ? "riddle" : "trivia",
  question: "",
  answer: "",
  accept: [],
  explanation: "",
  difficulty: "easy",
});

export function PacksTab({ data, run }: { data: Dashboard; run: Run }) {
  const [view, setView] = useState<View>({ type: "list" });

  if (view.type === "helper") {
    return <Helper data={data} onBack={() => setView({ type: "list" })} onDraft={(draft) => setView({ type: "draft", draft, fromHelper: true })} />;
  }
  if (view.type === "draft") {
    return (
      <DraftEditor
        data={data}
        run={run}
        draft={view.draft}
        fromHelper={view.fromHelper}
        onBack={() => setView(view.fromHelper ? { type: "helper" } : { type: "list" })}
        onSaved={(packId) => setView({ type: "pack", packId })}
      />
    );
  }
  if (view.type === "pack") {
    return <PackEditor data={data} run={run} packId={view.packId} onBack={() => setView({ type: "list" })} />;
  }

  const tz = data.household.timeZone;
  const forName = (id: string | null) => data.players.find((p) => p.playerId === id)?.name;
  return (
    <div className="pp-stack">
      <section className="pp-card pp-pack-start">
        <div>
          <h2>Make a theme</h2>
          <p className="pp-muted pp-semibold">
            A theme is a set of questions and riddles on one topic. Trivi plays it when someone says &ldquo;play the dinosaur theme&rdquo;, and announces new themes at the next game.
          </p>
        </div>
        <div className="pp-row">
          <button type="button" className="pp-btn-primary" onClick={() => setView({ type: "helper" })}>
            Ask the helper to write one
          </button>
          <button type="button" onClick={() => setView({ type: "draft", draft: { title: "", topic: "", questions: [] }, fromHelper: false })}>
            Write my own
          </button>
        </div>
      </section>

      <div className="pp-pack-grid">
        {data.packs.map((p) => (
          <button key={p.packId} type="button" className="pp-pack-card" onClick={() => setView({ type: "pack", packId: p.packId })}>
            <span className="pp-pack-title">{p.title}</span>
            <span className="pp-row pp-pack-tags">
              <span className={`pp-tag pp-tag-${p.kind}`}>{PACK_KIND_LABEL[p.kind]}</span>
              {forName(p.forPlayerId) && <span className="pp-tag">For {forName(p.forPlayerId)}</span>}
              {p.status !== "ready" && <span className="pp-tag pp-tag-chore">{p.status === "building" ? "Being written" : "Didn't work"}</span>}
            </span>
            <span className="pp-pack-count pp-num">
              <b>{p.remaining}</b> of {p.questionCount} left to ask
            </span>
            <span className="pp-bar">
              <span style={{ width: `${p.questionCount ? (p.remaining / p.questionCount) * 100 : 0}%`, background: "var(--lavender)" }} />
            </span>
            <span className="pp-small pp-muted">Made {dateLabel(dayKey(p.createdAt, tz))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The helper: describe the theme, get a draft to review
// ---------------------------------------------------------------------------

function Helper({ data, onBack, onDraft }: { data: Dashboard; onBack: () => void; onDraft: (d: Draft) => void }) {
  const kids = data.players.filter((p) => p.role === "kid");
  const [request, setRequest] = useState("");
  const [count, setCount] = useState(6);
  const [kind, setKind] = useState<PackKind>("mixed");
  const [forIds, setForIds] = useState<string[]>(kids.map((k) => k.playerId));
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (request.trim().length < 3) return setProblem("Tell the helper what the questions should be about.");
    setBusy(true);
    setProblem(null);
    try {
      const players = data.players
        .filter((p) => p.role === "parent" || forIds.includes(p.playerId))
        .map((p) => ({ name: p.name, role: p.role, gradeBand: p.gradeBand }));
      const call = async <T,>(body: unknown): Promise<T> => {
        const res = await fetch("/api/pack-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const json = (await res.json().catch(() => ({}))) as T & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "The helper couldn't write that theme. Try again.");
        return json;
      };
      setStage("Writing the questions…");
      const { draft } = await call<{ draft: Draft }>({ stage: "write", request, count, kind, players });
      setStage("Double-checking every answer…");
      const { checks } = await call<{ checks: DraftQuestion["check"][] }>({
        stage: "check",
        questions: draft.questions.map(({ question, answer, accept, explanation }) => ({ question, answer, accept, explanation })),
      });
      const json = { draft: { ...draft, questions: draft.questions.map((q, i) => ({ ...q, check: checks[i] ?? q.check })) } };
      onDraft(json.draft);
    } catch (err) {
      setProblem((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="pp-card pp-narrow">
      <button type="button" className="pp-btn-quiet pp-back" onClick={onBack}>
        ← Themes
      </button>
      <h2>Ask the helper</h2>
      <p className="pp-muted pp-semibold pp-lead">
        Say what you want in your own words. The helper writes the questions, then answers each one without peeking to catch mistakes. You review everything before it&apos;s saved.
      </p>
      <form className="pp-stack" onSubmit={submit}>
        <label className="pp-field">
          What should it be about?
          <textarea id="helper-request" rows={4} maxLength={600} value={request} placeholder={EXAMPLE} onChange={(e) => setRequest(e.target.value)} />
        </label>
        {!request && (
          <button type="button" className="pp-btn-quiet pp-example" onClick={() => setRequest(EXAMPLE)}>
            Use this example
          </button>
        )}
        <div className="pp-two">
          <label className="pp-field">
            How many
            <select id="helper-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="pp-field">
            Kind
            <select id="helper-kind" value={kind} onChange={(e) => setKind(e.target.value as PackKind)}>
              <option value="mixed">Questions and riddles</option>
              <option value="trivia">Questions</option>
              <option value="riddle">Riddles</option>
            </select>
          </label>
        </div>
        {kids.length > 0 && (
          <div className="pp-field">
            Who it&apos;s for
            <span className="pp-hint">The helper pitches the questions at their grade.</span>
            <div className="pp-row">
              {kids.map((k) => {
                const on = forIds.includes(k.playerId);
                return (
                  <button
                    key={k.playerId}
                    type="button"
                    className="pp-chipbtn"
                    aria-pressed={on}
                    onClick={() => setForIds(on ? forIds.filter((x) => x !== k.playerId) : [...forIds, k.playerId])}
                  >
                    <Avatar player={k} small /> {k.name}
                    {k.gradeBand ? ` · ${k.gradeBand}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {problem && <p className="pp-alert">{problem}</p>}
        <button type="submit" className="pp-btn-primary" disabled={busy}>
          {busy ? stage || "Working…" : `Write ${count} for me`}
        </button>
        {busy && <p className="pp-small pp-muted">This takes 20 to 40 seconds.</p>}
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// A new theme, from the helper or by hand, before it's saved
// ---------------------------------------------------------------------------

function DraftEditor({
  data,
  run,
  draft,
  fromHelper,
  onBack,
  onSaved,
}: {
  data: Dashboard;
  run: Run;
  draft: Draft;
  fromHelper: boolean;
  onBack: () => void;
  onSaved: (packId: string) => void;
}) {
  const kinds = new Set(draft.questions.map((q) => q.kind));
  const [title, setTitle] = useState(draft.title);
  const [kind, setKind] = useState<PackKind>(kinds.size > 1 ? "mixed" : (draft.questions[0]?.kind ?? "mixed"));
  const [forId, setForId] = useState<string>("");
  const [questions, setQuestions] = useState<DraftQuestion[]>(draft.questions);
  const [editing, setEditing] = useState<number | null>(draft.questions.length ? null : -1);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return setProblem("Give the theme a name.");
    if (!questions.length) return setProblem("Add at least one question.");
    setBusy(true);
    let packId: string | undefined;
    const ok = await run(async () => {
      const r = await parentApi<WithPack>("packs", {
        body: {
          title,
          topic: draft.topic || title,
          kind,
          forPlayerId: forId || undefined,
          questions: questions.map(({ check: _c, ...q }) => q),
        },
      });
      packId = r.pack?.packId;
      return r;
    }, `Saved ${title.trim()}`);
    setBusy(false);
    if (ok && packId) onSaved(packId);
  };

  const disputed = questions.filter((q) => q.check.status === "disputed").length;

  return (
    <div className="pp-stack pp-narrow">
      <section className="pp-card">
        <button type="button" className="pp-btn-quiet pp-back" onClick={onBack}>
          ← {fromHelper ? "Change the request" : "Themes"}
        </button>
        <h2>{fromHelper ? "Review the theme" : "Write a theme"}</h2>
        {fromHelper && (
          <p className="pp-muted pp-semibold pp-lead">
            Edit anything you like, remove what doesn&apos;t fit, then save.
            {disputed > 0 && ` The double-check flagged ${disputed} ${disputed === 1 ? "question" : "questions"}, so look at ${disputed === 1 ? "that one" : "those"} first.`}
          </p>
        )}
        <PackMeta data={data} title={title} setTitle={setTitle} kind={kind} setKind={setKind} forId={forId} setForId={setForId} />
      </section>

      <QuestionList
        kind={kind}
        questions={questions}
        editing={editing}
        setEditing={setEditing}
        busy={busy}
        onSave={async (i, q) => {
          const next = [...questions];
          if (i === -1) next.push({ ...q, check: { status: "agreed" } });
          else next[i] = { ...q, check: { status: "agreed" } };
          setQuestions(next);
          setEditing(null);
        }}
        onDelete={async (i) => setQuestions(questions.filter((_, j) => j !== i))}
      />

      {problem && <p className="pp-alert">{problem}</p>}
      <div className="pp-row pp-save-row">
        <button type="button" className="pp-btn-primary" disabled={busy || editing !== null} onClick={save}>
          {busy ? "Saving…" : `Save theme (${questions.length})`}
        </button>
        {editing !== null && <span className="pp-small pp-muted">Finish the question you&apos;re editing first.</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A saved theme: every change saves straight away
// ---------------------------------------------------------------------------

function PackEditor({ data, run, packId, onBack }: { data: Dashboard; run: Run; packId: string; onBack: () => void }) {
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    parentApi<{ pack: PackDetail }>(`packs/${packId}`)
      .then((r) => {
        setPack(r.pack);
        setTitle(r.pack.title);
      })
      .catch((err: Error) => setProblem(err.message));
  }, [packId]);

  const act = async (call: () => Promise<WithPack>, done: string) => {
    setBusy(true);
    let next: PackDetail | undefined;
    const ok = await run(async () => {
      const r = await call();
      next = r.pack;
      return r;
    }, done);
    setBusy(false);
    if (next) setPack(next);
    return ok;
  };

  if (problem) return <p className="pp-alert">{problem}</p>;
  if (!pack) return <p className="pp-loading">Loading the theme…</p>;

  const used = pack.questions.filter((q) => q.used).length;
  const summary = data.packs.find((p) => p.packId === packId);
  return (
    <div className="pp-stack pp-narrow">
      <section className="pp-card">
        <button type="button" className="pp-btn-quiet pp-back" onClick={onBack}>
          ← Themes
        </button>
        <PackMeta
          data={data}
          title={title}
          setTitle={setTitle}
          onTitleSave={() => title.trim() !== pack.title && act(() => parentApi(`packs/${packId}`, { body: { title } }), "Renamed")}
          kind={pack.kind}
          setKind={(k) => act(() => parentApi(`packs/${packId}`, { body: { kind: k } }), "Saved")}
          forId={pack.forPlayerId ?? ""}
          setForId={(id) => act(() => parentApi(`packs/${packId}`, { body: { forPlayerId: id || null } }), "Saved")}
        />
        <p className="pp-note">
          Say &ldquo;Trivi, play the {pack.title} theme&rdquo;. {summary?.remaining ?? pack.questions.length - used} of {pack.questions.length} haven&apos;t been asked yet.
        </p>
        <div className="pp-row" style={{ marginTop: 14 }}>
          {used > 0 && (
            <button type="button" disabled={busy} onClick={() => act(() => parentApi(`packs/${packId}/replay`, { body: {} }), "Every question can be asked again")}>
              Play them all again
            </button>
          )}
          {!confirmDelete ? (
            <button type="button" className="pp-btn-quiet" onClick={() => setConfirmDelete(true)}>
              Delete theme
            </button>
          ) : (
            <div className="pp-confirm" style={{ width: "100%" }}>
              Delete {pack.title} and its {pack.questions.length} questions? This can&apos;t be undone.
              <div className="pp-row">
                <button
                  type="button"
                  className="pp-btn-danger"
                  disabled={busy}
                  onClick={async () => {
                    if (await act(() => parentApi(`packs/${packId}`, { method: "DELETE" }), `Deleted ${pack.title}`)) onBack();
                  }}
                >
                  Delete
                </button>
                <button type="button" className="pp-btn-quiet" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <QuestionList
        kind={pack.kind}
        questions={pack.questions}
        editing={editing}
        setEditing={setEditing}
        busy={busy}
        onSave={async (i, q) => {
          const ok =
            i === -1
              ? await act(() => parentApi(`packs/${packId}/questions`, { body: { questions: [q] } }), "Question added")
              : await act(() => parentApi(`packs/${packId}/questions/${pack.questions[i]!.n}`, { body: q }), "Question saved");
          if (ok) setEditing(null);
        }}
        onDelete={async (i) => {
          await act(() => parentApi(`packs/${packId}/questions/${pack.questions[i]!.n}`, { method: "DELETE" }), "Question removed");
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function PackMeta(props: {
  data: Dashboard;
  title: string;
  setTitle: (t: string) => void;
  onTitleSave?: () => void;
  kind: PackKind;
  setKind: (k: PackKind) => void;
  forId: string;
  setForId: (id: string) => void;
}) {
  const kids = props.data.players.filter((p) => p.role === "kid");
  return (
    <div className="pp-stack pp-pack-meta">
      <label className="pp-field">
        Theme name
        <span className="pp-hint">What the family says to play it: &ldquo;play the dinosaur theme&rdquo;.</span>
        <div className="pp-row">
          <input id="pack-title" type="text" value={props.title} maxLength={60} placeholder="Dinosaur Discoveries" style={{ flex: "1 1 200px" }} onChange={(e) => props.setTitle(e.target.value)} />
          {props.onTitleSave && (
            <button type="button" onClick={props.onTitleSave}>
              Save
            </button>
          )}
        </div>
      </label>
      <div className="pp-two">
        <label className="pp-field">
          Kind
          <select id="pack-kind" value={props.kind} onChange={(e) => props.setKind(e.target.value as PackKind)}>
            <option value="mixed">Questions and riddles</option>
            <option value="trivia">Questions</option>
            <option value="riddle">Riddles</option>
          </select>
        </label>
        <label className="pp-field">
          Made for
          <select id="pack-for" value={props.forId} onChange={(e) => props.setForId(e.target.value)}>
            <option value="">The whole family</option>
            {kids.map((k) => (
              <option key={k.playerId} value={k.playerId}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

type Row = QuestionInput & { check?: DraftQuestion["check"]; used?: boolean };

function QuestionList({
  kind,
  questions,
  editing,
  setEditing,
  busy,
  onSave,
  onDelete,
}: {
  kind: PackKind;
  questions: Row[];
  editing: number | null;
  setEditing: (i: number | null) => void;
  busy: boolean;
  onSave: (index: number, q: QuestionInput) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}) {
  return (
    <div className="pp-stack">
      {questions.map((q, i) =>
        editing === i ? (
          <QuestionForm key={i} kind={kind} initial={q} busy={busy} onCancel={() => setEditing(null)} onSave={(v) => onSave(i, v)} />
        ) : (
          <article key={i} className={`pp-round pp-qcard${q.check?.status === "disputed" ? " pp-disputed" : ""}`}>
            <div className="pp-round-meta">
              <span className="pp-num">{i + 1}</span>
              <span className={`pp-tag ${q.kind === "riddle" ? "pp-tag-riddle" : "pp-tag-trivia"}`}>{q.kind === "riddle" ? "Riddle" : "Question"}</span>
              <span className="pp-tag">{q.difficulty[0]!.toUpperCase() + q.difficulty.slice(1)}</span>
              {q.used && <span className="pp-tag">Asked</span>}
            </div>
            <h4>{q.question}</h4>
            <p className="pp-answer">
              <b>Answer: {q.answer}.</b>
              {q.accept.length > 0 && ` Also counts: ${q.accept.join(", ")}.`} {q.explanation}
            </p>
            {q.check?.status === "disputed" && (
              <p className="pp-check">
                Check this one.
                {q.check.problem && ` ${q.check.problem}`}
                {q.check.checkerAnswer && ` Answered without the key, it came out as “${q.check.checkerAnswer}”.`}
              </p>
            )}
            <div className="pp-row">
              <button type="button" className="pp-btn-quiet" disabled={editing !== null} onClick={() => setEditing(i)}>
                Edit
              </button>
              <button type="button" className="pp-btn-quiet" disabled={busy || editing !== null} onClick={() => onDelete(i)}>
                Remove
              </button>
            </div>
          </article>
        ),
      )}
      {editing === -1 ? (
        <QuestionForm kind={kind} initial={blankQuestion(kind)} busy={busy} onCancel={() => setEditing(null)} onSave={(v) => onSave(-1, v)} />
      ) : (
        <button type="button" className="pp-add-q" disabled={editing !== null} onClick={() => setEditing(-1)}>
          + Add a {kind === "riddle" ? "riddle" : "question"}
        </button>
      )}
    </div>
  );
}

function QuestionForm({
  kind,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  kind: PackKind;
  initial: QuestionInput;
  busy: boolean;
  onSave: (q: QuestionInput) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState<QuestionInput>(initial);
  const [accept, setAccept] = useState(initial.accept.join(", "));
  const [problem, setProblem] = useState<string | null>(null);
  const set = <K extends keyof QuestionInput>(k: K, v: QuestionInput[K]) => setQ({ ...q, [k]: v });
  const qKind = kind === "mixed" ? q.kind : kind === "riddle" ? "riddle" : "trivia";

  return (
    <form
      className="pp-card pp-stack pp-qform"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.question.trim()) return setProblem("Write the question.");
        if (!q.answer.trim()) return setProblem("Write the answer.");
        onSave({
          ...q,
          kind: qKind,
          question: q.question.trim(),
          answer: q.answer.trim(),
          explanation: q.explanation.trim(),
          accept: accept.split(",").map((s) => s.trim()).filter(Boolean),
        });
      }}
    >
      {kind === "mixed" && (
        <div className="pp-radio-row" role="radiogroup" aria-label="Question or riddle">
          <label>
            <input type="radio" name="qkind" checked={q.kind === "trivia"} onChange={() => set("kind", "trivia")} /> Question
          </label>
          <label>
            <input type="radio" name="qkind" checked={q.kind === "riddle"} onChange={() => set("kind", "riddle")} /> Riddle
          </label>
        </div>
      )}
      <label className="pp-field">
        {qKind === "riddle" ? "Riddle" : "Question"}
        <span className="pp-hint">Alexa reads it out loud, so keep it short and skip anything that needs a picture.</span>
        <textarea
          id="q-question"
          rows={3}
          maxLength={400}
          autoFocus
          value={q.question}
          placeholder={qKind === "riddle" ? "I have a long neck and eat leaves from the treetops. What dinosaur am I?" : "Which dinosaur had three horns on its face?"}
          onChange={(e) => set("question", e.target.value)}
        />
      </label>
      <div className="pp-two">
        <label className="pp-field">
          Answer
          <input id="q-answer" type="text" maxLength={120} value={q.answer} placeholder="Triceratops" onChange={(e) => set("answer", e.target.value)} />
        </label>
        <label className="pp-field">
          Also counts
          <input id="q-accept" type="text" value={accept} placeholder="Other answers, with commas" onChange={(e) => setAccept(e.target.value)} />
        </label>
      </div>
      <label className="pp-field">
        Fun fact to say after
        <input id="q-explain" type="text" maxLength={400} value={q.explanation} placeholder="Its name means three-horned face." onChange={(e) => set("explanation", e.target.value)} />
      </label>
      <label className="pp-field pp-diff">
        How hard
        <select id="q-difficulty" value={q.difficulty} onChange={(e) => set("difficulty", e.target.value as QuestionInput["difficulty"])}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      {problem && <p className="pp-alert">{problem}</p>}
      <div className="pp-row">
        <button type="submit" className="pp-btn-primary" disabled={busy}>
          Done
        </button>
        <button type="button" className="pp-btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
