"use client";

/**
 * The avatar lab, focused on Glow: pick a mood and a body color, see it large,
 * then every mood in that color and every color in that mood. Keys 1 to 8
 * pick a mood, the arrow keys step through colors, and space plays a
 * scripted round. The other concepts stay in concepts.tsx, hidden for now.
 */

import { useEffect, useRef, useState } from "react";
import { THEMES, type ThemeId } from "@/lib/demo-data";
import { CONCEPTS, ConceptStage, GLOW_COLORS, MOODS, type GlowColor, type Mood } from "./concepts";

type Backdrop = "stage" | "white" | "night";

/** A round as the family would see it, with how long each mood holds. */
const ROUND: [Mood, number][] = [
  ["idle", 1600],
  ["speaking", 2600],
  ["listening", 2600],
  ["thinking", 1600],
  ["correct", 2000],
  ["speaking", 1800],
  ["listening", 2200],
  ["thinking", 1400],
  ["wrong", 2000],
  ["celebrating", 2600],
  ["sleeping", 3000],
];

const GLOW = CONCEPTS.find((c) => c.id === "glow")!;

export function AvatarLab() {
  const [mood, setMood] = useState<Mood>("idle");
  const [color, setColor] = useState<GlowColor>("sunset");
  const [theme, setTheme] = useState<ThemeId>("showtime");
  const [backdrop, setBackdrop] = useState<Backdrop>("white");
  const [size, setSize] = useState(260);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const moodInfo = MOODS.find((m) => m.id === mood)!;
  const colorInfo = GLOW_COLORS.find((c) => c.id === color)!;

  useEffect(() => {
    if (!playing) return;
    let step = 0;
    const next = () => {
      const [m, ms] = ROUND[step]!;
      setMood(m);
      step += 1;
      timer.current = setTimeout(step < ROUND.length ? next : () => setPlaying(false), ms);
    };
    next();
    return () => clearTimeout(timer.current);
  }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= MOODS.length) {
        setPlaying(false);
        setMood(MOODS[n - 1]!.id);
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const step = e.key === "ArrowRight" ? 1 : -1;
        setColor((id) => {
          const i = GLOW_COLORS.findIndex((c) => c.id === id);
          return GLOW_COLORS[(i + step + GLOW_COLORS.length) % GLOW_COLORS.length]!.id;
        });
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (m: Mood) => {
    setPlaying(false);
    setMood(m);
  };

  return (
    <div className="al" data-backdrop={backdrop}>
      <header className="al-head">
        <div>
          <h1>Glow avatar lab</h1>
          <p>Trivi as Glow, in every state and color. Keys 1 to 8 pick a state, arrows change the color, space plays a round.</p>
        </div>
        <a className="al-link" href="/demo">
          Back to the stage
        </a>
      </header>

      <div className="al-bar">
        <div className="al-moods" role="radiogroup" aria-label="State">
          {MOODS.map((m, i) => (
            <button key={m.id} role="radio" aria-checked={m.id === mood} onClick={() => pick(m.id)}>
              <kbd>{i + 1}</kbd>
              {m.name}
            </button>
          ))}
        </div>
        <div className="al-tools">
          <button className="al-play" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? "Stop" : "Play a round"}
          </button>
          <div className="al-group">
            <span className="al-label">Body</span>
            <div className="al-swatches" role="radiogroup" aria-label="Body color">
              {GLOW_COLORS.map((c) => (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={c.id === color}
                  aria-label={c.name}
                  title={c.name}
                  style={{ background: `linear-gradient(135deg, ${c.c1}, ${c.c2} 50%, ${c.c3})` }}
                  onClick={() => setColor(c.id)}
                />
              ))}
            </div>
          </div>
          <div className="al-group">
            <span className="al-label">Backdrop</span>
            <div className="al-seg" role="radiogroup" aria-label="Backdrop">
              {(["white", "stage", "night"] as Backdrop[]).map((b) => (
                <button key={b} role="radio" aria-checked={b === backdrop} onClick={() => setBackdrop(b)}>
                  {b[0]!.toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
            {backdrop === "stage" && (
              <div className="al-swatches al-swatches-sm" role="radiogroup" aria-label="Stage theme">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    role="radio"
                    aria-checked={t.id === theme}
                    aria-label={t.duo.name}
                    title={t.duo.name}
                    style={{ background: t.duo.colors.frame }}
                    onClick={() => setTheme(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
          <label className="al-size">
            Size
            <input type="range" min={96} max={340} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
        </div>
      </div>

      <section className="al-focus">
        <ConceptStage concept={GLOW} mood={mood} theme={theme} size={size} color={color} className="al-hero" />
        <div className="al-notes">
          <div className="al-notes-top">
            <span className="al-tag" data-tag={GLOW.tag}>
              {colorInfo.name}
            </span>
            <h2>{GLOW.name}</h2>
            <p>{GLOW.blurb}</p>
          </div>
          <div className="al-now">
            <h3>
              {moodInfo.name}
              {moodInfo.isNew && <span className="al-new">New</span>}
            </h3>
            <p>{moodInfo.when}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="al-section">
          Every state: <b>{colorInfo.name}</b>
        </h2>
        <div className="al-grid al-grid-moods">
          {MOODS.map((m) => (
            <button key={m.id} className="al-card" aria-pressed={m.id === mood} onClick={() => pick(m.id)}>
              <ConceptStage concept={GLOW} mood={m.id} theme={theme} size={112} color={color} />
              <span className="al-card-label">{m.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="al-section">
          Every color: <b>{moodInfo.name}</b>
        </h2>
        <div className="al-grid al-grid-moods">
          {GLOW_COLORS.map((c) => (
            <button key={c.id} className="al-card" aria-pressed={c.id === color} onClick={() => setColor(c.id)}>
              <ConceptStage concept={GLOW} mood={mood} theme={theme} size={112} color={c.id} />
              <span className="al-card-label">{c.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
