"use client";

import { useState } from "react";
import { GRADE_BANDS, parentApi, type GradeBand, type ResetSchedule, type Role } from "@/lib/parent";
import type { Run } from "./ParentApp";
import { TimeZoneSelect } from "./ui";

const SIGNIN_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  expired: "That sign-in link expired. Try again.",
  signin: "We couldn't finish signing you in. Try again.",
};

export function SignInScreen({ cognito, error }: { cognito: boolean; error?: string }) {
  return (
    <div className="pp-onboard">
      <div className="pp-card">
        <span className="pp-logo pp-logo-lg" aria-hidden />
        <h2>Your family&apos;s Hey Trivi page</h2>
        <p className="pp-muted pp-lead">See who&apos;s ahead, what everyone answered, and choose when points reset. One account per family.</p>
        {error && SIGNIN_ERRORS[error] && <p className="pp-alert">{SIGNIN_ERRORS[error]}</p>}
        {cognito ? (
          <div className="pp-stack">
            <a className="pp-btn pp-btn-primary" href="/auth/login?screen=signup">
              Create an account
            </a>
            <a className="pp-btn" href="/auth/login">
              Sign in
            </a>
            <p className="pp-hosted">Sign-in is handled by Amazon Cognito. New accounts get a 6-digit code by email.</p>
          </div>
        ) : (
          <div className="pp-stack">
            <a className="pp-btn pp-btn-primary" href="/auth/login?as=demo">
              Sign in as the demo family
            </a>
            <a className="pp-btn" href="/auth/login?as=new">
              Start a new family
            </a>
            <p className="pp-hosted">Local mode: Cognito isn&apos;t set up, so sign-in is simulated. Set COGNITO_DOMAIN and COGNITO_CLIENT_ID to use real accounts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface Draft {
  key: number;
  name: string;
  role: Role;
  gradeBand: GradeBand;
}

export function SetupScreen({ run }: { run: Run }) {
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<Draft[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [grade, setGrade] = useState<GradeBand>("3-5");
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
  const [schedule, setSchedule] = useState<ResetSchedule>("weekly");
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const add = () => {
    const n = name.trim();
    if (!n) return setProblem("Type a first name first.");
    if (members.some((m) => m.name.toLowerCase() === n.toLowerCase())) return setProblem(`${n} is already on the list.`);
    setMembers([...members, { key: Date.now(), name: n, role, gradeBand: grade }]);
    setName("");
    setProblem(null);
    // Most families add a parent, then the kids.
    setRole("kid");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setProblem("Give your show a name.");
    if (!members.length) return setProblem("Add at least one player.");
    setSaving(true);
    const ok = await run(
      () =>
        parentApi("household", {
          body: {
            showTitle: title,
            timeZone,
            resetSchedule: schedule,
            players: members.map((m) => ({ name: m.name, role: m.role, gradeBand: m.role === "kid" ? m.gradeBand : undefined })),
          },
        }),
      "Your family is ready",
    );
    if (!ok) setSaving(false);
  };

  return (
    <div className="pp-onboard">
      <div className="pp-card">
        <h2>Who&apos;s playing?</h2>
        <p className="pp-muted pp-lead">First names only. You can change all of this later.</p>
        <form className="pp-stack" onSubmit={submit}>
          <label className="pp-field">
            Name your show
            <span className="pp-hint">The host says it when a game starts.</span>
            <input id="setup-title" type="text" value={title} maxLength={60} placeholder="Kitchen Table Trivia" onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="pp-field">
            Family members
            {members.length > 0 && (
              <div className="pp-mini-fam">
                {members.map((m) => (
                  <span key={m.key}>
                    {m.name} <small className="pp-muted">{m.role === "kid" ? `grades ${m.gradeBand}` : "parent"}</small>
                    <button type="button" className="pp-x" aria-label={`Remove ${m.name}`} onClick={() => setMembers(members.filter((x) => x.key !== m.key))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="pp-add-row">
              <input
                id="setup-name"
                type="text"
                value={name}
                maxLength={20}
                placeholder="First name, like Mom"
                aria-label="First name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
              />
              <select id="setup-role" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="parent">Parent</option>
                <option value="kid">Kid</option>
              </select>
              <select id="setup-grade" aria-label="Grade band" value={grade} disabled={role !== "kid"} onChange={(e) => setGrade(e.target.value as GradeBand)}>
                {GRADE_BANDS.map((g) => (
                  <option key={g} value={g}>
                    Grades {g}
                  </option>
                ))}
              </select>
              <button type="button" onClick={add}>
                Add
              </button>
            </div>
            <span className="pp-hint">For kids we keep a first name and a grade band. No birthdays, no recordings.</span>
          </div>

          <div className="pp-two">
            <label className="pp-field">
              Reset points
              <select id="setup-schedule" value={schedule} onChange={(e) => setSchedule(e.target.value as ResetSchedule)}>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
                <option value="never">Never</option>
              </select>
            </label>
            <label className="pp-field">
              Time zone
              <TimeZoneSelect id="setup-tz" value={timeZone} onChange={setTimeZone} />
            </label>
          </div>

          {problem && <p className="pp-alert">{problem}</p>}
          <button type="submit" className="pp-btn-primary" disabled={saving}>
            {saving ? "Setting up…" : "Create our family"}
          </button>
        </form>
      </div>
    </div>
  );
}
