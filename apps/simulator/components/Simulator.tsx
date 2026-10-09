"use client";

/**
 * The Alexa+ simulator: conversation, device, and protocol log (R10, R14).
 */

import { REPLAYS, isNewSession } from "@hey-trivi/replays";
import { useCallback, useEffect, useRef, useState } from "react";
import { Host } from "@/lib/host";
import { LoggedMcpClient, newSeq, resultText, type ToolResult } from "@/lib/mcp";
import { listenOnce, speak, speechRecognitionAvailable, stopSpeaking } from "@/lib/speech";
import { Conversation, type Turn } from "./Conversation";
import { Display } from "./Display";
import { ProtocolPanel, type ProtocolRow } from "./ProtocolPanel";
import { Speaker, type RingState } from "./Speaker";

interface Config {
  mcpUrl: string;
  token: string;
  mock: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Simulator() {
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [statusText, setStatusText] = useState("");
  const [ring, setRing] = useState<RingState>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [secrets, setSecrets] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [replayId, setReplayId] = useState(REPLAYS[0]!.id);
  const [replaying, setReplaying] = useState(false);
  const [showTitle, setShowTitle] = useState("Hey Trivi");
  const [canListen, setCanListen] = useState(false);
  /** Mock mode: the next line of the selected script that live input plays. */
  const [cursor, setCursor] = useState(0);

  const mcpRef = useRef<LoggedMcpClient | null>(null);
  const hostRef = useRef<Host | null>(null);
  const listenRef = useRef<{ stop: () => void } | null>(null);
  const cancelReplay = useRef(false);
  const sessionFresh = useRef(true);

  const addTurn = (t: Turn) => setTurns((ts) => [...ts, t]);

  const onToolCall = useCallback((name: string, _args: Record<string, unknown>, result: ToolResult) => {
    const sc = result.structuredContent as { showTitle?: string; scoreboard?: { showTitle?: string } } | undefined;
    const title = sc?.showTitle ?? sc?.scoreboard?.showTitle;
    if (title) setShowTitle(title);
    addTurn({ kind: "tool", name, isError: !!result.isError, summary: resultText(result) });
  }, []);

  const startSession = useCallback(
    async (cfg: Config) => {
      setStatus("connecting");
      const mcp = new LoggedMcpClient(cfg.mcpUrl, cfg.token, (entry) => setRows((r) => [...r, entry]));
      try {
        await mcp.connect();
        mcpRef.current = mcp;
        hostRef.current = new Host(mcp, { onToolCall });
        setStatus("ready");
        setStatusText(new URL(cfg.mcpUrl).host);
      } catch (err) {
        setStatus("error");
        setStatusText(`Can't reach the game server at ${cfg.mcpUrl}: ${(err as Error).message}`);
      }
    },
    [onToolCall],
  );

  useEffect(() => {
    setCanListen(speechRecognitionAvailable());
    fetch("/api/config")
      .then((r) => r.json() as Promise<Config>)
      .then((cfg) => {
        setConfig(cfg);
        return startSession(cfg);
      })
      .catch((err) => {
        setStatus("error");
        setStatusText((err as Error).message);
      });
    return () => {
      void mcpRef.current?.close();
    };
  }, [startSession]);

  /** "New session": forget everything except what the server returns (R10.6). */
  const newSession = useCallback(async () => {
    if (!config) return;
    stopSpeaking();
    listenRef.current?.stop();
    await mcpRef.current?.close();
    mcpRef.current = null;
    hostRef.current = null;
    setTurns([]);
    setSecrets([]);
    setCaption("");
    setInterim("");
    setRing("idle");
    setRows((r) => [...r, { divider: "New session", seq: newSeq() }]);
    await startSession(config);
    sessionFresh.current = true;
  }, [config, startSession]);

  /** One exchange: the user says something, the host answers out loud. */
  const exchange = useCallback(
    async (text: string, opts: { speaker?: string; mockTurn?: Parameters<Host["mockTurn"]>[0] } = {}) => {
      const host = hostRef.current;
      const mcp = mcpRef.current;
      if (!host || !mcp || !config || !text.trim()) return;
      setBusy(true);
      addTurn({ kind: "user", speaker: opts.speaker, text });
      setRing("thinking");
      setCaption("");
      let say: string;
      try {
        say = config.mock ? await host.mockTurn(opts.mockTurn) : await host.turn(text);
      } catch (err) {
        addTurn({ kind: "note", text: (err as Error).message });
        say = "Sorry, I can't think right now. Try again in a moment.";
      }
      sessionFresh.current = false;
      setSecrets([...mcp.secrets]);
      addTurn({ kind: "host", text: say });
      setCaption(say);
      setRing("speaking");
      await speak(say, { usePolly: true });
      setRing("idle");
      setBusy(false);
    },
    [config],
  );

  /**
   * Something the family said or typed. With a real model it goes straight to
   * the host. In mock mode there is no model, so it plays the next line of the
   * selected replay script: read the lines aloud and the host answers as
   * scripted, against the real MCP server.
   */
  const liveInput = useCallback(
    async (text: string) => {
      if (!config?.mock) return exchange(text);
      const script = REPLAYS.find((r) => r.id === replayId)!;
      let i = cursor;
      while (i < script.steps.length && isNewSession(script.steps[i]!)) {
        if (!sessionFresh.current) await newSession();
        i++;
      }
      const step = script.steps[i];
      setCursor(i + 1);
      await exchange(text, { mockTurn: step && !isNewSession(step) ? step.mock : undefined });
    },
    [config, cursor, exchange, newSession, replayId],
  );

  const talk = useCallback(async () => {
    if (ring === "listening") {
      listenRef.current?.stop();
      return;
    }
    if (busy) return;
    stopSpeaking();
    setRing("listening");
    try {
      const l = listenOnce(setInterim);
      listenRef.current = l;
      const heard = await l.done;
      setInterim("");
      setRing("idle");
      if (heard) await liveInput(heard);
    } catch (err) {
      setInterim("");
      setRing("idle");
      addTurn({ kind: "note", text: `Microphone: ${(err as Error).message}. You can type instead.` });
    }
  }, [busy, liveInput, ring]);

  const playReplay = useCallback(async () => {
    const script = REPLAYS.find((r) => r.id === replayId);
    if (!script) return;
    cancelReplay.current = false;
    setReplaying(true);
    await newSession();
    addTurn({ kind: "note", text: `Replay: ${script.title}` });
    for (const step of script.steps) {
      if (cancelReplay.current) break;
      if (isNewSession(step)) {
        await sleep(800);
        await newSession();
        addTurn({ kind: "note", text: "New session (the next day)" });
        continue;
      }
      await exchange(step.user, { speaker: step.speaker, mockTurn: step.mock });
      await sleep(600);
    }
    setReplaying(false);
    setCursor(script.steps.length);
  }, [exchange, newSession, replayId]);

  const submitTyped = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = typed;
    setTyped("");
    await liveInput(t);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden />
          Hey Trivi
        </div>
        <div className="label-badge">Alexa+ simulator. Not an Amazon product.</div>
        <div className="pills">
          <span className={`pill ${config?.mock ? "pill-warn" : ""}`}>{config ? (config.mock ? "Mock model" : "Nova 2 Lite") : "…"}</span>
          <span className={`pill ${status === "error" ? "pill-error" : status === "ready" ? "pill-ok" : ""}`} title={statusText}>
            {status === "ready" ? `MCP: ${statusText}` : status === "connecting" ? "Connecting…" : "Server unreachable"}
          </span>
        </div>
      </header>

      <main className="grid">
        <Conversation turns={turns} secrets={secrets} interim={interim} />

        <section className="device" aria-label="Device">
          <div className="kitchen">
            <Speaker state={ring} />
            <Display title={showTitle} caption={caption} />
          </div>
          {status === "error" && <p className="error-text">{statusText}</p>}

          <div className="controls">
            <button
              className={`talk ${ring === "listening" ? "talk-on" : ""}`}
              onClick={talk}
              disabled={status !== "ready" || (busy && ring !== "listening") || !canListen}
              title={canListen ? "Tap to talk" : "Speech recognition needs Chrome. Type instead."}
            >
              <svg viewBox="0 0 24 24" aria-hidden width="30" height="30">
                <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
              </svg>
              <span>{ring === "listening" ? "Listening…" : "Tap to talk"}</span>
            </button>

            <form className="type-row" onSubmit={submitTyped}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type what the family says…" disabled={status !== "ready" || busy} aria-label="Type a message" />
              <button type="submit" disabled={status !== "ready" || busy || !typed.trim()}>
                Send
              </button>
            </form>

            <div className="button-row">
              <button onClick={newSession} disabled={busy || replaying}>
                New session
              </button>
              <select value={replayId} onChange={(e) => {
                  setReplayId(e.target.value);
                  setCursor(0);
                }} aria-label="Replay script" disabled={replaying}>
                {REPLAYS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              {replaying ? (
                <button
                  onClick={() => {
                    cancelReplay.current = true;
                    stopSpeaking();
                  }}
                >
                  Stop
                </button>
              ) : (
                <button onClick={playReplay} disabled={status !== "ready" || busy}>
                  Play replay
                </button>
              )}
            </div>
            <p className="muted small">{REPLAYS.find((r) => r.id === replayId)?.description}</p>
            {config?.mock && <MockHint script={REPLAYS.find((r) => r.id === replayId)!} cursor={cursor} onRestart={() => setCursor(0)} />}
          </div>
        </section>

        <ProtocolPanel rows={rows} />
      </main>
    </div>
  );
}

/** In mock mode, show the next line to read aloud. */
function MockHint({ script, cursor, onRestart }: { script: (typeof REPLAYS)[number]; cursor: number; onRestart: () => void }) {
  let i = cursor;
  while (i < script.steps.length && isNewSession(script.steps[i]!)) i++;
  const step = script.steps[i];
  const pressNew = i > cursor;
  if (!step || isNewSession(step)) {
    return (
      <p className="mock-hint">
        End of “{script.title}”. <button onClick={onRestart}>Start over</button>
      </p>
    );
  }
  return (
    <p className="mock-hint">
      Mock model: say or type the next line{pressNew ? " (a new session starts first)" : ""}
      <br />
      <strong>
        {step.speaker ? `${step.speaker}: ` : ""}“{step.user}”
      </strong>
    </p>
  );
}
