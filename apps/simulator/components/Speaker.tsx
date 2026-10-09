/**
 * The speaker: original artwork, a soft round fabric speaker with a light ring
 * at its base (R14.1). The ring shows four states (R14.2):
 *   idle      dim lavender, slow breathing
 *   listening bright mint, steady glow with a pulse
 *   thinking  butter-yellow segment chasing around the ring
 *   speaking  coral, pulsing with the voice
 */

export type RingState = "idle" | "listening" | "thinking" | "speaking";

const BODY = "M24 120 C24 52 72 36 140 36 C208 36 256 52 256 120 L256 190 C256 236 214 252 140 252 C66 252 24 236 24 190 Z";
const RING = "M30 196 C34 234 76 246 140 246 C204 246 246 234 250 196";

export function Speaker({ state }: { state: RingState }) {
  return (
    <svg className={`speaker ring-${state}`} viewBox="0 0 280 280" role="img" aria-label={`Speaker, ${state}`}>
      <defs>
        <pattern id="fabric" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="var(--fabric)" />
          <circle cx="1.25" cy="1.25" r="0.9" fill="var(--fabric-dot)" />
          <circle cx="3.75" cy="3.75" r="0.9" fill="var(--fabric-dot)" />
          <path d="M0 2.5h5" stroke="var(--fabric-line)" strokeWidth="0.4" />
        </pattern>
        <radialGradient id="shade" cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#2b2340" stopOpacity="0.32" />
        </radialGradient>
        <linearGradient id="cap" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--cap-top)" />
          <stop offset="1" stopColor="var(--cap-bottom)" />
        </linearGradient>
        <filter id="glow" x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <clipPath id="body-clip">
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* soft shadow on the counter */}
      <ellipse cx="140" cy="262" rx="118" ry="11" fill="#2b2340" opacity="0.13" />
      {/* glow from the ring, spilling onto the counter */}
      <ellipse className="ring-glow" cx="140" cy="250" rx="118" ry="20" filter="url(#glow)" />

      {/* body: a puffy, rounded fabric pebble */}
      <path d={BODY} fill="url(#fabric)" />
      <path d={BODY} fill="url(#shade)" />

      {/* soft top cap */}
      <g clipPath="url(#body-clip)">
        <ellipse cx="140" cy="62" rx="104" ry="30" fill="url(#cap)" />
        <ellipse cx="140" cy="58" rx="88" ry="20" fill="var(--cap-top)" opacity="0.65" />
      </g>
      <circle cx="114" cy="58" r="5" fill="var(--button)" />
      <circle cx="140" cy="54" r="5" fill="var(--button)" />
      <circle cx="166" cy="58" r="5" fill="var(--button)" />

      {/* the light ring along the base */}
      <path className="ring-track" d={RING} fill="none" strokeWidth="9" strokeLinecap="round" />
      <path className="ring-light" d={RING} fill="none" strokeWidth="9" strokeLinecap="round" pathLength={100} />
    </svg>
  );
}
