/**
 * Store images for the Alexa+ add-on listing (alexa/addon-package/addon.json),
 * drawn from the simulator's original speaker artwork. No Amazon or Alexa
 * artwork (R14.3).
 *
 *   icon-<size>.png        light icons: 64, 72, 88, 126, 180, 241
 *   icon-dark-<size>.png   dark icons, same sizes
 *   carousel.png           600 x 900
 *   banner.png             1200 x 600
 */

import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const ICON_SIZES = [64, 72, 88, 126, 180, 241];

export function generateStaticParams() {
  return [
    ...ICON_SIZES.flatMap((s) => [{ file: `icon-${s}.png` }, { file: `icon-dark-${s}.png` }]),
    { file: "carousel.png" },
    { file: "banner.png" },
  ];
}

const C = {
  bg: "#fff7ee",
  bg2: "#fdeee0",
  ink: "#2b2340",
  inkSoft: "#6b6383",
  coral: "#ff8a7a",
  mint: "#4fd1a5",
  butter: "#ffcf5a",
  night: "#2b2340",
  night2: "#3a3058",
};

/** The speaker from components/Speaker.tsx with fixed colours, ring lit mint. */
function speakerSvg(): string {
  const body = "M24 120 C24 52 72 36 140 36 C208 36 256 52 256 120 L256 190 C256 236 214 252 140 252 C66 252 24 236 24 190 Z";
  const ring = "M30 196 C34 234 76 246 140 246 C204 246 246 234 250 196";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280">
  <defs>
    <pattern id="f" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="5" fill="#a79cc8"/><circle cx="1.25" cy="1.25" r="0.9" fill="#b6acd4"/><circle cx="3.75" cy="3.75" r="0.9" fill="#b6acd4"/>
    </pattern>
    <radialGradient id="s" cx="0.38" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2b2340" stop-opacity="0.32"/>
    </radialGradient>
    <clipPath id="c"><path d="${body}"/></clipPath>
    <filter id="g" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <ellipse cx="140" cy="250" rx="118" ry="20" fill="${C.mint}" opacity="0.55" filter="url(#g)"/>
  <path d="${body}" fill="url(#f)"/><path d="${body}" fill="url(#s)"/>
  <g clip-path="url(#c)"><ellipse cx="140" cy="62" rx="104" ry="30" fill="#71679a"/><ellipse cx="140" cy="58" rx="88" ry="20" fill="#7d72a3" opacity="0.65"/></g>
  <circle cx="114" cy="58" r="5" fill="#4e4570"/><circle cx="140" cy="54" r="5" fill="#4e4570"/><circle cx="166" cy="58" r="5" fill="#4e4570"/>
  <path d="${ring}" fill="none" stroke="${C.mint}" stroke-width="9" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function icon(size: number, dark: boolean) {
  const art = Math.round(size * 0.78);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? C.night : C.bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={speakerSvg()} width={art} height={art} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

function poster(width: number, height: number) {
  const tall = height > width;
  const art = tall ? 420 : 380;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: tall ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: tall ? 24 : 56,
          padding: 48,
          background: `linear-gradient(160deg, ${C.bg} 0%, ${C.bg2} 100%)`,
          color: C.ink,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={speakerSvg()} width={art} height={art} alt="" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: tall ? "center" : "flex-start", textAlign: tall ? "center" : "left", maxWidth: tall ? 500 : 560 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -1 }}>Hey Trivi</div>
          <div style={{ fontSize: 34, color: C.inkSoft, marginTop: 12, lineHeight: 1.25 }}>Family trivia that settles who takes out the garbage.</div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            {[
              ["Mom", 7, C.coral],
              ["Sally", 5, C.butter],
              ["John", 3, C.mint],
            ].map(([name, pts, color]) => (
              <div key={name as string} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 999, padding: "10px 18px", fontSize: 26, fontWeight: 700 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: color as string }} />
                {name} {pts}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const m = file.match(/^icon-(dark-)?(\d+)\.png$/);
  if (m && ICON_SIZES.includes(Number(m[2]))) return icon(Number(m[2]), !!m[1]);
  if (file === "carousel.png") return poster(600, 900);
  if (file === "banner.png") return poster(1200, 600);
  return new Response("Not found", { status: 404 });
}
