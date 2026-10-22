"use client";

/**
 * The game-show bulbs around the stage. They run along the middle of the
 * frame, evenly spaced on a rounded rectangle, so they meet cleanly at the
 * corners at any size. Spacing comes from the frame's CSS variables
 * (--frame, --frame-radius, --bulb-gap); the pattern comes from `mode`.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type LightsMode = "chase" | "glow" | "fast" | "celebrate" | "off";

type Point = { x: number; y: number };

/**
 * Evenly spaced points on a rounded rectangle inset from a w×h box, clockwise
 * from the top-left. The count is a multiple of 6 so the 2- and 3-group chase
 * patterns wrap around without a seam.
 */
export function bulbPositions(w: number, h: number, inset: number, radius: number, gap: number): Point[] {
  const W = w - inset * 2;
  const H = h - inset * 2;
  if (W <= 0 || H <= 0 || gap <= 0) return [];
  const r = Math.max(0, Math.min(radius - inset, W / 2, H / 2));
  const sx = W - 2 * r;
  const sy = H - 2 * r;
  const arc = (Math.PI * r) / 2;
  const total = 2 * sx + 2 * sy + 4 * arc;
  const n = Math.max(6, Math.round(total / gap / 6) * 6);

  const L = inset;
  const T = inset;
  const R = inset + W;
  const B = inset + H;
  const edges = [
    { x: L + r, y: T, dx: 1, dy: 0, len: sx },
    { x: R, y: T + r, dx: 0, dy: 1, len: sy },
    { x: R - r, y: B, dx: -1, dy: 0, len: sx },
    { x: L, y: B - r, dx: 0, dy: -1, len: sy },
  ];
  const corners = [
    { cx: R - r, cy: T + r, a: -Math.PI / 2 },
    { cx: R - r, cy: B - r, a: 0 },
    { cx: L + r, cy: B - r, a: Math.PI / 2 },
    { cx: L + r, cy: T + r, a: Math.PI },
  ];

  const at = (s: number): Point => {
    for (let k = 0; k < 4; k++) {
      const e = edges[k]!;
      if (s <= e.len) return { x: e.x + e.dx * s, y: e.y + e.dy * s };
      s -= e.len;
      const c = corners[k]!;
      if (s <= arc) {
        const a = c.a + (r ? s / r : 0);
        return { x: c.cx + r * Math.cos(a), y: c.cy + r * Math.sin(a) };
      }
      s -= arc;
    }
    return { x: edges[0]!.x, y: edges[0]!.y };
  };

  return Array.from({ length: n }, (_, i) => at(((i + 0.5) * total) / n));
}

export function MarqueeLights({ mode }: { mode: LightsMode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bulbs, setBulbs] = useState<Point[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const css = getComputedStyle(el);
      const num = (name: string) => parseFloat(css.getPropertyValue(name)) || 0;
      setBulbs(bulbPositions(el.clientWidth, el.clientHeight, num("--frame") / 2, num("--frame-radius"), num("--bulb-gap")));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="dm-lights" data-mode={mode} aria-hidden>
      {bulbs.map((b, i) => (
        <span key={i} className="dm-bulb" style={{ left: b.x, top: b.y, "--g2": i % 2, "--g3": i % 3 } as CSSProperties} />
      ))}
    </div>
  );
}
