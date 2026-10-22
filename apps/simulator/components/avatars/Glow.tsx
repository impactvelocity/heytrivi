/**
 * Glow, Trivi's avatar: a grainy gradient ball with a simple white face. It
 * has a look for each voice state and for the game's big moments, and comes
 * in GLOW_COLORS. Styles are in app/avatars/glow.css, which any page that
 * shows Glow must load. The avatar lab (/avatars) shows every state and color.
 */

import { useId, type CSSProperties } from "react";
import type { VoiceState } from "@/components/demo/VoiceOrb";

export type Mood = VoiceState | "correct" | "wrong" | "celebrating" | "sleeping";

/** Effects layered over any concept; avatars.css shows the ones that fit the mood. */
export function Fx() {
  return (
    <span className="av-fx" aria-hidden>
      <span className="av-ripples">
        <i />
        <i />
      </span>
      <span className="av-dots">
        <i />
        <i />
        <i />
      </span>
      <span className="av-sweat" />
      <span className="av-zzz">
        <i>z</i>
        <i>z</i>
        <i>Z</i>
      </span>
      <span className="av-confetti">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </span>
    </span>
  );
}

/** A four-point sparkle centered on the origin. */
const SPARKLE = "M0-12C1 -3 3-1 12 0C3 1 1 3 0 12C-1 3-3 1-12 0C-3-1-1-3 0-12Z";

export type GlowColor = "sunset" | "berry" | "grape" | "ocean" | "mint" | "sunny" | "midnight";

/** Glow's body colors: a top-left to bottom-right gradient, a soft highlight, and a rim shade. */
export const GLOW_COLORS: { id: GlowColor; name: string; c1: string; c2: string; c3: string; hi: string; edge: string }[] = [
  { id: "sunset", name: "Sunset", c1: "#ea5304", c2: "#f2621c", c3: "#f7779c", hi: "#ffd2b0", edge: "#d9300c" },
  { id: "berry", name: "Berry", c1: "#e0124c", c2: "#ff3d6e", c3: "#ff9a6b", hi: "#ffc7d4", edge: "#a80a36" },
  { id: "grape", name: "Grape", c1: "#6a2ad6", c2: "#8f45f5", c3: "#f07ad4", hi: "#e6d1ff", edge: "#45169e" },
  { id: "ocean", name: "Ocean", c1: "#1259e8", c2: "#2f86ff", c3: "#3fd3ee", hi: "#cfe6ff", edge: "#0b3aa6" },
  { id: "mint", name: "Mint", c1: "#04975f", c2: "#17bd78", c3: "#a3e05a", hi: "#d6ffe8", edge: "#036e45" },
  { id: "sunny", name: "Sunny", c1: "#f26b00", c2: "#ff9512", c3: "#ffcc33", hi: "#fff0c2", edge: "#c24f00" },
  { id: "midnight", name: "Midnight", c1: "#1f1c66", c2: "#3a2e9c", c3: "#8257dc", hi: "#bdb4ff", edge: "#0f0c40" },
];

/** One eye, drawn around its own center: open, happy, closed, and star versions. */
function GlowEye({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 100)`}>
      <g className="gl-eye">
        <g className="gl-blink">
          <ellipse className="gl-open" rx="7.5" ry="11.5" />
        </g>
        <path className="gl-happy" d="M-9 4Q0-8 9 4" />
        <path className="gl-closed" d="M-9-1Q0 7 9-1" />
        <g className="gl-star">
          <path d={SPARKLE} transform="scale(0.8)" />
        </g>
      </g>
    </g>
  );
}

const SPARKLE_SPOTS = ["translate(22 56) scale(1.1)", "translate(180 42) scale(0.8)", "translate(28 164) scale(0.7)", "translate(176 154)"];
/** Sound coming in: arcs just outside the body on each side, three of each. */
const WAVES = ["M11.9 74.4A95 95 0 0 0 11.9 145.6", "M188.1 74.4A95 95 0 0 1 188.1 145.6"];

/**
 * A grainy gradient ball with a simple white face, looking straight out. The
 * body color comes from GLOW_COLORS; each mood swaps the eyes, brows and mouth
 * in avatars.css, and a new mood lands with a squash-and-stretch pop.
 */
export function Glow({ mood, color = "sunset" }: { mood: Mood; color?: GlowColor }) {
  const id = `gl${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const c = GLOW_COLORS.find((g) => g.id === color) ?? GLOW_COLORS[0]!;
  const vars = { "--gl-1": c.c1, "--gl-2": c.c2, "--gl-3": c.c3, "--gl-hi": c.hi, "--gl-edge": c.edge } as CSSProperties;
  return (
    <div className="av av-glow" data-mood={mood} data-color={c.id} style={vars}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id={`${id}f`} x1="0.15" y1="0.1" x2="0.9" y2="0.95">
            <stop offset="0" className="gl-c1" />
            <stop offset="0.5" className="gl-c2" />
            <stop offset="1" className="gl-c3" />
          </linearGradient>
          <radialGradient id={`${id}h`} cx="0.4" cy="0.28" r="0.8">
            <stop offset="0" className="gl-hi" stopOpacity="0.4" />
            <stop offset="0.5" className="gl-hi" stopOpacity="0" />
            <stop offset="0.82" className="gl-edge" stopOpacity="0" />
            <stop offset="1" className="gl-edge" stopOpacity="0.32" />
          </radialGradient>
          <radialGradient id={`${id}s`} cx="0.36" cy="0.3" r="0.82">
            <stop offset="0.45" className="gl-edge" stopOpacity="0" />
            <stop offset="0.78" className="gl-edge" stopOpacity="0.14" />
            <stop offset="1" className="gl-edge" stopOpacity="0.38" />
          </radialGradient>
          <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <linearGradient id={`${id}r`} x1="0.15" y1="0.05" x2="0.85" y2="1">
            <stop offset="0" className="gl-hi" stopOpacity="0.9" />
            <stop offset="0.6" className="gl-hi" stopOpacity="0.2" />
            <stop offset="1" className="gl-hi" stopOpacity="0.45" />
          </linearGradient>
          <filter id={`${id}d`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          <filter id={`${id}n`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0 0.5 0.9" />
            </feComponentTransfer>
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
        </defs>
        <g className="gl-waves">
          {[0, 1, 2].flatMap((i) => WAVES.map((d, side) => <path key={`${i}${side}`} d={d} />))}
        </g>
        <g className="gl-bubbles">
          <circle cx="146" cy="36" r="5" />
          <circle cx="162" cy="20" r="8" />
          <circle cx="184" cy="2" r="11" />
        </g>
        <g className="gl-pop" key={mood}>
          <g className="gl-body">
            <g className="gl-squish">
              <ellipse className="gl-drop" cx="100" cy="128" rx="78" ry="66" filter={`url(#${id}d)`} />
              <ellipse cx="100" cy="109" rx="78" ry="73" fill={`url(#${id}f)`} />
              <ellipse cx="100" cy="109" rx="78" ry="73" fill={`url(#${id}h)`} />
              <ellipse cx="100" cy="109" rx="78" ry="73" fill={`url(#${id}s)`} />
              <ellipse className="gl-grain" cx="100" cy="109" rx="78" ry="73" filter={`url(#${id}n)`} />
              <ellipse className="gl-shine" cx="70" cy="66" rx="22" ry="12" transform="rotate(-32 70 66)" filter={`url(#${id}b)`} />
              <ellipse className="gl-rim" cx="100" cy="109" rx="77" ry="72" stroke={`url(#${id}r)`} />
              <g className="gl-face">
                <g className="gl-cheeks">
                  <ellipse cx="62" cy="119" rx="9" ry="5" />
                  <ellipse cx="138" cy="119" rx="9" ry="5" />
                </g>
                <path className="gl-brow-up" d="M62 82Q70 75 79 80M121 80Q130 75 138 82" />
                <path className="gl-brow-think" d="M62 84 79 83M121 77Q130 68 138 74" />
                <path className="gl-brow-worry" d="M63 84 79 78M121 78 137 84" />
                <GlowEye x={72} />
                <GlowEye x={128} />
                <path className="gl-m-smile" d="M84 121Q100 137 116 121" />
                <path className="gl-m-soft" d="M93 122Q100 127 107 122" />
                <path className="gl-m-hmm" d="M94 125 106 121" />
                <path className="gl-m-wavy" d="M87 126Q91 121 95 125T103 125T111 123" />
                <path className="gl-m-talk" d="M87 117Q100 121 113 117Q112 135 100 135Q88 135 87 117Z" />
                <path className="gl-m-grin" d="M80 114Q100 121 120 114Q118 142 100 142Q82 142 80 114Z" />
                <ellipse className="gl-m-o" cx="100" cy="125" rx="4.5" ry="5.5" />
              </g>
            </g>
          </g>
        </g>
        <g className="gl-sparkles">
          {SPARKLE_SPOTS.map((t) => (
            <g key={t} transform={t}>
              <path d={SPARKLE} />
            </g>
          ))}
        </g>
      </svg>
      <Fx />
    </div>
  );
}
