"use client";

/**
 * The hidden switch between the scripted demo and live play. It opens from
 * five quick clicks on the logo, or ?unlock in the address. Locked, it asks
 * for the code (DEMO_UNLOCK_CODE on the server); unlocked, it can lock this
 * browser again. Either way the page reloads to reconnect.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";

export function UnlockDialog({ locked, lockable, onClose }: { locked: boolean; lockable: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("unlock");
    window.location.replace(url);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    if (res?.ok) return reload();
    setBusy(false);
    setCode("");
    setError(res ? "That code isn't right." : "Can't reach the site. Try again.");
  };

  const relock = async () => {
    setBusy(true);
    await fetch("/api/unlock", { method: "DELETE" }).catch(() => null);
    reload();
  };

  return (
    <div className="dm-unlock-scrim" onClick={onClose}>
      <div className="dm-unlock" role="dialog" aria-modal="true" aria-labelledby="dm-unlock-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="dm-unlock-title">{locked ? "Live play" : "Live play is on"}</h2>
        {locked ? (
          <form onSubmit={submit}>
            <p>This page plays a scripted demo. Enter the code to use the real game server, model, and voice in this browser.</p>
            <input
              ref={input}
              className="dm-input"
              type="password"
              autoComplete="off"
              placeholder="Code"
              aria-label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && (
              <p className="dm-unlock-error" role="alert">
                {error}
              </p>
            )}
            <div className="dm-unlock-actions">
              <button type="button" className="dm-btn dm-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="dm-btn dm-btn-primary" disabled={!code.trim() || busy}>
                {busy ? "Checking…" : "Unlock"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p>
              {lockable
                ? "This browser is using the real game server, model, and voice. Lock it to go back to the scripted demo."
                : "There's no demo lock on this site, so live play is always on. Set DEMO_UNLOCK_CODE on the server to add one."}
            </p>
            <div className="dm-unlock-actions">
              <button type="button" className="dm-btn dm-btn-ghost" onClick={onClose}>
                Close
              </button>
              {lockable && (
                <button type="button" className="dm-btn dm-btn-primary" onClick={relock} disabled={busy}>
                  Lock
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
