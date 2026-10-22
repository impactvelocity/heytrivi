/**
 * A player as a little cousin of Trivi: a flat shape in a bright version of
 * their color with a white face. Each player keeps their own shape (circle,
 * blob, rounded square, triangle, pill or flower) from their place in the
 * family, unless they picked one with New look (look.shape), and
 * familyColors gives everyone in a family a different color.
 * On the leaderboard the face follows their place, from a big grin in first
 * to a worried look in last; everywhere else they smile. It breathes slowly
 * (demo.css), each player on their own beat.
 */

import type { CSSProperties, ReactNode } from "react";
import type { Look } from "@/lib/demo-data";

type Face = "grin" | "happy" | "smile" | "wink" | "smirk" | "surprised" | "worried";

/** Eyes and mouth, in white on a 64-unit face centered at (32, 32). */
const FACES: Record<Face, ReactNode> = {
  grin: (
    <>
      <ellipse cx="24" cy="28" rx="3.4" ry="5" />
      <ellipse cx="40" cy="28" rx="3.4" ry="5" />
      <path d="M22 37h20q-1 11-10 11t-10-11Z" />
    </>
  ),
  happy: (
    <>
      <path d="M19.5 30q4.5-6 9 0M35.5 30q4.5-6 9 0" className="dm-avatar-line" />
      <path d="M24 39q8 7 16 0" className="dm-avatar-line" />
    </>
  ),
  smile: (
    <>
      <ellipse cx="24" cy="29" rx="3.4" ry="5" />
      <ellipse cx="40" cy="29" rx="3.4" ry="5" />
      <path d="M24 40q8 7 16 0" className="dm-avatar-line" />
    </>
  ),
  wink: (
    <>
      <ellipse cx="24" cy="29" rx="3.4" ry="5" />
      <path d="M35.5 30q4.5-5 9 0" className="dm-avatar-line" />
      <path d="M25 40q7 6.5 15-1" className="dm-avatar-line" />
    </>
  ),
  smirk: (
    <>
      <ellipse cx="24" cy="29" rx="3.4" ry="4.4" />
      <ellipse cx="40" cy="28" rx="3.4" ry="5" />
      <path d="M25 41.5q7 2.5 14-3" className="dm-avatar-line" />
    </>
  ),
  surprised: (
    <>
      <circle cx="24" cy="29" r="4.2" />
      <circle cx="40" cy="29" r="4.2" />
      <ellipse cx="32" cy="42.5" rx="3.6" ry="4.4" />
    </>
  ),
  worried: (
    <>
      <path d="M18.5 21.5 27 19M45.5 21.5 37 19" className="dm-avatar-line" />
      <ellipse cx="24" cy="29.5" rx="3.2" ry="4.4" />
      <ellipse cx="40" cy="29.5" rx="3.2" ry="4.4" />
      <path d="M24.5 43.5q3.75-3.5 7.5 0t7.5 0" className="dm-avatar-line" />
    </>
  ),
};

/** The face for a leaderboard place: proud at the top, worried at the bottom. */
function faceFor(rank: number, of: number): Face {
  if (rank === 0) return "grin";
  if (of > 3 && rank === of - 1) return "worried";
  if (of > 5 && rank === of - 2) return "surprised";
  return (["happy", "smile", "wink", "smirk"] as const)[(rank - 1) % 4]!;
}

/** Each shape, and how to fit the face inside it. */
const SHAPES: { body: (fill: string) => ReactNode; face?: string }[] = [
  { body: (fill) => <circle cx="32" cy="32" r="30" fill={fill} /> },
  { body: (fill) => <path d="M34 2.5c15 .5 27.5 11 27 27.5-.5 17-10.5 31.5-28.5 31.5S3 52 2.5 36 17.5 2 34 2.5Z" fill={fill} /> },
  { body: (fill) => <rect x="3.5" y="3.5" width="57" height="57" rx="17" fill={fill} /> },
  {
    body: (fill) => <path d="M32 8 58 55H6Z" fill={fill} stroke={fill} strokeWidth="9" strokeLinejoin="round" />,
    face: "translate(32 42) scale(0.74) translate(-32 -32)",
  },
  { body: (fill) => <rect x="1.5" y="9" width="61" height="46" rx="23" fill={fill} />, face: "translate(32 32) scale(0.9) translate(-32 -32)" },
  {
    body: (fill) => (
      <g fill={fill}>
        <circle cx="32" cy="32" r="22" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <circle key={i} cx={32 + 20 * Math.cos(a)} cy={32 + 20 * Math.sin(a)} r="10.5" />;
        })}
      </g>
    ),
    face: "translate(32 32) scale(0.88) translate(-32 -32)",
  },
];

/** How many shapes there are to pick from. */
export const AVATAR_SHAPES = SHAPES.length;

/** A color's hue (0 to 360), saturation and lightness (0 to 1). */
function toHsl(hex: string) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (Math.round(h * 60) + 360) % 360, s, l };
}

/**
 * The bright version of a player's color: the same hue, fully saturated and
 * deep enough that the white face reads on it.
 */
function vivid(hex: string) {
  const c = toHsl(hex);
  if (!c) return hex;
  return `hsl(${c.h} ${Math.round(Math.max(c.s, 0.85) * 100)}% ${Math.round(Math.min(c.l, 0.58) * 100)}%)`;
}

/** Bright colors to hand out when two players' own colors are too alike. */
const PALETTE = ["#ff3d7f", "#ff8a1f", "#f5b400", "#1fc46e", "#16b8d4", "#2f7dff", "#8b5cff", "#e04fd8", "#ff5a4f"];

const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
/** How far apart (in hue) two players' colors must be to both keep them. */
const MIN_GAP = 28;

/** Everyone's color, and the hues they took. */
function assign(members: { id: string; look: Look }[]) {
  const taken: number[] = [];
  const colors = new Map<string, string>();
  const free = (h: number) => Math.min(360, ...taken.map((t) => hueGap(h, t)));
  for (const m of members) {
    const own = toHsl(m.look.bg);
    if (own && free(own.h) >= MIN_GAP) {
      taken.push(own.h);
      colors.set(m.id, vivid(m.look.bg));
      continue;
    }
    const pick = PALETTE.map((hex) => ({ hex, h: toHsl(hex)!.h })).sort((a, b) => free(b.h) - free(a.h))[0]!;
    taken.push(pick.h);
    colors.set(m.id, pick.hex);
  }
  return { colors, taken };
}

/**
 * One color per player, all different. Each player keeps a bright version of
 * their own color unless someone earlier in the family already has a color
 * close to it; then they get the palette color furthest from the ones taken.
 */
export const familyColors = (members: { id: string; look: Look }[]) => assign(members).colors;

/** The palette colors a new player would keep: far enough from everyone already in the family. */
export function freeColors(members: { id: string; look: Look }[]) {
  const { taken } = assign(members);
  return PALETTE.filter((hex) => taken.every((t) => hueGap(toHsl(hex)!.h, t) >= MIN_GAP));
}

/** A small stable number from a player's look, for a beat and a fallback shape. */
function hash(look: Look) {
  let h = [...(look.bg + look.hair + look.hairColor + look.skin + look.shirt)].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  // Mix the bits so near-identical looks still land on different shapes.
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

export function Avatar({
  look,
  size = 48,
  shape: n,
  color,
  rank,
  of = 0,
}: {
  look: Look;
  size?: number;
  /** The player's place in their family; picks the shape unless the look has one. */
  shape?: number;
  /** Their color in the family, from familyColors; defaults to their own. */
  color?: string;
  rank?: number;
  of?: number;
}) {
  const h = hash(look);
  const fill = color ?? vivid(look.bg);
  const shape = SHAPES[(look.shape ?? (n !== undefined && n >= 0 ? n : h)) % SHAPES.length]!;
  const face = rank === undefined ? "smile" : faceFor(rank, of);
  return (
    <svg
      className="dm-avatar"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      style={{ "--av-d": `${(h % 9) * -0.45}s` } as CSSProperties}
    >
      <g className="dm-avatar-ball">
        {/* A solid ledge under the shape, in a deeper shade, like the app's buttons. */}
        <g transform="translate(0 3.5)">{shape.body(`color-mix(in srgb, ${fill} 62%, #12071f)`)}</g>
        {shape.body(fill)}
        <g fill="#fff" stroke="#fff" transform={shape.face}>
          {FACES[face]}
        </g>
      </g>
    </svg>
  );
}
