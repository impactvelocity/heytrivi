/**
 * Live sound levels for the /demo orb, through a Web Audio analyser: the mic
 * while someone talks, Polly's audio while Trivi talks. One source at a time.
 *
 * The browser's own voice (speechSynthesis) can't be measured, so then
 * `readLevels` returns false and the orb keeps its CSS animation.
 */

export const BANDS = 5;

/** Low voice frequencies in the middle bar, higher ones out to the sides. */
const BAR_ORDER = [3, 1, 0, 2, 4];

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: AudioNode | null = null;
let mic: MediaStream | null = null;
let bins: Uint8Array<ArrayBuffer> | null = null;

/** The shared context, running. Null if the browser won't start it (no tap yet). */
async function running(): Promise<AudioContext | null> {
  if (typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state !== "running") {
    // resume() waits for a user gesture forever, so don't wait long.
    await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 150))]);
  }
  return ctx.state === "running" ? ctx : null;
}

function attach(c: AudioContext, node: AudioNode, toSpeakers: boolean): void {
  stopLevels();
  analyser = c.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;
  bins = new Uint8Array(analyser.frequencyBinCount);
  node.connect(analyser);
  if (toSpeakers) analyser.connect(c.destination);
  source = node;
}

/** Measure the mic. Speech recognition opens its own mic stream; this is a second, level-only one. */
export async function measureMic(): Promise<void> {
  const c = await running();
  if (!c || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    attach(c, c.createMediaStreamSource(stream), false);
    mic = stream;
  } catch {
    // No mic permission: the orb animates on its own.
  }
}

/**
 * Measure an audio element before it plays. Its sound then goes through the
 * analyser to the speakers, so only call this when the context is running,
 * which `running()` checks; otherwise the element would play silently.
 */
export async function measureAudio(audio: HTMLAudioElement): Promise<boolean> {
  const c = await running();
  if (!c) return false;
  attach(c, c.createMediaElementSource(audio), true);
  return true;
}

export function stopLevels(): void {
  source?.disconnect();
  analyser?.disconnect();
  mic?.getTracks().forEach((t) => t.stop());
  source = analyser = mic = bins = null;
}

/** Fill `out` with BANDS levels from 0 to 1. False when nothing is being measured. */
export function readLevels(out: number[]): boolean {
  if (!analyser || !bins) return false;
  analyser.getByteFrequencyData(bins);
  // Voice sits roughly in bins 1 to 25 (about 190 Hz to 4.7 kHz at 48 kHz).
  const per = 5;
  for (let b = 0; b < BANDS; b++) {
    let sum = 0;
    for (let i = 1 + b * per; i < 1 + (b + 1) * per; i++) sum += bins[i] ?? 0;
    // Higher bands are quieter, so lift them a little; then ease the curve.
    const v = Math.min(1, (sum / per / 255) * (1 + b * 0.35));
    out[BAR_ORDER[b]!] = Math.pow(v, 1.4);
  }
  return true;
}
