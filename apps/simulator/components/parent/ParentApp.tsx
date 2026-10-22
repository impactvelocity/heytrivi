"use client";

/**
 * The parent page (R11, R13): sign in, set up the family, then the dashboard
 * with the leaderboard, family members, themes, points history,
 * question history, and settings. Data comes from the MCP server's /parent API through this app's
 * /api/parent proxy, so it is the same household the game plays.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "@/components/demo/icons";
import { SignedOut, parentApi, type Dashboard } from "@/lib/parent";
import { PointsHistory, QuestionHistory } from "./History";
import { SetupScreen, SignInScreen } from "./Onboarding";
import { Overview } from "./Overview";
import { PacksTab } from "./Packs";
import { Settings } from "./Settings";
import { setFamily } from "./ui";

export type Run = (call: () => Promise<Dashboard>, done?: string) => Promise<boolean>;

const TABS = [
  ["overview", "Family & leaderboard"],
  ["packs", "Themes"],
  ["points", "Points history"],
  ["questions", "Question history"],
  ["settings", "Settings"],
] as const;
type Tab = (typeof TABS)[number][0];

interface Props {
  signedIn: boolean;
  cognito: boolean;
  error?: string;
}

export function ParentApp({ signedIn, cognito, error }: Props) {
  const [phase, setPhase] = useState<"signin" | "loading" | "setup" | "dashboard" | "down">(signedIn ? "loading" : "signin");
  const [data, setData] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const run: Run = useCallback(
    async (call, done) => {
      try {
        const d = await call();
        setData(d);
        setPhase("dashboard");
        // The DEMO=1 demo family keeps nothing, so the message says so.
        if (done) say(d.household.readOnly ? `${done} (demo, not saved)` : done);
        return true;
      } catch (err) {
        if (err instanceof SignedOut) setPhase("signin");
        else say((err as Error).message);
        return false;
      }
    },
    [say],
  );

  const load = useCallback(async () => {
    try {
      const d = await parentApi<Dashboard | { household: null }>("me");
      if (d.household === null) setPhase("setup");
      else {
        setData(d as Dashboard);
        setPhase("dashboard");
      }
    } catch (err) {
      setPhase(err instanceof SignedOut ? "signin" : "down");
    }
  }, []);

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  // #points, #questions, #settings open that tab.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some(([k]) => k === h)) setTab(h as Tab);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  if (data) setFamily(data.players);

  const pickTab = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  return (
    <div className="pp">
      <div className="pp-wrap">
        {phase === "signin" && <SignInScreen cognito={cognito} error={error} />}
        {phase === "loading" && <p className="pp-loading">Loading your family…</p>}
        {phase === "down" && (
          <div className="pp-onboard">
            <div className="pp-card">
              <h2>Can&apos;t reach the game server</h2>
              <p className="pp-muted">Check that the MCP server is running, then try again.</p>
              <div className="pp-row" style={{ marginTop: 16 }}>
                <button type="button" className="pp-btn-primary" onClick={() => void load()}>
                  Try again
                </button>
                <SignOutButton />
              </div>
            </div>
          </div>
        )}
        {phase === "setup" && <SetupScreen run={run} />}
        {phase === "dashboard" && data && (
          <>
            <header className="pp-top">
              <div className="pp-title">
                <a className="pp-btn pp-home" href="/" aria-label="Back to Hey Trivi" title="Back to Hey Trivi">
                  <ChevronRight width={20} height={20} />
                </a>
                <h1>{data.household.showTitle}</h1>
              </div>
              <a className="pp-btn pp-btn-quiet" href="/demo">
                Open the game show
              </a>
            </header>
            <nav className="pp-tabs" role="tablist" aria-label="Sections">
              {TABS.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => pickTab(k)}>
                  {label}
                </button>
              ))}
            </nav>
            {tab === "overview" && <Overview data={data} run={run} />}
            {tab === "packs" && <PacksTab data={data} run={run} />}
            {tab === "points" && <PointsHistory data={data} />}
            {tab === "questions" && <QuestionHistory data={data} />}
            {tab === "settings" && <Settings data={data} run={run} />}
            {data.household.demo && (
              <footer className="pp-demo-note">
                <b>Demo</b>
                <span>
                  {data.household.readOnly
                    ? "This is a demo of the parent page, so changes here aren't saved. In the real app, everything here is also controlled through the Hey Trivi MCP server: a change made by voice shows up here, and a change here reaches the game."
                    : "This is a demo of the parent page. Everything here is also controlled through the Hey Trivi MCP server, so a change made by voice shows up here, and a change here reaches the game. The demo family goes back to how it started after ten quiet minutes."}
                </span>
              </footer>
            )}
          </>
        )}
      </div>
      {toast && (
        <div className="pp-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function SignOutButton() {
  return (
    <form method="post" action="/auth/logout">
      <button type="submit" className="pp-btn-quiet">
        Sign out
      </button>
    </form>
  );
}
