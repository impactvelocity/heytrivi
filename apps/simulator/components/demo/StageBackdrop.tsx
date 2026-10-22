/**
 * What fills the dark stage behind Trivi. Each backdrop is drawn in the
 * stage's own colors (--night, --night-hi, --night-ink, --acc from duo.css)
 * and sized in container units, so the small previews in Settings are the
 * same picture as the stage, just smaller. Styles live in duo.css.
 */

import { useId, type CSSProperties, type ReactNode } from "react";

export type BackdropId = "plain" | "quiz" | "aura" | "spotlight" | "grid" | "globs" | "sparkles" | "lava";

export const BACKDROPS: { id: BackdropId; name: string; blurb: string }[] = [
  { id: "plain", name: "Plain", blurb: "A calm gradient" },
  { id: "quiz", name: "Quiz night", blurb: "Spotlights and floating trivia icons" },
  { id: "aura", name: "Aura", blurb: "Soft glows drifting in and out" },
  { id: "spotlight", name: "Spotlight", blurb: "Aura with faint sun rays" },
  { id: "grid", name: "Grid", blurb: "A slow-rolling arcade grid" },
  { id: "globs", name: "Dreamy", blurb: "Blurry color globs drifting" },
  { id: "sparkles", name: "Sparkles", blurb: "Twinkles and soft glows" },
  { id: "lava", name: "Lava lamp", blurb: "Gooey blobs rising slowly" },
];

/** Where the sparkles sit (% of the stage), how big they are, and their timing. */
const SPARKLES = [
  [12, 14, 1.1, 0], [82, 10, 0.8, 1.3], [24, 34, 0.6, 2.1], [70, 28, 1.3, 0.6],
  [90, 46, 0.7, 2.8], [8, 56, 0.9, 1.7], [36, 12, 0.5, 3.2], [58, 8, 0.7, 2.4],
  [18, 78, 0.6, 0.9], [84, 70, 1, 3.6], [46, 62, 0.45, 1.1], [64, 84, 0.6, 2],
  [30, 92, 0.8, 3], [94, 88, 0.5, 0.3], [4, 30, 0.5, 2.6], [52, 40, 0.4, 3.9],
] as const;

/** Little line icons for quiz night, drawn on a 24-unit grid in currentColor. */
const ICONS: Record<string, ReactNode> = {
  star: <path d="M12 2.8 14.7 8.6l6.3.7-4.7 4.3 1.3 6.2L12 16.7l-5.6 3.1 1.3-6.2L3 9.3l6.3-.7Z" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.6.6.8 1.4.8 2.4h6c0-1 .2-1.8.8-2.4A6 6 0 0 0 12 3Z" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0ZM8 6H5c0 2.2 1.3 3.8 3 4M16 6h3c0 2.2-1.3 3.8-3 4M12 13v4M8.5 21h7M9.5 17h5v4h-5Z" />,
  buzzer: <path d="M5.5 15a6.5 6.5 0 0 1 13 0ZM3.5 15h17v4h-17ZM12 5V3M7.5 6.5 6 5M16.5 6.5 18 5" />,
  mic: <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />,
  crown: <path d="M4 18h16M4.5 18 3 8l5 4 4-7 4 7 5-4-1.5 10" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18" />
    </>
  ),
  rocket: <path d="M12 2.5c3.2 2.2 5 6.3 3.8 11.5l-1.8 3h-4l-1.8-3C7 8.8 8.8 4.7 12 2.5ZM9.5 17 8 21M14.5 17 16 21M12 7.5v3" />,
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth="3" />
    </>
  ),
  watch: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V10M10 2.5h4M12 2.5V6M18.5 6.5l1.5-1.5" />
    </>
  ),
  atom: (
    <>
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" />
      <path d="M12 12h.01" strokeWidth="3.5" />
    </>
  ),
  note: (
    <>
      <path d="M9 18V5.5l10-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  ticket: <path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3ZM14 4v12" transform="translate(0 2)" />,
};

/**
 * Quiz night's drifting things: a mark ("?" or "!") or an icon, where it
 * rises (% across), how big, how long the trip takes, when it starts, and
 * which color it wears.
 */
const QUIZ: { s: string; x: number; k: number; t: number; d: number; c: 1 | 2 | 3 | 4 }[] = [
  { s: "?", x: 7, k: 1.2, t: 26, d: 0, c: 1 },
  { s: "trophy", x: 19, k: 0.9, t: 31, d: -9, c: 3 },
  { s: "star", x: 33, k: 0.7, t: 22, d: -15, c: 3 },
  { s: "bulb", x: 47, k: 0.85, t: 29, d: -4, c: 2 },
  { s: "?", x: 61, k: 0.9, t: 34, d: -21, c: 4 },
  { s: "buzzer", x: 77, k: 0.9, t: 27, d: -13, c: 1 },
  { s: "!", x: 92, k: 1.1, t: 24, d: -6, c: 2 },
  { s: "globe", x: 27, k: 0.85, t: 38, d: -27, c: 2 },
  { s: "?", x: 55, k: 1.4, t: 33, d: -30, c: 1 },
  { s: "rocket", x: 72, k: 0.8, t: 21, d: -2, c: 4 },
  { s: "crown", x: 88, k: 0.8, t: 30, d: -18, c: 3 },
  { s: "note", x: 12, k: 0.8, t: 35, d: -24, c: 4 },
  { s: "atom", x: 41, k: 0.85, t: 25, d: -11, c: 2 },
  { s: "mic", x: 84, k: 0.75, t: 36, d: -33, c: 1 },
  { s: "dice", x: 3, k: 0.7, t: 28, d: -16, c: 3 },
  { s: "watch", x: 64, k: 0.75, t: 31, d: -25, c: 4 },
  { s: "check", x: 36, k: 0.7, t: 23, d: -19, c: 1 },
  { s: "ticket", x: 95, k: 0.75, t: 37, d: -8, c: 2 },
];

/** Lava blobs: x and size in the 100-wide box, rise height, sideways drift, and timing. */
const BLOBS = [
  [22, 13, -92, 6, 19, 0], [70, 10, -110, -8, 23, -6], [46, 16, -70, 4, 27, -12],
  [86, 8, -120, -6, 17, -3], [12, 9, -105, 8, 21, -15], [58, 7, -125, -4, 15, -9],
] as const;

export function StageBackdrop({ kind }: { kind: BackdropId }) {
  const id = `bd${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <span className="dm-bd" data-kind={kind} aria-hidden>
      {kind === "quiz" && (
        <>
          <i className="dm-beam" />
          <i className="dm-beam" />
          {QUIZ.map((g, i) => (
            <i
              key={i}
              className={`dm-quiz${ICONS[g.s] ? " dm-quiz-icon" : ""}`}
              style={{ "--x": `${g.x}%`, "--k": g.k, "--t": `${g.t}s`, "--d": `${g.d}s`, "--c": `var(--quiz-${g.c})` } as CSSProperties}
            >
              {ICONS[g.s] ? <svg viewBox="0 0 24 24">{ICONS[g.s]}</svg> : g.s}
            </i>
          ))}
        </>
      )}
      {(kind === "aura" || kind === "spotlight") && (
        <>
          <i className="dm-aura" />
          <i className="dm-aura" />
          <i className="dm-aura" />
          <i className="dm-aura" />
          {kind === "spotlight" && <i className="dm-sunrays" />}
        </>
      )}
      {kind === "grid" && (
        <>
          <i className="dm-grid-wall" />
          <i className="dm-grid-glint" />
          <i className="dm-grid-floor" />
        </>
      )}
      {kind === "globs" && (
        <>
          <i className="dm-glob" />
          <i className="dm-glob" />
          <i className="dm-glob" />
          <i className="dm-glob" />
        </>
      )}
      {kind === "sparkles" && (
        <>
          <i className="dm-softglow" />
          <i className="dm-softglow" />
          <i className="dm-softglow" />
          {SPARKLES.map(([x, y, s, d], i) => (
            <i key={i} className="dm-twinkle" style={{ "--x": `${x}%`, "--y": `${y}%`, "--k": s, "--d": `${d}s` } as CSSProperties} />
          ))}
        </>
      )}
      {kind === "lava" && (
        <svg className="dm-lava" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id={`${id}g`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
              <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
            <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0" className="dm-lava-top" />
              <stop offset="1" className="dm-lava-bottom" />
            </linearGradient>
          </defs>
          <g filter={`url(#${id}g)`} fill={`url(#${id}c)`}>
            <ellipse cx="50" cy="138" rx="70" ry="14" />
            {BLOBS.map(([x, r, rise, dx, t, d], i) => (
              <circle
                key={i}
                className="dm-blob"
                cx={x}
                cy={130}
                r={r}
                style={{ "--rise": `${rise}px`, "--dx": `${dx}px`, "--t": `${t}s`, "--d": `${d}s` } as CSSProperties}
              />
            ))}
          </g>
        </svg>
      )}
    </span>
  );
}
