/**
 * Timing helpers for the demo video (/brag). Every frame is a pure function
 * of the video time `t` in seconds, so a renderer can seek to any frame.
 *
 * Times in the scenes are word timings from the voiceover transcript (taken
 * at 1.2x); `v()` turns one into video time. The voiceover plays at 1.1x and
 * is cut at the pauses between scenes, with a short beat added after each
 * scene so it can land before the next one starts.
 */

import type { CSSProperties } from "react";

export const FPS = 30;
/** The music's own ending. */
export const DURATION = 149.2;
/** The voiceover starts this far into the video. */
export const OFF = 0.5;
/** Transcript time (1.2x) to 1.1x voiceover time. */
const SPEED = 1.2 / 1.1;

/**
 * Voiceover sections: the transcript time each starts at, where it was cut in
 * the 1.1x voiceover (always inside a pause), and the beat added after it.
 */
export const SEGS = [
  { from: 0, cut: 0, gap: 0.4 }, // hook
  { from: 8.88, cut: 9.62, gap: 1.2 }, // reveal
  { from: 15.46, cut: 16.93, gap: 0.9 }, // snail round
  { from: 32.44, cut: 35.41, gap: 0.3 }, // three parts
  { from: 46.42, cut: 50.57, gap: 0.8 }, // guessing first
  { from: 49.68, cut: 54.1, gap: 0.5 }, // sharks or trees
  { from: 66.7, cut: 72.6, gap: 0.5 }, // theme week
  { from: 79.34, cut: 86.43, gap: 0 }, // space riddle
  { from: 86.88, cut: 94.64, gap: 0.9 }, // movie spend
  { from: 95.06, cut: 103.54, gap: 0.8 }, // how it's built
  { from: 124.5, cut: 135.62, gap: 0 }, // end card
];
/** Where each section starts in the video. */
export const SEG_START = SEGS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? OFF : acc[i - 1]! + (s.cut - SEGS[i - 1]!.cut) + SEGS[i - 1]!.gap], []);

export function v(s: number) {
  let k = 0;
  for (let i = 0; i < SEGS.length; i++) if (s >= SEGS[i]!.from) k = i;
  return SEG_START[k]! + s * SPEED - SEGS[k]!.cut;
}

/** The beat after section `k`: from the end of its voiceover to the start of the next. */
export function pause(k: number) {
  const to = SEG_START[k + 1]!;
  return { from: to - SEGS[k]!.gap, to, mid: to - SEGS[k]!.gap / 2 };
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** 0 before `at`, 1 after `at + dur`. */
export const ramp = (t: number, at: number, dur: number) => (dur <= 0 ? (t >= at ? 1 : 0) : clamp((t - at) / dur));
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const easeIn = (x: number) => x ** 3;
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const backOut = (x: number, s = 1.6) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;

/** In over `inDur` from `at`, out over `outDur` ending at `end`. */
export function life(t: number, at: number, end = Infinity, inDur = 0.5, outDur = 0.45) {
  return Math.min(ramp(t, at, inDur), 1 - ramp(t, end - outDur, outDur));
}

/** Pop in at `at` (fade, rise and a little overshoot); leave before `end`. */
export function pop(t: number, at: number, end = Infinity, o: { y?: number; s?: number; dur?: number; x?: number } = {}): CSSProperties {
  const { y = 26, s = 0.88, dur = 0.65, x = 0 } = o;
  const p = ramp(t, at, dur);
  const q = ramp(t, end - 0.4, 0.4);
  const e = easeOut(p);
  const k = lerp(s, 1, backOut(p)) * lerp(1, 0.97, q);
  return {
    opacity: Math.min(clamp(p * 2.2), 1 - q),
    transform: `translate(${(1 - e) * x}px, ${(1 - e) * y - easeIn(q) * 12}px) scale(${k})`,
    visibility: p <= 0 || q >= 1 ? "hidden" : undefined,
  };
}

/** The words of `text` spoken so far, spread evenly from `from` to `to` (transcript times). */
export function typed(t: number, text: string, from: number, to: number) {
  const words = text.split(" ");
  const n = Math.floor(clamp((t - v(from)) / (v(to) - v(from))) * words.length + (t >= v(from) ? 1 : 0));
  return words.slice(0, Math.min(words.length, n)).join(" ");
}

/** Characters of `text` typed so far, from `from` to `to` (video times). */
export function keyed(t: number, text: string, from: number, to: number) {
  return text.slice(0, Math.round(clamp((t - from) / (to - from)) * text.length));
}

/** The last entry whose time has come, from [time, value] pairs in order. */
export function at<T>(t: number, steps: [number, T][], fallback: T): T {
  let out = fallback;
  for (const [time, value] of steps) if (t >= time) out = value;
  return out;
}

/** A value that eases to each new [time, value] over `dur`. */
export function stepTo(t: number, steps: [number, number][], dur = 0.8) {
  let val = steps[0]![1];
  for (let i = 1; i < steps.length; i++) val = lerp(val, steps[i]![1], easeInOut(ramp(t, steps[i]![0], dur)));
  return val;
}

/**
 * Centers of fixed-width slots that arrive one at a time (at `times`), kept
 * centered as a group: each new arrival slides the others over.
 */
export function centered(t: number, times: number[], w: number, gap: number, dur = 0.7) {
  const k = Math.max(1, times.reduce((n, a) => n + easeInOut(ramp(t, a, dur)), 0));
  const span = k * (w + gap) - gap;
  return times.map((_, i) => i * (w + gap) + w / 2 - span / 2);
}

/**
 * When each scene is on screen. Scenes hand over inside the beats between
 * voiceover sections: the old one fades out, then the new one fades in.
 */
export const SCENES = {
  hook: [0, pause(0).from + 0.35],
  stage1: [pause(0).from + 0.3, pause(2).from + 0.5],
  parts: [pause(2).from + 0.45, pause(4).from + 0.45],
  stage2: [pause(4).from + 0.45, pause(8).from + 0.5],
  built: [pause(8).from + 0.5, pause(9).from + 0.45],
  end: [pause(9).from + 0.45, DURATION],
} as const;
