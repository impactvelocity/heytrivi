"use client";

/**
 * The game-show stage: Trivi's voice in a ring of marquee lights, the family
 * picker and leaderboard beside it, and a settings drawer.
 *
 * Live when the game server and model are reachable (useLiveGame): the mic
 * listens, the host model plays through the MCP server, Polly answers, and
 * the leaderboard and round chips come from tool results. The MCP button in
 * the header opens every protocol message. Otherwise (server down, or
 * MOCK_MODEL=1) the families and rounds come from lib/demo-data.ts and the
 * mic plays a scripted round. Trivi is Glow (components/avatars/Glow.tsx):
 * it follows the voice state, hops when someone scores, and takes its body
 * color from the stage theme. Keys 1 to 4 hold a
 * voice state (idle, listening, thinking, speaking) and 5 to 8 hold Glow's
 * game moments (right, wrong, winner, asleep) for design review.
 * `skin` picks the look: Duo (duo.css on top of demo.css), or the original
 * dark game show (demo.css alone).
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Glow, type GlowColor, type Mood } from "@/components/avatars/Glow";
import { ProtocolPanel } from "@/components/ProtocolPanel";
import { FAMILIES, ROUNDS, THEMES, type DemoMember, type Skin, type ThemeId } from "@/lib/demo-data";
import type { StageSettings } from "@/lib/parent";
import { Avatar, familyColors } from "./Avatar";
import { FamilyPicker } from "./FamilyPicker";
import { ChevronRight, Mic, Send, Sliders, Stop } from "./icons";
import { Leaderboard } from "./Leaderboard";
import { MarqueeLights, type LightsMode } from "./MarqueeLights";
import { SettingsDrawer } from "./SettingsDrawer";
import { StageBackdrop, type BackdropId } from "./StageBackdrop";
import { UnlockDialog } from "./UnlockDialog";
import { useLiveGame } from "./useLiveGame";
import type { VoiceState } from "./VoiceOrb";

const LIGHTS: Record<VoiceState, LightsMode> = { idle: "chase", listening: "glow", thinking: "fast", speaking: "celebrate" };
const STATE_KEYS: Record<string, VoiceState> = { "1": "idle", "2": "listening", "3": "thinking", "4": "speaking" };
const MOOD_KEYS: Record<string, Mood> = { "5": "correct", "6": "wrong", "7": "celebrating", "8": "sleeping" };
const MOOD_LABELS: Record<Mood, string> = {
  idle: "Trivi is waiting",
  listening: "Trivi is listening",
  thinking: "Trivi is thinking",
  speaking: "Trivi is talking",
  correct: "Trivi is cheering",
  wrong: "Trivi says oops",
  celebrating: "Trivi is celebrating",
  sleeping: "Trivi is asleep",
};
/** Trivi's body color for each stage theme. */
const THEME_GLOW: Record<ThemeId, GlowColor> = { showtime: "grape", arcade: "ocean", sunset: "sunny", pajama: "berry" };
/** The stage backdrop. The others in StageBackdrop.tsx are kept for later. */
const BACKDROP: BackdropId = "quiz";
/** How long Glow hops when points land before going back to talking. */
const CHEER_MS = 1800;

export function DemoApp({ className = "", skin = "duo" }: { className?: string; skin?: Skin }) {
  const [families, setFamilies] = useState(FAMILIES);
  const [familyId, setFamilyId] = useState(FAMILIES[0]!.id);
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [roundNo, setRoundNo] = useState(0);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [bonus, setBonus] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<{ id: string; points: number } | null>(null);
  const [typed, setTyped] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("showtime");
  const [lightsOn, setLightsOn] = useState(true);
  const [celebrate, setCelebrate] = useState(true);
  const [readTwice, setReadTwice] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [cheer, setCheer] = useState(false);
  const [held, setHeld] = useState<Mood | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const logoTaps = useRef<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const game = useLiveGame({ setVoice, setHeard, setReply, setFlash });
  const live = game.live && !!game.family;
  const settings = live ? game.settings : null;

  // The show settings are the family's, saved with it: load them once they arrive.
  const savedStage = game.settings?.dashboard.household.stage;
  useEffect(() => {
    if (!savedStage) return;
    if (THEMES.some((t) => t.id === savedStage.theme)) setTheme(savedStage.theme as ThemeId);
    setLightsOn(savedStage.lights);
    setCelebrate(savedStage.celebrate);
    setReadTwice(savedStage.readTwice);
  }, [savedStage?.theme, savedStage?.lights, savedStage?.celebrate, savedStage?.readTwice]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Change a show setting now, and save it for the family when live. */
  const stageSetter =
    <K extends keyof StageSettings>(key: K, set: (v: StageSettings[K]) => void) =>
    (v: StageSettings[K]) => {
      set(v);
      void settings?.setStage({ [key]: v }).catch(() => {});
    };

  const family = live ? game.family! : (families.find((f) => f.id === familyId) ?? families[0]!);
  const round = ROUNDS[roundNo % ROUNDS.length]!;
  const answerer = family.members[round.answerer % family.members.length] ?? family.members[0];

  /** The round chips, from the server when live, else from the script. */
  const chips = live
    ? {
        label: game.stage ? `Round ${game.stage.round}` : "Ready to play",
        progress: undefined,
        pack: game.stage?.pack,
        packColor: game.stage?.packColor,
        stake: game.stage?.stake,
        question: game.stage?.question,
      }
    : { label: `Round ${round.round} of 5`, progress: round.round / 5, pack: round.pack, packColor: round.packColor, stake: round.stake, question: round.question };

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = (ms: number, fn: () => void) => void timers.current.push(setTimeout(fn, ms));
  useEffect(() => clearTimers, [clearTimers]);

  // Glow hops for a moment whenever points land.
  useEffect(() => {
    if (!flash) return;
    setCheer(true);
    const t = setTimeout(() => setCheer(false), CHEER_MS);
    return () => clearTimeout(t);
  }, [flash]);
  const mood: Mood = held ?? (cheer ? "correct" : voice);

  const reset = () => {
    clearTimers();
    setHeld(null);
    setVoice("idle");
    setHeard("");
    setReply("");
    setFlash(null);
  };

  /** What Trivi says when the answer is right, plus a note if the lead changed. */
  const replyFor = (m: DemoMember) => {
    const week = (x: DemoMember) => x.week + (bonus[x.id] ?? 0);
    const before = week(m);
    const after = before + round.points;
    const others = family.members.filter((x) => x.id !== m.id).map(week);
    const ledBefore = others.every((s) => s < before);
    const leadsAfter = others.every((s) => s < after);
    const lead = leadsAfter ? (ledBefore ? ` ${m.name} is still on top!` : ` ${m.name} takes the lead!`) : "";
    return round.reply.replace("{name}", m.name) + lead;
  };

  /** One scripted exchange: someone answers, Trivi checks it, points land. */
  const playRound = (answer = round.heard) => {
    if (!answerer) return;
    reset();
    setVoice("listening");
    const words = answer.split(/\s+/);
    words.forEach((_, i) => later(500 + i * 260, () => setHeard(words.slice(0, i + 1).join(" "))));
    const t = 500 + words.length * 260 + 700;
    later(t, () => setVoice("thinking"));
    later(t + 1500, () => {
      setReply(replyFor(answerer));
      setVoice("speaking");
      setBonus((b) => ({ ...b, [answerer.id]: (b[answerer.id] ?? 0) + round.points }));
      setFlash({ id: answerer.id, points: round.points });
    });
    later(t + 6200, () => {
      reset();
      setRoundNo((n) => n + 1);
    });
  };

  const onMic = () => {
    if (live) return void game.talk();
    if (voice === "idle") playRound();
    else reset();
  };

  const onType = (e: FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    if (live) void game.send(typed.trim());
    else playRound(typed.trim());
    setTyped("");
  };

  const pickFamily = (id: string) => {
    reset();
    setFamilyId(id);
    setBonus({});
    setRoundNo(0);
  };

  const updateMembers = (fn: (ms: DemoMember[]) => DemoMember[]) =>
    setFamilies((fs) => fs.map((f) => (f.id === family.id ? { ...f, members: fn(f.members) } : f)));

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Hold a voice state or one of Glow's moments for design review.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (drawerOpen || e.metaKey || e.ctrlKey || el.closest("input, textarea, select")) return;
      const moment = MOOD_KEYS[e.key];
      if (moment) {
        clearTimers();
        setFlash(null);
        setHeld(moment);
        return;
      }
      const state = STATE_KEYS[e.key];
      if (!state) return;
      clearTimers();
      setFlash(null);
      setHeld(null);
      setVoice(state);
      setHeard(state === "listening" || state === "thinking" ? round.heard : "");
      setReply(state === "speaking" ? round.reply.replace("{name}", answerer?.name ?? "you") : "");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, clearTimers, round, answerer?.name]);

  // The hidden way into live play: five quick clicks on the logo, or ?unlock.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("unlock")) setUnlockOpen(true);
  }, []);
  const onLogo = () => {
    const now = Date.now();
    logoTaps.current = [...logoTaps.current.filter((t) => now - t < 2000), now];
    if (logoTaps.current.length >= 5) {
      logoTaps.current = [];
      setUnlockOpen(true);
    }
  };

  // The page behind the drawer shouldn't scroll.
  useEffect(() => {
    document.documentElement.style.overflow = drawerOpen ? "hidden" : "";
  }, [drawerOpen]);

  const caption = reply || chips.question || "Say “Hey Trivi, let's play” to start a game.";
  // Celebrating is a setting: on, the lights celebrate while points land; off, they never do.
  const lightsMode: LightsMode = !lightsOn
    ? "off"
    : flash && celebrate
      ? "celebrate"
      : LIGHTS[voice] === "celebrate" && !celebrate
        ? "chase"
        : LIGHTS[voice];
  const idleHint = !live ? "Tap the mic and answer out loud" : game.canListen ? "Tap the mic and talk to Trivi" : "Voice needs Chrome. Type below instead.";
  const mcpLabel =
    game.status === "connecting"
      ? "Connecting…"
      : game.status === "demo"
        ? "Demo mode"
        : game.status === "error"
          ? "Server unreachable · scripted"
          : game.config?.mock
            ? "Mock model · scripted"
            : `MCP · ${game.rows.length}`;

  return (
    <div className={`dm ${className}`} data-skin={skin} data-theme={theme}>
      <div className="dm-page" inert={drawerOpen}>
        <header className="dm-header">
          <div className="dm-header-stage">
            <div className="dm-logo" onClick={onLogo}>
              <span>
                Hey<b>Trivi</b>
              </span>
            </div>
            <p className="dm-event">Alexa+ Hackathon Demo</p>
          </div>
          <div className="dm-header-end">
            <p className="dm-disclaimer">Alexa+ simulator. Not an Amazon product.</p>
            <button
              type="button"
              className="dm-mcp-pill"
              data-status={live ? "live" : game.status}
              aria-expanded={mcpOpen}
              aria-controls="dm-protocol"
              title={game.status === "error" ? game.statusText : `Game server: ${game.statusText}`}
              onClick={() => setMcpOpen((o) => !o)}
            >
              <span className="dm-mcp-dot" aria-hidden />
              {mcpLabel}
            </button>
          </div>
        </header>

        <main className="dm-main">
          <section className="dm-frame" aria-label="Game stage">
            <MarqueeLights mode={lightsMode} />
            <div className="dm-stage">
              <div className="dm-stage-bg" aria-hidden>
                <span className="dm-rays" />
                <span className="dm-floor" />
                <StageBackdrop kind={BACKDROP} />
              </div>

              {/* Round, pack, and stake chips, hidden for now. To bring them back,
                  uncomment this and add Trophy back to the icons import.
              <div className="dm-stage-top">
                <div className="dm-chips">
                  <span className="dm-chip">
                    {chips.label}
                    {chips.progress !== undefined && (
                      <span className="dm-progress" aria-hidden>
                        <span style={{ width: `${chips.progress * 100}%` }} />
                      </span>
                    )}
                  </span>
                  {chips.pack && (
                    <span className="dm-chip">
                      <span className="dm-chip-dot" style={{ background: chips.packColor, color: chips.packColor }} />
                      {chips.pack}
                    </span>
                  )}
                </div>
                {chips.stake && (
                  <span className="dm-chip dm-chip-stake">
                    <Trophy width={16} height={16} />
                    <span className="dm-chip-label">At stake:</span> {chips.stake}
                  </span>
                )}
              </div>
              */}

              <div className="dm-stage-center">
                <div className="dm-glow" role="img" aria-label={MOOD_LABELS[mood]}>
                  <Glow mood={mood} color={THEME_GLOW[theme]} />
                </div>
                <p className={`dm-status${heard ? " dm-status-heard" : ""}`} aria-live="polite">
                  {heard ? (
                    live || !answerer ? (
                      <>“{heard}”</>
                    ) : (
                      <>
                        <Avatar
                          look={answerer.look}
                          size={28}
                          shape={family.members.indexOf(answerer)}
                          color={familyColors(family.members).get(answerer.id)}
                        />
                        <b>{answerer.name}</b>“{heard}”
                      </>
                    )
                  ) : voice === "listening" ? (
                    "Listening…"
                  ) : voice === "idle" ? (
                    idleHint
                  ) : null}
                </p>
              </div>

              <div className="dm-caption">
                <span className="dm-caption-label">
                  <span className="dm-mark dm-mark-xs" aria-hidden />
                  {reply || !chips.question ? "Trivi" : "Trivi asks"}
                </span>
                <p key={caption} className="dm-caption-text">
                  {caption}
                </p>
              </div>

              <div className="dm-dock">
                <button
                  type="button"
                  className="dm-mic"
                  data-active={voice !== "idle"}
                  onClick={onMic}
                  aria-label={voice === "idle" ? "Tap to talk" : "Stop"}
                  disabled={game.status === "connecting" || (live && !game.canListen && voice === "idle")}
                >
                  {voice === "idle" ? <Mic width={26} height={26} /> : <Stop width={24} height={24} />}
                </button>
                <form className="dm-type" onSubmit={onType}>
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={live ? "Or type what the family says…" : "Or type an answer…"}
                    aria-label="Type a message"
                    disabled={game.status === "connecting" || (live && game.busy)}
                  />
                  <button type="submit" className="dm-send" aria-label="Send" disabled={!typed.trim() || (live && game.busy)}>
                    <Send />
                  </button>
                </form>
              </div>
            </div>
          </section>

          <aside className="dm-side" aria-label="Family">
            <FamilyPicker families={live ? [family] : families} current={family} onPick={live ? () => {} : pickFamily} />
            <Leaderboard family={family} bonus={live ? {} : bonus} flash={flash} />
            <button type="button" className="dm-card dm-settings" onClick={() => setDrawerOpen(true)}>
              <span className="dm-settings-icon">
                <Sliders width={18} height={18} />
              </span>
              <span className="dm-settings-text">
                <strong>Settings</strong>
              </span>
              <ChevronRight className="dm-settings-chev" />
            </button>
          </aside>
        </main>

        {unlockOpen && <UnlockDialog locked={game.status === "demo"} lockable={!!game.config?.lockable} onClose={() => setUnlockOpen(false)} />}

        {mcpOpen && (
          <div id="dm-protocol" className="dm-protocol">
            <button type="button" className="dm-protocol-close" aria-label="Close MCP messages" onClick={() => setMcpOpen(false)}>
              ×
            </button>
            <ProtocolPanel rows={game.rows} />
          </div>
        )}
      </div>

      <SettingsDrawer
        skin={skin}
        open={drawerOpen}
        onClose={closeDrawer}
        family={family}
        // Live, the drawer changes players through `live` instead.
        onAddMember={(m) => updateMembers((ms) => [...ms, m])}
        onRemoveMember={(id) => updateMembers((ms) => ms.filter((m) => m.id !== id))}
        theme={theme}
        onTheme={stageSetter("theme", setTheme as (v: string) => void)}
        lightsOn={lightsOn}
        onLights={stageSetter("lights", setLightsOn)}
        celebrate={celebrate}
        onCelebrate={stageSetter("celebrate", setCelebrate)}
        readTwice={readTwice}
        onReadTwice={stageSetter("readTwice", setReadTwice)}
        live={settings}
        liveNote={game.live ? game.settingsNote : ""}
      />
    </div>
  );
}
