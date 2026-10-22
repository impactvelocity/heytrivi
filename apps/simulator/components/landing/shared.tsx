"use client";

/**
 * Pieces the landing page sections share: links, the demo family, section
 * headings, and the loop that drives each animated preview. A preview only
 * advances while it's on screen, so a long page doesn't run a dozen timers
 * the reader can't see.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FAMILIES, type DemoMember } from "@/lib/demo-data";

export const DEMO_HREF = "/demo";
export const PARENT_HREF = "/parent";
export const HACKATHON_HREF = "https://amazonappdev2026.devpost.com";
export const REPO_HREF = "https://github.com/impactvelocity/heytrivi";
export const repoPath = (path: string) => `${REPO_HREF}/tree/main/${path}`;

/** The demo family (Mom, Dad, Billy, Sally), each in their own color. */
export const FAMILY = FAMILIES[0]!.members;
export const COLORS: Record<string, string> = { mom: "#ff8fb1", dad: "#7cc6ff", billy: "#ffc53d", sally: "#3ee0c5" };
export const member = (id: string) => FAMILY.find((m) => m.id === id)!;
/** A player's place in the family, which picks their avatar's shape. */
export const shapeOf = (id: string) => FAMILY.findIndex((m) => m.id === id);
/** Everyone in the demo families, for the "who it's for" cards. */
export const EVERYONE: DemoMember[] = FAMILIES.flatMap((f) => f.members);

export function SectionHead({
  title,
  id,
  className = "",
  children,
}: {
  title: string;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`lp-head ${className}`}>
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

/**
 * Steps through `count` beats while the element is on screen and loops.
 * `ms` is one hold time for every beat, or one per beat.
 */
export function useLoop<T extends HTMLElement = HTMLDivElement>(count: number, ms: number | readonly number[]) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hold = typeof ms === "number" ? ms : (ms[step] ?? 1500);
    const t = setTimeout(() => setStep((s) => (s + 1) % count), hold);
    return () => clearTimeout(t);
  }, [visible, step, count, ms]);

  return { ref, step, setStep, visible };
}
