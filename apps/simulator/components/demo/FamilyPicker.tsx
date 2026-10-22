"use client";

/** The family card: who's playing, and a menu to switch to another family. */

import { useEffect, useRef, useState } from "react";
import type { DemoFamily, DemoMember } from "@/lib/demo-data";
import { Avatar, familyColors } from "./Avatar";
import { Check, ChevronDown, Plus } from "./icons";

export function AvatarStack({ members, size = 32 }: { members: DemoMember[]; size?: number }) {
  const shown = members.slice(0, 4);
  const colors = familyColors(members);
  return (
    <span className="dm-stack" aria-hidden>
      {shown.map((m, i) => (
        <span key={m.id} className="dm-stack-item">
          <Avatar look={m.look} size={size} shape={i} color={colors.get(m.id)} />
        </span>
      ))}
      {members.length > shown.length && (
        <span className="dm-stack-item dm-stack-more" style={{ width: size, height: size }}>
          +{members.length - shown.length}
        </span>
      )}
    </span>
  );
}

export function FamilyPicker({ families, current, onPick }: { families: DemoFamily[]; current: DemoFamily; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="dm-family" ref={ref}>
      <button type="button" className="dm-card dm-family-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="dm-family-text">
          <span className="dm-family-name">{current.name}</span>
        </span>
        <ChevronDown className="dm-family-chev" />
      </button>

      {open && (
        <div className="dm-menu" role="menu" aria-label="Switch family">
          <p className="dm-eyebrow dm-menu-title">Switch family</p>
          {families.map((f) => (
            <button
              key={f.id}
              type="button"
              role="menuitemradio"
              aria-checked={f.id === current.id}
              className="dm-menu-item"
              onClick={() => {
                onPick(f.id);
                setOpen(false);
              }}
            >
              <AvatarStack members={f.members} size={28} />
              <span className="dm-menu-text">
                <strong>{f.name}</strong>
                <small>{f.members.length} players</small>
              </span>
              {f.id === current.id && <Check className="dm-menu-check" />}
            </button>
          ))}
          <button type="button" role="menuitem" className="dm-menu-item">
            <span className="dm-menu-plus">
              <Plus />
            </span>
            <span className="dm-menu-text">
              <strong>New family</strong>
              <small>Start from scratch</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
