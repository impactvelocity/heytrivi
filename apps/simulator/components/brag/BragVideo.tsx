"use client";

/**
 * The Hey Trivi demo video, drawn as a 1920×1080 page (/brag). Each frame is
 * a pure function of the time `t`: a renderer calls window.__seek(t), which
 * sets the time, then parks every CSS animation and transition at the
 * matching moment, so screenshots come out the same at any speed. Open
 * /brag?t=12.5 for a still, or /brag?play to watch it run (no sound).
 */

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { StageBackdrop } from "@/components/demo/StageBackdrop";
import { DURATION, FPS, ramp, SCENES } from "./anim";
import { Architecture, EndCard, Hook, ThreeParts } from "./Explainers";
import { LEVELS } from "./levels";
import { StageScene } from "./StageScene";

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

declare global {
  interface Window {
    __seek?: (t: number) => Promise<boolean>;
    __ready?: boolean;
  }
}

const on = (t: number, [a, b]: readonly [number, number]) => t >= a - 0.05 && t < b + 0.05;

export function BragVideo() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // When each animation first showed up, so one-shot ones play from their start.
    const born = new WeakMap<Animation, number>();
    const park = (time: number) => {
      for (const a of document.getAnimations()) {
        if (!born.has(a)) born.set(a, time);
        const loops = a.effect?.getComputedTiming().iterations === Infinity;
        a.pause();
        a.currentTime = (loops ? time : time - born.get(a)!) * 1000;
      }
    };
    window.__seek = async (time: number) => {
      flushSync(() => setT(time));
      await frame();
      await frame();
      park(time);
      await frame();
      return true;
    };
    let raf = 0;
    if (params.has("play")) {
      const start = performance.now() - Number(params.get("play") || 0) * 1000;
      const tick = () => {
        const now = ((performance.now() - start) / 1000) % DURATION;
        setT(now);
        park(now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else if (params.has("t")) {
      void window.__seek(Number(params.get("t")));
    }
    void document.fonts.ready.then(() => {
      window.__ready = true;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const level = LEVELS[Math.round(t * FPS)] ?? 0;
  // Quiz night's floating icons belong to the stage and the ending; elsewhere the night stays calm.
  const quiz = ramp(t, SCENES.end[0], 1.2);

  return (
    <div className="dm bv" data-skin="duo" data-theme="showtime">
      <div className="bv-bg">
        <span className="dm-rays bv-bg-rays" />
        {quiz > 0 && (
          <span className="bv-bg-quiz" style={{ opacity: quiz }}>
            <StageBackdrop kind="quiz" />
          </span>
        )}
      </div>
      {on(t, SCENES.hook) && <Hook t={t} />}
      {(on(t, SCENES.stage1) || on(t, SCENES.stage2)) && <StageScene t={t} level={level} />}
      {on(t, SCENES.parts) && <ThreeParts t={t} level={level} />}
      {on(t, SCENES.built) && <Architecture t={t} />}
      {on(t, SCENES.end) && <EndCard t={t} level={level} />}
    </div>
  );
}
