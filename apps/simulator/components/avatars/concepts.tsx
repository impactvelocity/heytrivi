/**
 * Trivi avatar concepts for the lab (/avatars). Each concept draws one mood:
 * the four voice states the stage uses today, plus four game moments the
 * current orb has no look for yet. The two "Current" concepts are the real
 * VoiceOrb in its Duo and Show skins, unchanged; everything else is a sketch,
 * drawn in avatars.css and sized by --s.
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import type { ThemeId } from "@/lib/demo-data";
import { VoiceOrb, type VoiceState } from "@/components/demo/VoiceOrb";
import { Fx, Glow, type GlowColor, type Mood } from "./Glow";

export type { GlowColor, Mood } from "./Glow";
export { GLOW_COLORS } from "./Glow";

export const MOODS: { id: Mood; name: string; when: string; isNew?: boolean }[] = [
  { id: "idle", name: "Waiting", when: "Nobody is talking. Trivi breathes and blinks." },
  { id: "listening", name: "Listening", when: "The mic is open and Trivi leans in." },
  { id: "thinking", name: "Thinking", when: "Waiting on the model, or checking an answer." },
  { id: "speaking", name: "Talking", when: "Reading a question or a reply out loud." },
  { id: "correct", name: "Right answer", when: "Someone in the family got it.", isNew: true },
  { id: "wrong", name: "Wrong answer", when: "A gentle oops, never mean.", isNew: true },
  { id: "celebrating", name: "Winner", when: "End of a round, a new leader, or a streak.", isNew: true },
  { id: "sleeping", name: "Asleep", when: "Quiet for a while, or the game is paused.", isNew: true },
];

/** What the shipping orb shows for a mood it was never drawn for. */
const FALLBACK: Record<Mood, VoiceState> = {
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  correct: "speaking",
  wrong: "idle",
  celebrating: "speaking",
  sleeping: "idle",
};

const VOICE: Mood[] = ["idle", "listening", "thinking", "speaking"];
const ALL: Mood[] = MOODS.map((m) => m.id);

function Face({ mouth = true }: { mouth?: boolean }) {
  return (
    <span className="av-face">
      <span className="av-eyes">
        <span className="av-eye">
          <i />
        </span>
        <span className="av-eye">
          <i />
        </span>
      </span>
      {mouth && <span className="av-mouth" />}
    </span>
  );
}

const STAR = "0,-13 3.2,-4.5 12.4,-4 5.2,1.7 7.6,10.5 0,5.5 -7.6,10.5 -5.2,1.7 -12.4,-4 -3.2,-4.5";

/** One lens's eye: pupil, happy curve, closed curve, star. avatars.css shows one per mood. */
function LineEye({ x, y = 104, scale = 1, oval }: { x: number; y?: number; scale?: number; oval?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="lb-blink">
        {oval ? (
          <g className="lb-pupil">
            <ellipse rx="7.5" ry="12" fill="currentColor" />
            <ellipse className="pf-iris" cy="5" rx="5.5" ry="5.5" />
            <ellipse cx="-1.5" cy="-5" rx="3.5" ry="4.5" fill="#fff" />
          </g>
        ) : (
          <g className="lb-pupil">
            <circle r="11" fill="currentColor" />
            <circle cx="-4" cy="-4" r="3.8" fill="#fff" />
            <circle cx="4.5" cy="4.5" r="1.8" fill="#fff" />
          </g>
        )}
      </g>
      <path className="lb-happy" d="M-11 5Q0-10 11 5" />
      <path className="lb-closed" d="M-11-2Q0 10 11-2" />
      <polygon className="lb-star" points={STAR} />
    </g>
  );
}

/** Every mouth, drawn around (101, 148); avatars.css shows one per mood. */
function LineMouths({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path className="lb-m-smile lb-line" d="M90 143Q101 155 112 143" />
      <ellipse className="lb-m-o" cx="101" cy="148" rx="5" ry="6" fill="currentColor" />
      <path className="lb-m-flat lb-line" d="M100 148 112 146" />
      <ellipse className="lb-m-talk" cx="101" cy="148" rx="8" ry="7" fill="currentColor" />
      <path className="lb-m-frown lb-line" d="M92 153Q101 145 110 153" />
      <g className="lb-m-open">
        <path d="M86 140H116Q115 163 101 163T86 140Z" fill="currentColor" />
        <ellipse cx="101" cy="157" rx="7" ry="4" fill="#ff7a8a" />
      </g>
    </g>
  );
}

/** Thick black line art on a color blob: round head, big glasses, a question-mark curl. */
function Specs({ mood }: { mood: Mood }) {
  const clip = `lb${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="av av-lineart av-specs" data-mood={mood}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <clipPath id={clip}>
            <circle cx="100" cy="110" r="58" />
          </clipPath>
        </defs>
        <path className="lb-blob" d="M100 12C150 8 190 44 188 96C186 148 152 192 100 190C50 188 12 150 12 102C12 52 52 16 100 12Z" />
        <g transform="rotate(-8 100 110) translate(4 -4)">
          <g className="lb-head">
            <path className="lb-bow" d="M100 174 80 163Q75 174 80 185ZM100 174 120 163Q125 174 120 185Z" />
            <circle cx="100" cy="110" r="58" fill="#fff" />
            <path
              clipPath={`url(#${clip})`}
              d="M36 86C36 28 164 28 164 86C150 72 134 68 120 74C110 64 90 62 80 72C66 68 48 72 36 86Z"
              fill="currentColor"
            />
            <path d="M66 66Q78 56 92 55" className="lb-shine" />
            <circle cx="100" cy="110" r="58" className="lb-line" />
            <path className="lb-curl lb-line" d="M98 54C96 42 104 38 110 33C118 27 116 15 106 14C98 13 92 18 92 25" />
            <path className="lb-line lb-thin" d="M64 136l-2 5M71 142l-2 4M136 136l2 5M129 142l2 4" />
            <g className="lb-brows lb-line">
              <path d="M64 75 88 66M112 66 136 75" />
            </g>
            <g className="lb-glasses">
              <path className="lb-line" d="M56 101 45 97M144 101 155 97M97 99Q101 92 105 99" />
              <circle cx="78" cy="104" r="22" fill="#fff" className="lb-line" />
              <circle cx="122" cy="104" r="22" fill="#fff" className="lb-line" />
              <LineEye x={78} />
              <LineEye x={122} />
            </g>
            <LineMouths />
            <circle cx="100" cy="174" r="6" fill="currentColor" />
            <path className="lb-shine" d="M84 169 84 177" />
          </g>
        </g>
      </svg>
      <Fx />
    </div>
  );
}

/** A round puffball with stubby arms and feet, outlined thick, wearing Trivi's glasses. */
function Puff({ mood }: { mood: Mood }) {
  const grad = `pf${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="av av-lineart av-puff" data-mood={mood}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <radialGradient id={grad} cx="0.38" cy="0.3" r="0.78">
            <stop offset="0" className="pf-s1" />
            <stop offset="0.55" className="pf-s2" />
            <stop offset="1" className="pf-s3" />
          </radialGradient>
        </defs>
        <ellipse className="pf-shadow" cx="100" cy="181" rx="68" ry="7" />
        <g className="pf-body">
          <g className="pf-arm-l">
            <ellipse className="pf-skin lb-line" cx="44" cy="124" rx="20" ry="17" />
          </g>
          <g className="pf-arm-r">
            <ellipse className="pf-skin lb-line" cx="156" cy="124" rx="20" ry="17" />
          </g>
          <ellipse className="pf-foot lb-line" cx="72" cy="168" rx="26" ry="12" transform="rotate(-6 72 168)" />
          <ellipse className="pf-foot lb-line" cx="128" cy="168" rx="26" ry="12" transform="rotate(6 128 168)" />
          <ellipse cx="100" cy="108" rx="64" ry="60" fill={`url(#${grad})`} />
          <path className="pf-gloss" d="M50 88Q57 66 80 55" />
          <ellipse className="lb-line" cx="100" cy="108" rx="64" ry="60" />
          <ellipse className="pf-blush" cx="61" cy="129" rx="11" ry="5.5" />
          <ellipse className="pf-blush" cx="139" cy="129" rx="11" ry="5.5" />
          <g className="lb-brows lb-line">
            <path d="M60 77 86 67M114 67 140 77" />
          </g>
          <g className="lb-glasses">
            <path className="lb-line" d="M59 104 50 101M141 104 150 101M96 102Q100 95 104 102" />
            <circle className="pf-lens lb-line" cx="79" cy="105" r="20" />
            <circle className="pf-lens lb-line" cx="121" cy="105" r="20" />
            <LineEye x={79} y={105} scale={0.92} oval />
            <LineEye x={121} y={105} scale={0.92} oval />
          </g>
          <LineMouths transform="translate(100 135) scale(0.6) translate(-101 -148)" />
        </g>
      </svg>
      <Fx />
    </div>
  );
}

const HEART = "M0 5C-2-1-12-2-12 6C-12 12-4 16 0 20C4 16 12 12 12 6C12-2 2-1 0 5Z";

/** One eye: white, iris and shine, a lid that can drop over it, and two closed shapes. */
function SunnyEye({ x, side, clip }: { x: number; side: "l" | "r"; clip: string }) {
  const id = `${clip}-${side}`;
  const squint = side === "l" ? "M-12-7 6 0-12 7" : "M12-7-6 0 12 7";
  return (
    <g className={`em-eye em-eye-${side}`} transform={`translate(${x} 98)`}>
      <clipPath id={id}>
        <ellipse rx="14" ry="16" />
      </clipPath>
      <g className="em-open">
        <g className="em-blink">
          <ellipse rx="14" ry="16" fill="#fff" />
          <g className="em-iris">
            <circle r="10" fill="#6b3310" />
            <circle r="6" fill="#1f0b03" />
            <circle cx="-3.5" cy="-4" r="3.6" fill="#fff" />
            <circle cx="3.6" cy="3.6" r="1.7" fill="#fff" />
          </g>
          <g clipPath={`url(#${id})`}>
            <g className="em-lid">
              <rect x="-18" y="-42" width="36" height="26" />
              <path className="em-ink em-thin" d="M-18-16H18" />
            </g>
          </g>
          <ellipse className="em-rim" rx="14" ry="16" />
          <path className="em-ink em-lash" d="M-14-4Q-12-17 0-17Q12-17 14-4" />
        </g>
      </g>
      <path className="em-closed em-ink" d="M-12 0Q0 10 12 0" />
      <path className="em-squint em-ink" d={squint} />
    </g>
  );
}

/** A glossy emoji face. Brows, blush and a hand do the acting; the face turns red-hot for a winner. */
function Sunny({ mood }: { mood: Mood }) {
  const id = `em${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hand = `url(#${id}-hand)`;
  const hot = `url(#${id}-hot)`;
  return (
    <div className="av av-emoji" data-mood={mood}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <radialGradient id={`${id}-sun`} cx="50%" cy="56%" r="58%">
            <stop offset="0" stopColor="#ff9526" />
            <stop offset="0.5" stopColor="#ffb22e" />
            <stop offset="0.85" stopColor="#ffd23b" />
            <stop offset="1" stopColor="#ffe36a" />
          </radialGradient>
          <radialGradient id={`${id}-hot`} cx="50%" cy="56%" r="58%">
            <stop offset="0" stopColor="#e01c0a" />
            <stop offset="0.55" stopColor="#ff3a12" />
            <stop offset="0.88" stopColor="#ff5a16" />
            <stop offset="1" stopColor="#ff8a24" />
          </radialGradient>
          <radialGradient id={`${id}-blush`}>
            <stop offset="0" stopColor="#ff4a36" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ff4a36" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-hand`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffdf6" />
            <stop offset="1" stopColor="#f1ddb0" />
          </linearGradient>
          <linearGradient id={`${id}-heart`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff5c7c" />
            <stop offset="1" stopColor="#e5103a" />
          </linearGradient>
        </defs>
        <g className="em-hearts" fill={`url(#${id}-heart)`}>
          <g transform="translate(88 6) scale(1.3)">
            <path className="em-heart" d={HEART} />
          </g>
          <g transform="translate(112 30) scale(0.75)">
            <path className="em-heart" d={HEART} />
          </g>
        </g>
        <g className="em-head">
          <g className="em-horns" fill={hot}>
            <path d="M54 56Q36 34 46 12Q56 34 74 42Z" />
            <path d="M146 56Q164 34 154 12Q144 34 126 42Z" />
          </g>
          <ellipse cx="100" cy="104" rx="84" ry="74" fill={`url(#${id}-sun)`} />
          <ellipse className="em-hot" cx="100" cy="104" rx="84" ry="74" fill={hot} />
          <ellipse className="em-blush" cx="50" cy="126" rx="24" ry="15" fill={`url(#${id}-blush)`} />
          <ellipse className="em-blush" cx="150" cy="126" rx="24" ry="15" fill={`url(#${id}-blush)`} />
          <path className="em-ink em-brow em-brow-l" d="M56 68Q68 58 84 63" />
          <path className="em-ink em-brow em-brow-r" d="M116 63Q132 58 144 68" />
          <SunnyEye x={72} side="l" clip={id} />
          <SunnyEye x={128} side="r" clip={id} />
          <path className="em-ink em-m-smile" d="M80 136Q100 154 120 136" />
          <path className="em-ink em-m-shy" d="M90 144Q100 151 110 144" />
          <path className="em-ink em-m-hmm" d="M92 148Q103 139 114 147" />
          <path className="em-ink em-m-love" d="M66 128Q92 162 128 136" />
          <g className="em-m-talk">
            <ellipse cx="100" cy="142" rx="14" ry="12" fill="#4a1606" />
            <ellipse cx="100" cy="149" rx="8" ry="4.5" fill="#ff7a6e" />
          </g>
          <g className="em-m-grim" transform="rotate(-8 121 151)">
            <rect x="104" y="143" width="34" height="17" rx="8.5" fill="#4a1606" />
            <rect x="108" y="145" width="26" height="6" rx="3" fill="#fff" />
          </g>
          <g className="em-m-grin">
            <path d="M68 130Q100 138 132 130Q128 172 100 172Q72 172 68 130Z" fill="#3a0a04" />
            <ellipse cx="100" cy="163" rx="16" ry="7" fill="#ff6a5e" />
            <path d="M77 132 85 133 81 144ZM123 132 115 133 119 144Z" fill="#fff" />
          </g>
          <ellipse className="em-m-o" cx="100" cy="146" rx="5" ry="6" fill="#4a1606" />
          <g className="em-hand em-hand-chin" fill={hand}>
            <g transform="translate(124 188)">
              <rect x="-24" y="-6" width="13" height="20" rx="6.5" transform="rotate(25)" />
              <rect x="-17" y="-8" width="36" height="28" rx="13" />
              <rect x="-6.5" y="-30" width="13" height="32" rx="6.5" transform="rotate(-22)" />
              <path d="M-6 4Q0 8 6 4M-4 12Q2 15 8 12" fill="none" />
            </g>
          </g>
          <g className="em-hand em-hand-palm" fill={hand}>
            <g transform="translate(70 104) rotate(32)">
              <rect x="-34" y="4" width="12" height="26" rx="6" transform="rotate(-30)" />
              <rect x="-23" y="-8" width="48" height="44" rx="20" />
              <rect x="-21" y="-40" width="11.5" height="46" rx="5.75" />
              <rect x="-9.5" y="-44" width="11.5" height="50" rx="5.75" />
              <rect x="2" y="-42" width="11.5" height="48" rx="5.75" />
              <rect x="13.5" y="-34" width="11.5" height="40" rx="5.75" />
            </g>
          </g>
        </g>
      </svg>
      <Fx />
    </div>
  );
}

function Orb({ mood, skin, extended }: { mood: Mood; skin: "duo" | "show"; extended?: boolean }) {
  return (
    <div className={`av av-orb${extended ? " av-orb-ext" : ""}`} data-mood={mood}>
      <VoiceOrb state={FALLBACK[mood]} />
      {extended && <Fx />}
    </div>
  );
}

export type Concept = {
  id: string;
  name: string;
  tag: "Current" | "Proposal" | "New idea";
  blurb: string;
  skin: "duo" | "show";
  /** Moods this concept has its own look for; the rest fall back. */
  covers: Mood[];
  /** Only Glow uses the body color so far; other concepts ignore it. */
  render: (mood: Mood, color?: GlowColor) => ReactNode;
};

export const CONCEPTS: Concept[] = [
  {
    id: "orb",
    name: "Orb, Duo skin",
    tag: "Current",
    blurb: "What ships on /demo today: a ringed orb with a face. Four voice states; other moments fall back to one of them.",
    skin: "duo",
    covers: VOICE,
    render: (mood) => <Orb mood={mood} skin="duo" />,
  },
  {
    id: "orb-show",
    name: "Orb, Show skin",
    tag: "Current",
    blurb: "The original dark game show: the same orb with an equalizer in place of a face.",
    skin: "show",
    covers: VOICE,
    render: (mood) => <Orb mood={mood} skin="show" />,
  },
  {
    id: "orb-plus",
    name: "Orb + new moods",
    tag: "Proposal",
    blurb: "The current orb, kept as is, with looks for the four moments it can't show yet: happy eyes, a worried brow, star eyes, a nap.",
    skin: "duo",
    covers: ALL,
    render: (mood) => <Orb mood={mood} skin="duo" extended />,
  },
  {
    id: "specs",
    name: "Specs",
    tag: "New idea",
    blurb: "Thick black-and-white line art on a color blob, like a sticker. Big round glasses do the acting, and the curl on top is a question mark.",
    skin: "duo",
    covers: ALL,
    render: (mood) => <Specs mood={mood} />,
  },
  {
    id: "emoji",
    name: "Sunny",
    tag: "New idea",
    blurb: "A glossy emoji face, orange at the heart and yellow at the rim. Brows, blush and a hand do the acting: a chin stroke to think, hearts for a right answer, a facepalm for a miss, red-hot horns for the winner.",
    skin: "duo",
    covers: ALL,
    render: (mood) => <Sunny mood={mood} />,
  },
  {
    id: "puff",
    name: "Puff",
    tag: "New idea",
    blurb: "A round puffball with stubby arms and feet, thick outlines, and Trivi's glasses. Squishy like the Gumdrop, bold like Specs, and its color follows the theme.",
    skin: "duo",
    covers: ALL,
    render: (mood) => <Puff mood={mood} />,
  },
  {
    id: "glow",
    name: "Glow",
    tag: "New idea",
    blurb: "A grainy gradient ball with a simple white face. Pick its body color; every state lands with a squash-and-stretch pop, and it still reads as an icon at small sizes.",
    skin: "duo",
    covers: ALL,
    render: (mood, color) => <Glow mood={mood} color={color} />,
  },
  {
    id: "blob",
    name: "Gumdrop",
    tag: "New idea",
    blurb: "A squishy jelly body that never holds still. Feelings come from squash and stretch, so they read from across the room.",
    skin: "duo",
    covers: ALL,
    render: (mood) => (
      <div className="av av-blob" data-mood={mood}>
        <span className="av-floor" />
        <span className="av-body">
          <Face />
        </span>
        <Fx />
      </div>
    ),
  },
  {
    id: "bot",
    name: "Screen bot",
    tag: "New idea",
    blurb: "A little TV with LED eyes and an antenna light, a nod to the Echo Show it lives on. Eye shapes do the acting.",
    skin: "duo",
    covers: ALL,
    render: (mood) => (
      <div className="av av-bot" data-mood={mood}>
        <span className="av-floor" />
        <span className="av-antenna">
          <i />
        </span>
        <span className="av-screen">
          <Face />
          <span className="av-wave">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
        </span>
        <Fx />
      </div>
    ),
  },
  {
    id: "buzzer",
    name: "Buzzer buddy",
    tag: "New idea",
    blurb: "A game-show buzzer with a face. The dome's color tells the room the state at a glance, and the base lights chase like the marquee.",
    skin: "duo",
    covers: ALL,
    render: (mood) => (
      <div className="av av-buzzer" data-mood={mood}>
        <span className="av-floor" />
        <span className="av-base">
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
        <span className="av-dome">
          <Face />
        </span>
        <Fx />
      </div>
    ),
  },
  {
    id: "eyes",
    name: "Just eyes",
    tag: "New idea",
    blurb: "No body at all: two big eyes that float on the stage. The calmest option, and the easiest to scale down to an icon.",
    skin: "duo",
    covers: ALL,
    render: (mood) => (
      <div className="av av-eyesonly" data-mood={mood}>
        <span className="av-floor" />
        <Face mouth={false} />
        <Fx />
      </div>
    ),
  },
];

/** A concept on its stage: the .dm wrapper gives it the theme's colors from demo.css and duo.css. */
export function ConceptStage({
  concept,
  mood,
  theme,
  size,
  color,
  className = "",
}: {
  concept: Concept;
  mood: Mood;
  theme: ThemeId;
  size: number;
  color?: GlowColor;
  className?: string;
}) {
  return (
    <div
      className={`dm al-stage ${className}`}
      data-skin={concept.skin}
      data-theme={theme}
      style={{ "--s": `${size}px` } as CSSProperties}
    >
      {concept.render(mood, color)}
    </div>
  );
}
