"use client";

/**
 * The show's theme music, with a play/stop button for the header. It stays
 * off until someone presses play (browsers block sound that starts on its
 * own), fades in and out, and ducks under Trivi while the mic listens or
 * Trivi talks, so speech recognition doesn't hear it and Polly isn't drowned
 * out. Stop rewinds, so the next play starts from the top. Phones ignore
 * volume changes (iOS), so there it plays at full volume and stops cold.
 */

import { useEffect, useRef, useState } from "react";
import { Play, Stop } from "./icons";

const TRACK = "/audio/bouncy-game-show.mp3";
/** The volume while playing, and while ducked under Trivi. */
const LEVEL = 0.4;
const DUCKED = 0.08;
const FADE_MS = 600;

export function MusicButton({ duck }: { duck: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const raf = useRef(0);
  const [on, setOn] = useState(false);

  /** Ramps the volume to `to`, then runs `done`. A new fade cancels the last one. */
  const fade = (to: number, done?: () => void) => {
    const el = audio.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const from = el.volume;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / FADE_MS);
      el.volume = from + (to - from) * k;
      if (k < 1) raf.current = requestAnimationFrame(step);
      else done?.();
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (on) fade(duck ? DUCKED : LEVEL);
  }, [on, duck]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = audio.current;
    return () => {
      cancelAnimationFrame(raf.current);
      el?.pause();
    };
  }, []);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (on) {
      setOn(false);
      fade(0, () => {
        el.pause();
        el.currentTime = 0;
      });
      return;
    }
    el.volume = 0;
    setOn(true);
    el.play().catch(() => setOn(false));
  };

  return (
    <>
      <audio ref={audio} src={TRACK} loop preload="none" />
      <button type="button" className="dm-music" data-on={on} onClick={toggle} aria-label={on ? "Stop the music" : "Play the music"}>
        <span className="dm-music-icon">{on ? <Stop width={16} height={16} /> : <Play width={14} height={14} />}</span>
        <span className="dm-music-label">Music</span>
        {on && (
          <span className="dm-music-bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
    </>
  );
}
