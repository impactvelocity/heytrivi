"use client";

/**
 * Settings, as a drawer over the stage: players, themes (packs), the stage look, and
 * a chat for setting things up by asking Trivi.
 *
 * Live (`live` set, see useLiveGame): every change goes through the parent
 * API to the family's store, the same one the game plays from. Ask Trivi
 * makes changes and drafts packs (app/api/setup). Without `live` (the
 * scripted demo), players and themes change locally and the rest is visual.
 */

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { PACKS, SWATCHES, THEMES, newLook, type DemoFamily, type DemoMember, type DemoPack, type Look, type Skin, type ThemeId } from "@/lib/demo-data";
import { PACK_KIND_LABEL, type Draft } from "@/lib/parent";
import { AVATAR_SHAPES, Avatar, familyColors, freeColors } from "./Avatar";
import { Cards, Check, ChevronDown, Close, Palette, Plus, Send, Shuffle, Sparkle, Trash, Users } from "./icons";
import type { LiveSettings } from "./useLiveGame";

/** Runs a change and shows its error in the drawer. Resolves true if it worked. */
type Run = (fn: () => Promise<unknown>) => Promise<boolean>;

type Tab = "players" | "questions" | "themes" | "ask";

const TABS = [
  { id: "players", label: "Players", Icon: Users },
  { id: "questions", label: "Questions", Icon: Cards },
  { id: "themes", label: "Look", Icon: Palette },
  { id: "ask", label: "Ask Trivi", Icon: Sparkle },
] as const;

const SUGGESTIONS = ["Add Grandma to the family", "Make a space theme for a 7-year-old", "Double points on weekends", "Make riddles harder for grown-ups"];

interface Props {
  skin: Skin;
  open: boolean;
  onClose: () => void;
  family: DemoFamily;
  onAddMember: (m: DemoMember) => void;
  onRemoveMember: (id: string) => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  lightsOn: boolean;
  onLights: (on: boolean) => void;
  celebrate: boolean;
  onCelebrate: (on: boolean) => void;
  readTwice: boolean;
  onReadTwice: (on: boolean) => void;
  /** The family's real settings, when the game is live. */
  live?: LiveSettings | null;
  /** Why the live settings can't load, if they can't. */
  liveNote?: string;
}

/** One line of the Ask Trivi chat. */
interface ChatLine {
  role: "user" | "assistant";
  content: string;
  draft?: Draft | null;
  /** What this reply changed, sent back with the history so Trivi knows it's done. */
  changes?: string[];
}

export function SettingsDrawer(props: Props) {
  const { skin, open, onClose, family, onAddMember, onRemoveMember, theme, onTheme, lightsOn, onLights, live, liveNote } = props;
  const [tab, setTab] = useState<Tab>("players");
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const run: Run = async (fn) => {
    setError("");
    try {
      await fn();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (asked.length || chat.length) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [asked.length, chat.length, thinking]);

  /** Send a message to Trivi: live, the setup chat; otherwise the scripted reply. */
  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    setDraft("");
    if (!live) return setAsked((a) => [...a, text.trim()]);
    const next: ChatLine[] = [...chat, { role: "user", content: text.trim() }];
    setChat(next);
    setThinking(true);
    const ok = await run(async () => {
      const history = next.map(({ role, content, changes }) => ({
        role,
        content: changes?.length ? `${content}\n\n(Changes made: ${changes.join(" ")})` : content,
      }));
      const { reply, draft: pack, changes } = await live.ask(history);
      setChat((c) => [...c, { role: "assistant", content: reply, draft: pack, changes }]);
    });
    if (!ok) setChat((c) => [...c, { role: "assistant", content: "Sorry, that didn't work. Try again in a moment." }]);
    setThinking(false);
  };

  const ask = (e?: FormEvent) => {
    e?.preventDefault();
    void send(draft);
  };

  return (
    <>
      <div className="dm-scrim" data-open={open} onClick={onClose} aria-hidden />
      <aside className="dm-drawer" data-open={open} role="dialog" aria-modal="true" aria-labelledby="dm-drawer-title" inert={!open}>
        <header className="dm-drawer-head dm-drawer-head-plain">
          <h2 id="dm-drawer-title">Settings</h2>
          <button ref={closeRef} type="button" className="dm-close" onClick={onClose} aria-label="Close settings">
            <Close />
          </button>
        </header>

        <div className="dm-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`dm-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="dm-tabpanel"
              className="dm-tab"
              onClick={() => setTab(id)}
            >
              <Icon width={17} height={17} />
              {label}
            </button>
          ))}
        </div>

        <div ref={bodyRef} className="dm-drawer-body" role="tabpanel" id="dm-tabpanel" aria-labelledby={`dm-tab-${tab}`}>
          {(error || (!live && liveNote)) && (
            <p className="dm-notice" role="alert" data-kind={error ? "error" : "info"}>
              {error || liveNote}
            </p>
          )}
          {tab === "players" && <PlayersTab key={family.id} family={family} onAdd={onAddMember} onRemove={onRemoveMember} live={live} run={run} />}
          {tab === "questions" && <QuestionsTab live={live} run={run} />}
          {tab === "themes" && (
            <ThemesTab
              skin={skin}
              theme={theme}
              onTheme={onTheme}
              lightsOn={lightsOn}
              onLights={onLights}
              celebrate={props.celebrate}
              onCelebrate={props.onCelebrate}
              readTwice={props.readTwice}
              onReadTwice={props.onReadTwice}
            />
          )}
          {tab === "ask" &&
            (live ? (
              <LiveAskTab chat={chat} thinking={thinking} onSuggest={(s) => void send(s)} live={live} run={run} onSent={(text) => setChat((c) => [...c, { role: "assistant", content: text }])} />
            ) : (
              <AskTab asked={asked} onSuggest={setDraft} />
            ))}
        </div>

        {tab === "ask" && (
          <form className="dm-composer" onSubmit={ask}>
            <textarea
              className="dm-input"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) ask(e);
              }}
              placeholder="Ask Trivi to set something up…"
              aria-label="Message Trivi"
              disabled={thinking}
            />
            <button type="submit" className="dm-send dm-send-solid" aria-label="Send" disabled={!draft.trim() || thinking}>
              <Send />
            </button>
          </form>
        )}
      </aside>
    </>
  );
}

/* ---------------------------------------------------------------- players */

function PlayersTab({
  family,
  onAdd,
  onRemove,
  live,
  run,
}: {
  family: DemoFamily;
  onAdd: (m: DemoMember) => void;
  onRemove: (id: string) => void;
  live?: LiveSettings | null;
  run: Run;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<DemoMember["role"]>("kid");
  const [color, setColor] = useState(SWATCHES[0]!);
  const [variant, setVariant] = useState(family.members.length);
  /** The shape New look picked; null keeps the one their place in the family gives. */
  const [shape, setShape] = useState<number | null>(null);
  const [title, setTitle] = useState(family.name);
  const [saving, setSaving] = useState(false);
  const look: Look = shape === null ? newLook(color, variant) : { ...newLook(color, variant), shape };

  /**
   * New look: a different shape, and a different color at random. The color
   * comes from the ones still free in the family, so the preview shows it
   * (familyColors swaps out a color too close to someone else's).
   */
  const shuffle = () => {
    const other = (n: number, of: number) => (n + 1 + Math.floor(Math.random() * (of - 1))) % of;
    setShape(other(shape ?? family.members.length % AVATAR_SHAPES, AVATAR_SHAPES));
    const colors = freeColors(family.members).filter((c) => c !== color);
    if (colors.length) setColor(colors[Math.floor(Math.random() * colors.length)]!);
  };

  // The name can change elsewhere (Ask Trivi, the parent page).
  useEffect(() => setTitle(family.name), [family.name]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    if (live) {
      setSaving(true);
      const ok = await run(() => live.addPlayer(name.trim(), role, look));
      setSaving(false);
      if (!ok) return;
    } else {
      onAdd({ id: `${family.id}-${Date.now()}`, name: name.trim(), role, week: 0, allTime: 0, look });
    }
    setName("");
    setVariant((v) => v + 1);
    setShape(null);
  };

  const remove = (m: DemoMember) => {
    if (!live) return onRemove(m.id);
    if (!confirm(`Remove ${m.name}? Their points go too.`)) return;
    void run(() => live.removePlayer(m.id));
  };

  const rename = () => {
    if (!live || !title.trim() || title.trim() === family.name) return;
    void run(() => live.rename(title.trim())).then((ok) => !ok && setTitle(family.name));
  };

  return (
    <>
      <section className="dm-dsec">
        <label className="dm-field">
          <span>Family name</span>
          <input
            className="dm-input"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
      </section>

      <section className="dm-dsec">
        <div className="dm-dsec-head">
          <h3>Players</h3>
          <span className="dm-count">{family.members.length}</span>
        </div>
        <ul className="dm-list">
          {family.members.map((m) => (
            <li key={m.id} className="dm-list-item">
              <Avatar look={m.look} size={42} shape={family.members.findIndex((x) => x.id === m.id)} color={familyColors(family.members).get(m.id)} />
              <span className="dm-list-text">
                <strong>{m.name}</strong>
                <small>{m.allTime.toLocaleString()} points all time</small>
              </span>
              <span className="dm-role">{m.role === "kid" ? "Kid" : "Grown-up"}</span>
              <button type="button" className="dm-iconbtn" aria-label={`Remove ${m.name}`} onClick={() => remove(m)} disabled={family.members.length <= 1}>
                <Trash width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form className="dm-dsec dm-add" onSubmit={add}>
        <h3>Add a player</h3>
        <div className="dm-add-who">
          <Avatar
            look={look}
            size={64}
            shape={family.members.length}
            color={familyColors([...family.members, { id: "", look }]).get("")}
          />
          <div className="dm-add-fields">
            <input className="dm-input" placeholder="Name, like Grandma or Leo" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
            <div className="dm-seg" role="group" aria-label="Kid or grown-up">
              <button type="button" aria-pressed={role === "kid"} onClick={() => setRole("kid")}>
                Kid
              </button>
              <button type="button" aria-pressed={role === "grown-up"} onClick={() => setRole("grown-up")}>
                Grown-up
              </button>
            </div>
          </div>
        </div>
        <div className="dm-add-look">
          <div className="dm-swatches" role="group" aria-label="Color">
            {SWATCHES.map((c) => (
              <button key={c} type="button" className="dm-swatch" style={{ background: c }} aria-pressed={c === color} aria-label={`Color ${c}`} onClick={() => setColor(c)} />
            ))}
          </div>
          <button type="button" className="dm-btn dm-btn-ghost dm-btn-sm" onClick={shuffle}>
            <Shuffle width={16} height={16} /> New look
          </button>
        </div>
        <button type="submit" className="dm-btn dm-btn-primary" disabled={!name.trim() || saving}>
          <Plus width={18} height={18} /> {saving ? "Adding…" : "Add to family"}
        </button>
      </form>
    </>
  );
}

/* -------------------------------------------------------------- questions */

/** The family's packs, in the drawer's shape. Only ready packs can be played or added to. */
function livePacks(live: LiveSettings): DemoPack[] {
  return live.dashboard.packs
    .filter((p) => p.status === "ready")
    .map((p, i) => ({
      id: p.packId,
      name: p.title,
      blurb: p.topic && p.topic !== p.title ? p.topic : PACK_KIND_LABEL[p.kind],
      count: p.questionCount,
      color: SWATCHES[i % SWATCHES.length]!,
      on: !p.paused,
    }));
}

function QuestionsTab({ live, run }: { live?: LiveSettings | null; run: Run }) {
  const [localPacks, setPacks] = useState(PACKS);
  const packs = live ? livePacks(live) : localPacks;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [picked, setPackId] = useState("");
  const packId = packs.some((p) => p.id === picked) ? picked : (packs[0]?.id ?? "");
  const [added, setAdded] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    if (live) return void run(() => live.setPackPlaying(id, !packs.find((p) => p.id === id)!.on));
    setPacks((ps) => ps.map((p) => (p.id === id ? { ...p, on: !p.on } : p)));
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim() || !packId || saving) return;
    const name = packs.find((p) => p.id === packId)!.name;
    if (live) {
      setSaving(true);
      const ok = await run(() => live.addQuestion(packId, question.trim(), answer.trim()));
      setSaving(false);
      if (!ok) return;
    } else {
      setPacks((ps) => ps.map((p) => (p.id === packId ? { ...p, count: p.count + 1 } : p)));
    }
    setAdded(name);
    setQuestion("");
    setAnswer("");
  };

  return (
    <>
      <section className="dm-dsec">
        <div className="dm-dsec-head">
          <h3>Themes</h3>
          <span className="dm-count">{packs.filter((p) => p.on).length} on</span>
        </div>
        <p className="dm-help">Themes that are on get mixed into the game. Say “play the dinosaur theme” to play just one.</p>
        <ul className="dm-list">
          {packs.map((p) => (
            <li key={p.id} className="dm-list-item">
              <span className="dm-pack-tile" style={{ background: p.color }} aria-hidden>
                {p.name[0]}
              </span>
              <span className="dm-list-text">
                <strong>{p.name}</strong>
                <small>
                  {p.count} questions · {p.blurb}
                </small>
              </span>
              <button type="button" role="switch" aria-checked={p.on} aria-label={`Play ${p.name}`} className="dm-switch" onClick={() => toggle(p.id)} />
            </li>
          ))}
        </ul>
      </section>

      <form className="dm-dsec dm-add" onSubmit={add}>
        <h3>Write a question</h3>
        <label className="dm-field">
          <span>Question</span>
          <textarea className="dm-input" rows={2} placeholder="What do bees make?" value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <div className="dm-row2">
          <label className="dm-field">
            <span>Answer</span>
            <input className="dm-input" placeholder="Honey" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </label>
          <label className="dm-field">
            <span>Theme</span>
            <span className="dm-select">
              <select className="dm-input" value={packId} onChange={(e) => setPackId(e.target.value)}>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown width={18} height={18} />
            </span>
          </label>
        </div>
        <div className="dm-add-foot">
          <button type="submit" className="dm-btn dm-btn-primary" disabled={!question.trim() || !answer.trim() || !packId || saving}>
            <Plus width={18} height={18} /> {saving ? "Adding…" : "Add question"}
          </button>
          {added && (
            <span className="dm-saved" role="status">
              <Check width={16} height={16} /> Added to {added}
            </span>
          )}
        </div>
      </form>
    </>
  );
}

/* ----------------------------------------------------------------- themes */

function ThemesTab({
  skin,
  theme,
  onTheme,
  lightsOn,
  onLights,
  celebrate,
  onCelebrate: setCelebrate,
  readTwice: twice,
  onReadTwice: setTwice,
}: {
  skin: Skin;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  lightsOn: boolean;
  onLights: (on: boolean) => void;
  celebrate: boolean;
  onCelebrate: (on: boolean) => void;
  readTwice: boolean;
  onReadTwice: (on: boolean) => void;
}) {
  return (
    <>
      <section className="dm-dsec">
        <h3>Stage look</h3>
        <div className="dm-themes">
          {THEMES.map(({ id, [skin]: t }) => (
            <button
              key={id}
              type="button"
              className="dm-theme"
              aria-pressed={id === theme}
              onClick={() => onTheme(id)}
              style={{ "--p-bg": t.colors.bg, "--p-frame": t.colors.frame, "--p-bulb": t.colors.bulb, "--p-accent": t.colors.accent } as CSSProperties}
            >
              <span className="dm-theme-preview">
                <span className="dm-theme-frame">
                  <span className="dm-theme-stage">
                    <span className="dm-theme-orb" />
                  </span>
                </span>
                {id === theme && (
                  <span className="dm-theme-check">
                    <Check width={14} height={14} />
                  </span>
                )}
              </span>
              <span className="dm-theme-text">
                <strong>{t.name}</strong>
                <small>{t.blurb}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="dm-dsec">
        <h3>The show</h3>
        <ul className="dm-list">
          <ToggleRow label="Marquee lights" help="Bulbs chase while Trivi talks" on={lightsOn} onChange={onLights} />
          <ToggleRow label="Celebrate right answers" help="Lights flash when someone scores" on={celebrate} onChange={setCelebrate} />
          <ToggleRow label="Read questions twice" help="Good for little ones" on={twice} onChange={setTwice} />
        </ul>
      </section>
    </>
  );
}

function ToggleRow({ label, help, on, onChange }: { label: string; help: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <li className="dm-list-item dm-list-toggle">
      <span className="dm-list-text">
        <strong>{label}</strong>
        <small>{help}</small>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="dm-switch" onClick={() => onChange(!on)} />
    </li>
  );
}

/* -------------------------------------------------------------------- ask */

function AskTab({ asked, onSuggest }: { asked: string[]; onSuggest: (text: string) => void }) {
  return (
    <>
      <div className="dm-chat">
        <div className="dm-msg">
          <span className="dm-mark dm-mark-sm" aria-hidden />
          <div className="dm-bubble">
            <p>Hi! I can write themes, add players, or change the house rules. What should we set up?</p>
          </div>
        </div>
        <div className="dm-msg dm-msg-me">
          <p>Make 6 dinosaur questions for a 6 and 8 year old</p>
        </div>
        <div className="dm-msg">
          <span className="dm-mark dm-mark-sm" aria-hidden />
          <div className="dm-bubble">
            <p>Here’s a draft. I answered each one without peeking and checked the facts.</p>
            <div className="dm-draft">
              <div className="dm-draft-head">
                <strong>Dinosaur Detectives</strong>
                <span>6 questions</span>
              </div>
              <ol>
                <li>
                  Which dinosaur had three horns? <em>Triceratops</em>
                </li>
                <li>
                  Did T. rex have big arms or tiny arms? <em>Tiny arms</em>
                </li>
                <li>
                  What do we call a scientist who digs up fossils? <em>A paleontologist</em>
                </li>
              </ol>
              <span className="dm-draft-more">and 3 more</span>
              <div className="dm-draft-actions">
                <button type="button" className="dm-btn dm-btn-primary dm-btn-sm">
                  Review and save
                </button>
                <button type="button" className="dm-btn dm-btn-ghost dm-btn-sm">
                  Make it easier
                </button>
              </div>
            </div>
          </div>
        </div>
        {asked.map((text, i) => (
          <div key={i} className="dm-chat-pair">
            <div className="dm-msg dm-msg-me">
              <p>{text}</p>
            </div>
            <div className="dm-msg">
              <span className="dm-mark dm-mark-sm" aria-hidden />
              <div className="dm-bubble">
                <p>Got it. I’ll draft that and show it here so you can check it before anything changes.</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="dm-suggest" aria-label="Ideas">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onSuggest(s)}>
            <Sparkle width={14} height={14} /> {s}
          </button>
        ))}
      </div>
    </>
  );
}

/** Ask Trivi, live: the real conversation, with any pack draft to read and save. */
function LiveAskTab({
  chat,
  thinking,
  onSuggest,
  live,
  run,
  onSent,
}: {
  chat: ChatLine[];
  thinking: boolean;
  onSuggest: (text: string) => void;
  live: LiveSettings;
  run: Run;
  onSent: (text: string) => void;
}) {
  return (
    <>
      <div className="dm-chat">
        <div className="dm-msg">
          <span className="dm-mark dm-mark-sm" aria-hidden />
          <div className="dm-bubble">
            <p>Hi! I can add players, write themes, or change the house rules. What should we set up?</p>
          </div>
        </div>
        {chat.map((line, i) =>
          line.role === "user" ? (
            <div key={i} className="dm-msg dm-msg-me">
              <p>{line.content}</p>
            </div>
          ) : (
            <div key={i} className="dm-msg">
              <span className="dm-mark dm-mark-sm" aria-hidden />
              <div className="dm-bubble">
                <p>{line.content}</p>
                {line.draft && <DraftCard draft={line.draft} live={live} run={run} onSuggest={onSuggest} onSaved={onSent} />}
              </div>
            </div>
          ),
        )}
        {thinking && (
          <div className="dm-msg" aria-live="polite">
            <span className="dm-mark dm-mark-sm" aria-hidden />
            <div className="dm-bubble">
              <p className="dm-thinking">Working on it… a new theme takes about half a minute while I write it and check the facts.</p>
            </div>
          </div>
        )}
      </div>
      {!chat.length && (
        <div className="dm-suggest" aria-label="Ideas">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => onSuggest(s)} disabled={thinking}>
              <Sparkle width={14} height={14} /> {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function DraftCard({ draft, live, run, onSuggest, onSaved }: { draft: Draft; live: LiveSettings; run: Run; onSuggest: (text: string) => void; onSaved: (text: string) => void }) {
  const [state, setState] = useState<"draft" | "saving" | "saved">("draft");
  const flagged = draft.questions.filter((q) => q.check.status === "disputed").length;
  const save = async () => {
    setState("saving");
    let msg = "";
    const ok = await run(async () => {
      msg = await live.savePack(draft);
    });
    setState(ok ? "saved" : "draft");
    if (ok) onSaved(`${msg} Say “play the ${draft.title} theme” to try it.`);
  };
  return (
    <div className="dm-draft">
      <div className="dm-draft-head">
        <strong>{draft.title}</strong>
        <span>{draft.questions.length} questions</span>
      </div>
      <ol>
        {draft.questions.map((q, i) => (
          <li key={i} data-flagged={q.check.status === "disputed" || undefined}>
            {q.question} <em>{q.answer}</em>
            {q.check.status === "disputed" && (
              <small className="dm-draft-flag">
                Fact-check: {(q.check.problem ?? `another answer came out: ${q.check.checkerAnswer}`).replace(/[.\s]+$/, "")}. Left out when saved.
              </small>
            )}
          </li>
        ))}
      </ol>
      {flagged > 0 && <span className="dm-draft-more">{flagged} flagged by the fact-check</span>}
      <div className="dm-draft-actions">
        <button type="button" className="dm-btn dm-btn-primary dm-btn-sm" onClick={save} disabled={state !== "draft"}>
          {state === "saved" ? (
            <>
              <Check width={14} height={14} /> Saved
            </>
          ) : state === "saving" ? (
            "Saving…"
          ) : (
            "Save theme"
          )}
        </button>
        <button type="button" className="dm-btn dm-btn-ghost dm-btn-sm" onClick={() => onSuggest(`Make the ${draft.title} theme easier`)} disabled={state === "saving"}>
          Make it easier
        </button>
      </div>
    </div>
  );
}
