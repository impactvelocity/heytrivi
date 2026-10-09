"use client";

import { useState } from "react";
import { dateLabel, parentApi, type Dashboard, type PhraseScope, type ResetSchedule } from "@/lib/parent";
import type { Run } from "./ParentApp";
import { Connect } from "./Overview";
import { TimeZoneSelect } from "./ui";

const SCHEDULES: Array<[ResetSchedule, string, string]> = [
  ["never", "Never", "Points keep adding up"],
  ["weekly", "Weekly", "Every Monday"],
  ["monthly", "Monthly", "On the 1st"],
];

export function Settings({ data, run, mcpUrl }: { data: Dashboard; run: Run; mcpUrl: string }) {
  const h = data.household;
  const [confirmReset, setConfirmReset] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [scope, setScope] = useState<PhraseScope>(h.phraseRequiredFor);
  const [confirmOff, setConfirmOff] = useState(false);
  const [title, setTitle] = useState(h.showTitle);
  const [busy, setBusy] = useState(false);

  const act = async (call: () => Promise<Dashboard>, done: string) => {
    setBusy(true);
    const ok = await run(call, done);
    setBusy(false);
    return ok;
  };

  const note =
    h.resetSchedule === "never" || !h.nextReset
      ? "Balances never reset. Use “Reset balances now” when you want a fresh start."
      : `Next reset ${dateLabel(h.nextReset)} at midnight. The host announces who led ${h.resetSchedule === "weekly" ? "the week" : "the month"} at the next game.`;

  return (
    <div className="pp-grid pp-grid-2">
      <section className="pp-card" aria-labelledby="rs-h">
        <div className="pp-card-head">
          <h2 id="rs-h">Point reset</h2>
        </div>
        <p className="pp-muted pp-semibold" style={{ marginBottom: 14 }}>
          When balances go back to zero. All-time totals, owed chores, and packs stay put.
        </p>
        <div className="pp-seg" role="radiogroup" aria-label="Point reset">
          {SCHEDULES.map(([k, label, sub]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={h.resetSchedule === k}
              disabled={busy}
              onClick={() => h.resetSchedule !== k && act(() => parentApi("settings", { body: { resetSchedule: k } }), `Point reset: ${label.toLowerCase()}`)}
            >
              <b>{label}</b>
              <span>{sub}</span>
            </button>
          ))}
        </div>
        <p className="pp-note">{note}</p>
        <div className="pp-stack" style={{ marginTop: 16 }}>
          <label className="pp-field">
            Time zone
            <span className="pp-hint">Resets happen at midnight here, and history uses this time.</span>
            <TimeZoneSelect id="tz" value={h.timeZone} onChange={(tz) => act(() => parentApi("settings", { body: { timeZone: tz } }), "Time zone saved")} />
          </label>
          <div>
            <button type="button" className="pp-btn-danger" onClick={() => setConfirmReset(true)}>
              Reset balances now
            </button>
            {confirmReset && (
              <div className="pp-confirm">
                Set everyone&apos;s balance to 0 now? All-time totals stay.
                <div className="pp-row">
                  <button
                    type="button"
                    className="pp-btn-primary"
                    disabled={busy}
                    onClick={async () => {
                      if (await act(() => parentApi("reset", { body: {} }), "Balances reset to 0")) setConfirmReset(false);
                    }}
                  >
                    Yes, reset now
                  </button>
                  <button type="button" className="pp-btn-quiet" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="pp-grid">
        <section className="pp-card" aria-labelledby="ph-h">
          <div className="pp-card-head">
            <h2 id="ph-h">Parent phrase</h2>
            <span className={`pp-pill ${h.phraseSet ? "pp-kid" : ""}`}>{h.phraseSet ? "On" : "Off"}</span>
          </div>
          <p className="pp-muted pp-semibold" style={{ marginBottom: 14 }}>
            A phrase a parent says out loud before points are spent. Kids might overhear it, so change it now and then. We keep only a scrambled copy.
          </p>
          <form
            className="pp-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!phrase.trim() && !h.phraseSet) return run(() => Promise.reject(new Error("Type a phrase first.")));
              if (await act(() => parentApi("phrase", { body: { phrase: phrase || undefined, requiredFor: scope } }), phrase ? "Phrase saved" : "Saved")) setPhrase("");
            }}
          >
            <label className="pp-field">
              {h.phraseSet ? "New phrase" : "Phrase"}
              <span className="pp-hint">At least two words, like &ldquo;purple pancakes&rdquo;.</span>
              <input id="phrase" type="password" value={phrase} autoComplete="new-password" placeholder={h.phraseSet ? "Leave blank to keep the current one" : "Something easy to say"} onChange={(e) => setPhrase(e.target.value)} />
            </label>
            <div className="pp-radio-row" role="radiogroup" aria-label="Phrase needed for">
              <label>
                <input type="radio" name="scope" value="spend" checked={scope === "spend"} onChange={() => setScope("spend")} /> Spending only
              </label>
              <label>
                <input type="radio" name="scope" value="spend_and_trade" checked={scope === "spend_and_trade"} onChange={() => setScope("spend_and_trade")} /> Spending and trading
              </label>
            </div>
            <div className="pp-row">
              <button type="submit" className="pp-btn-primary" disabled={busy}>
                {h.phraseSet ? (phrase ? "Change phrase" : "Save") : "Turn on"}
              </button>
              {h.phraseSet && !confirmOff && (
                <button type="button" className="pp-btn-quiet" onClick={() => setConfirmOff(true)}>
                  Turn off
                </button>
              )}
            </div>
            {confirmOff && (
              <div className="pp-confirm">
                Turn off the phrase? Anyone could then spend points by voice.
                <div className="pp-row">
                  <button
                    type="button"
                    className="pp-btn-danger"
                    disabled={busy}
                    onClick={async () => {
                      if (await act(() => parentApi("phrase", { method: "DELETE" }), "Parent phrase turned off")) setConfirmOff(false);
                    }}
                  >
                    Turn off
                  </button>
                  <button type="button" className="pp-btn-quiet" onClick={() => setConfirmOff(false)}>
                    Keep it on
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>

        <section className="pp-card" aria-labelledby="sh-h">
          <div className="pp-card-head">
            <h2 id="sh-h">Show name</h2>
          </div>
          <form
            className="pp-row"
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => parentApi("settings", { body: { showTitle: title } }), "Show name saved");
            }}
          >
            <input id="title" type="text" value={title} maxLength={60} aria-label="Show name" style={{ flex: "1 1 200px" }} onChange={(e) => setTitle(e.target.value)} />
            <button type="submit" disabled={busy || title.trim() === h.showTitle}>
              Save
            </button>
          </form>
          <p className="pp-small pp-muted" style={{ marginTop: 8 }}>
            The host says this at the start of each game.
          </p>
        </section>

        <Connect mcpUrl={mcpUrl} />
      </div>
    </div>
  );
}
