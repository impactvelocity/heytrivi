"use client";

/**
 * The smart display beside the speaker. Shows the show title and the host's
 * words as captions. The scoreboard renders here (milestone 3).
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/** Shrink long captions so they always fit the screen. */
function captionSize(text: string): number {
  const n = text.length;
  return n < 70 ? 7 : n < 130 ? 5.8 : n < 200 ? 5 : n < 300 ? 4.2 : 3.5;
}

export function Display({ title, caption, children }: { title: string; caption: string; children?: ReactNode }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="display-frame">
      <div className="display-screen">
        {children ??
          (caption ? (
            <div className="caption-screen" style={{ fontSize: `${captionSize(caption)}cqw` }}>
              {caption}
            </div>
          ) : (
            <div className="idle-screen">
              <div className="idle-time">{time}</div>
              <div className="idle-title">{title}</div>
            </div>
          ))}
        {children && caption && <div className="caption">{caption}</div>}
      </div>
      <div className="display-stand" />
    </div>
  );
}
