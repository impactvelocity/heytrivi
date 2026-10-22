/**
 * Trivi's voice: original artwork, a glowing ring around a dark glass core
 * with a little equalizer inside. The duo skin swaps the equalizer for a face
 * (see duo.css). Four states, all drawn in demo.css:
 *   idle      slow spin and a gentle breath, bars resting as dots
 *   listening ring turns mint, ripples spread out, bars follow the voice
 *   thinking  a comet chases around the ring, bars hop in a wave
 *   speaking  halo pulses, bars dance
 * While real sound is measured (lib/audio-levels.ts), the orb gets `data-live`
 * and the bars, mouth, and halo follow it through --l and --lvl (live.css).
 */

import { useEffect, useRef, type CSSProperties } from "react";
import { BANDS, readLevels } from "@/lib/audio-levels";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const LABELS: Record<VoiceState, string> = {
  idle: "Trivi is waiting",
  listening: "Trivi is listening",
  thinking: "Trivi is thinking",
  speaking: "Trivi is talking",
};

/** Per-bar timing so the equalizer never moves in lockstep. */
const BARS = [
  { d: 0.7, o: -0.2 },
  { d: 0.92, o: -0.55 },
  { d: 0.6, o: 0 },
  { d: 0.84, o: -0.35 },
  { d: 0.74, o: -0.62 },
];

/** Write live levels straight to CSS variables each frame, without re-rendering. */
function useLevels(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const orb = ref.current;
    if (!orb || !active) return;
    const bars = orb.querySelectorAll<HTMLElement>(".dm-orb-bars i");
    const levels = new Array<number>(BANDS).fill(0);
    let frame = 0;
    const tick = () => {
      if (readLevels(levels)) {
        orb.dataset.live = "";
        bars.forEach((b, i) => b.style.setProperty("--l", levels[i]!.toFixed(3)));
        orb.style.setProperty("--lvl", (levels.reduce((a, b) => a + b, 0) / BANDS).toFixed(3));
      } else {
        delete orb.dataset.live;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      delete orb.dataset.live;
    };
  }, [active]);
  return ref;
}

export function VoiceOrb({ state }: { state: VoiceState }) {
  const ref = useLevels(state === "listening" || state === "speaking");
  return (
    <div ref={ref} className="dm-orb" data-state={state} role="img" aria-label={LABELS[state]}>
      <span className="dm-orb-halo" />
      <span className="dm-orb-ripple" />
      <span className="dm-orb-ripple" />
      <span className="dm-orb-ripple" />
      <span className="dm-orb-glow" />
      <span className="dm-orb-ring" />
      <span className="dm-orb-core">
        <span className="dm-orb-face">
          <span className="dm-orb-eyes">
            <span className="dm-orb-eye">
              <i />
            </span>
            <span className="dm-orb-eye">
              <i />
            </span>
          </span>
          <span className="dm-orb-mouth" />
        </span>
        <span className="dm-orb-bars">
          {BARS.map((b, i) => (
            <i key={i} style={{ "--d": `${b.d}s`, "--o": `${b.o}s`, "--n": i } as CSSProperties} />
          ))}
        </span>
      </span>
    </div>
  );
}
