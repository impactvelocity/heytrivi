"use client";

import { useState } from "react";
import { GRADE_BANDS, dateLabel, parentApi, playerColor, type Dashboard, type GradeBand, type ParentPlayer, type Role } from "@/lib/parent";
import type { Run } from "./ParentApp";
import { Avatar } from "./ui";

export function periodLabel(d: Dashboard): string {
  const { resetSchedule, nextReset } = d.household;
  if (resetSchedule === "never" || !nextReset) return "Points never reset";
  return `${resetSchedule === "weekly" ? "This week" : "This month"} · resets ${dateLabel(nextReset)}`;
}

export function Overview({ data, run, mcpUrl }: { data: Dashboard; run: Run; mcpUrl: string }) {
  return (
    <div className="pp-grid pp-grid-2">
      <Leaderboard data={data} />
      <div className="pp-grid">
        <Family data={data} run={run} />
        <Connect mcpUrl={mcpUrl} compact />
      </div>
    </div>
  );
}

function Leaderboard({ data }: { data: Dashboard }) {
  const ps = [...data.players].sort((a, b) => b.balance - a.balance || b.lifetime - a.lifetime || a.name.localeCompare(b.name));
  const max = Math.max(1, ...ps.map((p) => p.balance));
  const lead = ps[0] && ps[0].balance > 0 && (ps.length === 1 || ps[1]!.balance < ps[0].balance) ? ps[0].playerId : null;
  const name = (id: string) => data.players.find((p) => p.playerId === id)?.name ?? "Someone";
  return (
    <section className="pp-card" aria-labelledby="lb-h">
      <div className="pp-card-head">
        <h2 id="lb-h">Leaderboard</h2>
        <span className="pp-period">{periodLabel(data)}</span>
      </div>
      {ps.length === 0 ? (
        <p className="pp-muted">Add family members to start keeping score.</p>
      ) : (
        <ol className="pp-lb">
          {ps.map((p, i) => (
            <li key={p.playerId} className={p.playerId === lead ? "pp-lead" : ""}>
              <span className="pp-rank pp-num">{i + 1}</span>
              <Avatar player={p} />
              <div style={{ minWidth: 0 }}>
                <div className="pp-name">
                  {p.name}
                  {p.playerId === lead && <span className="pp-crown">Leading</span>}
                  {p.streak >= 3 && <span className="pp-streak">{p.streak} in a row</span>}
                </div>
                <div className="pp-bar">
                  <span style={{ width: `${(Math.max(0, p.balance) / max) * 100}%`, background: playerColor(p.playerId) }} />
                </div>
              </div>
              <div className="pp-pts pp-num">
                <div className="pp-big">{p.balance}</div>
                <div className="pp-life">{p.lifetime} all-time</div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="pp-foot">
        The big number is what each person can spend
        {data.household.resetSchedule === "never" ? "" : ". It goes back to 0 at each reset"}. All-time never goes down.
      </p>
      {data.openChores.length > 0 && (
        <div className="pp-chores">
          <h3 className="pp-eyebrow">Chores owed</h3>
          <ul>
            {data.openChores.map((c) => (
              <li key={c.choreId}>
                <b>{name(c.owedBy)}</b> · {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Family({ data, run }: { data: Dashboard; run: Run }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState<GradeBand>("3-5");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("kid");
  const [grade, setGrade] = useState<GradeBand>("3-5");
  const [busy, setBusy] = useState(false);

  const act = async (call: () => Promise<Dashboard>, done: string) => {
    setBusy(true);
    const ok = await run(call, done);
    setBusy(false);
    return ok;
  };

  const startEdit = (p: ParentPlayer) => {
    setEditing(p.playerId);
    setRemoving(null);
    setEditName(p.name);
    setEditGrade(p.gradeBand ?? "3-5");
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await act(() => parentApi("players", { body: { name, role, gradeBand: role === "kid" ? grade : undefined } }), `Added ${name.trim()}`)) setName("");
  };

  return (
    <section className="pp-card" aria-labelledby="fam-h">
      <div className="pp-card-head">
        <h2 id="fam-h">Family members</h2>
        <span className="pp-muted pp-small">
          {data.players.length} {data.players.length === 1 ? "player" : "players"}
        </span>
      </div>
      <div className="pp-fam">
        {data.players.map((p) =>
          editing === p.playerId ? (
            <form
              key={p.playerId}
              className="pp-member"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await act(() => parentApi(`players/${p.playerId}`, { body: { name: editName, gradeBand: p.role === "kid" ? editGrade : undefined } }), "Saved")) setEditing(null);
              }}
            >
              <Avatar player={p} />
              <div className="pp-edit-row">
                <input id="edit-name" type="text" value={editName} maxLength={20} aria-label="Name" autoFocus onChange={(e) => setEditName(e.target.value)} />
                {p.role === "kid" && (
                  <select id="edit-grade" aria-label="Grade band" value={editGrade} onChange={(e) => setEditGrade(e.target.value as GradeBand)}>
                    {GRADE_BANDS.map((g) => (
                      <option key={g} value={g}>
                        Grades {g}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pp-row">
                <button type="submit" className="pp-btn-primary" disabled={busy}>
                  Save
                </button>
                <button type="button" className="pp-btn-quiet" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : removing === p.playerId ? (
            <div key={p.playerId} className="pp-member">
              <Avatar player={p} />
              <div>
                <div className="pp-nm">Remove {p.name}?</div>
                <div className="pp-small pp-muted">Their points go too. Past questions stay in the history.</div>
              </div>
              <div className="pp-row">
                <button
                  type="button"
                  className="pp-btn-danger"
                  disabled={busy}
                  onClick={async () => {
                    if (await act(() => parentApi(`players/${p.playerId}`, { method: "DELETE" }), `Removed ${p.name}`)) setRemoving(null);
                  }}
                >
                  Remove
                </button>
                <button type="button" className="pp-btn-quiet" onClick={() => setRemoving(null)}>
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <div key={p.playerId} className="pp-member">
              <Avatar player={p} />
              <div>
                <div className="pp-nm">{p.name}</div>
                <span className={`pp-pill pp-${p.role}`}>{p.role === "parent" ? "Parent" : `Kid · grades ${p.gradeBand ?? "?"}`}</span>
              </div>
              <div className="pp-row">
                <button type="button" className="pp-btn-quiet" aria-label={`Edit ${p.name}`} onClick={() => startEdit(p)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="pp-btn-quiet"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => {
                    setRemoving(p.playerId);
                    setEditing(null);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ),
        )}
      </div>
      <form className="pp-add-row" onSubmit={add}>
        <input id="add-name" type="text" value={name} maxLength={20} placeholder="First name, like Grandma" aria-label="First name" onChange={(e) => setName(e.target.value)} />
        <select id="add-role" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="kid">Kid</option>
          <option value="parent">Parent</option>
        </select>
        <select id="add-grade" aria-label="Grade band" value={grade} disabled={role !== "kid"} onChange={(e) => setGrade(e.target.value as GradeBand)}>
          {GRADE_BANDS.map((g) => (
            <option key={g} value={g}>
              Grades {g}
            </option>
          ))}
        </select>
        <button type="submit" className="pp-btn-primary" disabled={busy || !name.trim()}>
          Add
        </button>
      </form>
      <p className="pp-privacy">For kids we keep a first name and a grade band. No birthdays, no recordings.</p>
    </section>
  );
}

export function Connect({ mcpUrl, compact }: { mcpUrl: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.getElementById("mcp-url");
      if (el) getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <section className="pp-card pp-connect" aria-labelledby="cn-h">
      <div className="pp-card-head">
        <h2 id="cn-h">Your assistant</h2>
      </div>
      <p className="pp-semibold">Every family uses the same server address. Signing in tells it which family you are.</p>
      <div className="pp-url">
        <code id="mcp-url">{mcpUrl}</code>
        <button type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {!compact && (
        <ol className="pp-steps">
          <li>In your assistant, add Hey Trivi as an MCP server with this address.</li>
          <li>When it asks you to sign in, use this Hey Trivi account.</li>
          <li>Say &ldquo;Let&apos;s play Hey Trivi.&rdquo; Your family and scores are already there.</li>
        </ol>
      )}
      <div className="pp-linked">
        <span className="pp-semibold">
          <span className="pp-dot" />
          The simulator plays as your family while you&apos;re signed in here.
        </span>
        <a className="pp-btn pp-btn-quiet" href="/">
          Try it
        </a>
      </div>
    </section>
  );
}
