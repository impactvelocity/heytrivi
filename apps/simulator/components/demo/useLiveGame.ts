"use client";

/**
 * The real loop behind the /demo stage: the browser's MCP client talks to the
 * game server, the host model (/api/model) decides what to do, Polly speaks.
 *
 *   mic → speech recognition → Host.turn (Nova ⇄ MCP tools) → Polly → speakers
 *
 * The stage's voice state, transcript, reply, and points flash stay in
 * DemoApp; this hook drives them through `ui`. The leaderboard and the round
 * chips come from tool results: get_household, show_scoreboard, and
 * record_round carry the players, start_round the question, pack, and stake.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProtocolRow } from "@/components/ProtocolPanel";
import { measureMic, stopLevels } from "@/lib/audio-levels";
import { lookFor, saveLook, savedLooks, SWATCHES, type DemoFamily, type DemoMember, type Look } from "@/lib/demo-data";
import { Host } from "@/lib/host";
import { maskText } from "@/lib/mask";
import { LoggedMcpClient, type ToolResult } from "@/lib/mcp";
import { SignedOut, parentApi, type Dashboard, type Draft, type StageSettings } from "@/lib/parent";
import { listenOnce, speak, speechRecognitionAvailable, stopSpeaking } from "@/lib/speech";
import type { VoiceState } from "./VoiceOrb";

interface Config {
  mcpUrl: string;
  token: string;
  account: "family" | "demo";
  mock: boolean;
  /** Live play is locked here (lib/live-access.ts): play the scripted demo. */
  locked: boolean;
  /** The site has a demo lock, so this browser can unlock or lock it. */
  lockable: boolean;
}

interface Player {
  name: string;
  role: "parent" | "kid";
  balance: number;
  lifetime: number;
  streak?: number;
}

interface Chore {
  label: string;
  owedBy: string;
}

/** The round chips: what's being played right now. */
export interface LiveStage {
  round: number;
  pack?: string;
  packColor?: string;
  stake?: string;
  question?: string;
}

export interface LiveUi {
  setVoice: (v: VoiceState) => void;
  setHeard: (t: string) => void;
  setReply: (t: string) => void;
  setFlash: (f: { id: string; points: number } | null) => void;
}

/** Who a name is: the player id once the parent API has said, and their portrait. */
type Resolve = (name: string) => { id: string; look: Look };

function toFamily(title: string, players: Player[], chores: Chore[], who: Resolve): DemoFamily {
  return {
    id: "live",
    name: title,
    members: players.map((p): DemoMember => {
      const { id, look } = who(p.name);
      return {
        id,
        name: p.name,
        role: p.role === "parent" ? "grown-up" : "kid",
        week: p.balance,
        allTime: p.lifetime,
        streak: p.streak || undefined,
        owes: chores.find((c) => c.owedBy === p.name)?.label,
        look,
      };
    }),
  };
}

/** The drawer's view of the family's settings, and the changes it can make. */
export interface LiveSettings {
  dashboard: Dashboard;
  rename: (title: string) => Promise<void>;
  addPlayer: (name: string, role: DemoMember["role"], look: Look) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  setPackPlaying: (packId: string, playing: boolean) => Promise<void>;
  addQuestion: (packId: string, question: string, answer: string) => Promise<void>;
  setStage: (s: Partial<StageSettings>) => Promise<void>;
  /** Ask Trivi: the chat so far in, the reply and any pack draft out. */
  ask: (messages: Array<{ role: "user" | "assistant"; content: string }>) => Promise<{ reply: string; draft: Draft | null; changes: string[] }>;
  /** Save a reviewed draft. Questions the fact-check flagged are left out. Returns what happened. */
  savePack: (draft: Draft) => Promise<string>;
}

function packLabel(sc: { packTitle?: string; mode?: string }): string {
  if (sc.packTitle) return sc.packTitle;
  return sc.mode === "riddle" ? "Riddles" : sc.mode === "family" ? "Your question" : "Trivia";
}

export function useLiveGame(ui: LiveUi) {
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "error" | "demo">("connecting");
  const [statusText, setStatusText] = useState("");
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [family, setFamily] = useState<DemoFamily | null>(null);
  const [stage, setStage] = useState<LiveStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  /** Why settings can't be changed, when they can't (signed out on a deployed site). */
  const [settingsNote, setSettingsNote] = useState("");

  const mcpRef = useRef<LoggedMcpClient | null>(null);
  const hostRef = useRef<Host | null>(null);
  const listenRef = useRef<{ stop: () => void } | null>(null);
  const listening = useRef(false);
  const packColors = useRef(new Map<string, string>());
  const dashRef = useRef<Dashboard | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const who = useCallback<Resolve>((name) => {
    const p = dashRef.current?.players.find((x) => x.name.toLowerCase() === name.toLowerCase());
    const id = p?.playerId ?? name.toLowerCase();
    return { id, look: (p && savedLooks()[p.playerId]) || lookFor(name) };
  }, []);

  /** Take a dashboard from the parent API: settings, and the leaderboard with it. */
  const applyDashboard = useCallback(
    (d: Dashboard) => {
      dashRef.current = d;
      setDashboard(d);
      const name = (id: string) => d.players.find((p) => p.playerId === id)?.name ?? id;
      const chores = d.openChores.map((c) => ({ label: c.label, owedBy: name(c.owedBy) }));
      setFamily(toFamily(d.household.showTitle, d.players, chores, who));
      d.packs.forEach((p, i) => packColors.current.set(p.title, SWATCHES[i % SWATCHES.length]!));
    },
    [who],
  );

  /** Keep the stage in step with whatever the server just said. */
  const onToolCall = useCallback((name: string, _args: Record<string, unknown>, result: ToolResult) => {
    if (result.isError) return;
    const sc = (result.structuredContent ?? {}) as {
      showTitle?: string;
      players?: Player[];
      openChores?: Chore[];
      packs?: Array<{ title: string }>;
      scoreboard?: { showTitle: string; players: Player[]; openChores: Chore[] };
      results?: Array<{ player: string; points: number }>;
      packTitle?: string;
      mode?: string;
      question?: string;
      stake?: { type: string; label?: string };
    };

    sc.packs?.forEach((p, i) => {
      if (!packColors.current.has(p.title)) packColors.current.set(p.title, SWATCHES[i % SWATCHES.length]!);
    });

    // start_round's `players` are just names; only these tools return player records.
    const board = sc.scoreboard ?? (name === "get_household" && sc.players ? { showTitle: sc.showTitle ?? "Hey Trivi", players: sc.players, openChores: sc.openChores ?? [] } : null);
    if (board) setFamily(toFamily(board.showTitle, board.players, board.openChores, who));
    // add_player returns the players without the title or chores.
    else if (name === "add_player" && sc.players) setFamily((f) => toFamily(f?.name ?? "Your family", sc.players!, [], who));
    // The voice added or changed someone: refresh the drawer's view too.
    if (name === "add_player" || name === "record_round") void parentApi("me").then(applyDashboard, () => {});

    if (name === "start_round") {
      const pack = packLabel(sc);
      setStage((s) => ({
        round: (s?.round ?? 0) + 1,
        pack,
        packColor: packColors.current.get(pack) ?? SWATCHES[2],
        stake: sc.stake && sc.stake.type !== "none" ? (sc.stake.label ?? sc.stake.type) : undefined,
        question: sc.question,
      }));
    }

    if (name === "record_round") {
      const top = [...(sc.results ?? [])].sort((a, b) => b.points - a.points)[0];
      if (top && top.points > 0) {
        uiRef.current.setFlash({ id: who(top.player).id, points: top.points });
        // The lights celebrate while the flash shows (DemoApp), so end it.
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => uiRef.current.setFlash(null), 3500);
      }
    }
  }, [who, applyDashboard]);

  useEffect(() => {
    setCanListen(speechRecognitionAvailable());
    let closed = false;
    fetch("/api/config")
      .then((r) => r.json() as Promise<Config>)
      .then(async (cfg) => {
        setConfig(cfg);
        // Locked to the scripted demo: nothing to connect to.
        if (cfg.locked) {
          setStatus("demo");
          setStatusText("Scripted demo");
          return;
        }
        const mcp = new LoggedMcpClient(cfg.mcpUrl, cfg.token, (entry) => setRows((r) => [...r, entry]));
        await mcp.connect();
        if (closed) return void mcp.close();
        mcpRef.current = mcp;
        hostRef.current = new Host(mcp, { onToolCall });
        // The family's settings and player ids, from the parent API.
        try {
          applyDashboard(await parentApi("me"));
        } catch (err) {
          setSettingsNote(err instanceof SignedOut ? "Sign in on the parent page to change settings." : (err as Error).message);
        }
        // Fill the leaderboard before anyone speaks, as a device screen would.
        onToolCall("get_household", {}, await mcp.callTool("get_household", {}));
        setStatus("ready");
        setStatusText(new URL(cfg.mcpUrl).host);
      })
      .catch((err) => {
        setStatus("error");
        setStatusText((err as Error).message);
      });
    return () => {
      closed = true;
      stopSpeaking();
      stopLevels();
      void mcpRef.current?.close();
    };
  }, [onToolCall, applyDashboard]);

  /** One exchange: what the family said goes to the host, and Trivi answers out loud. */
  const send = useCallback(async (text: string) => {
    const host = hostRef.current;
    const mcp = mcpRef.current;
    if (!host || !mcp || !text.trim()) return;
    const { setVoice, setHeard, setReply, setFlash } = uiRef.current;
    setBusy(true);
    setFlash(null);
    setReply("");
    setHeard(text);
    setVoice("thinking");
    let say: string;
    try {
      say = await host.turn(text);
    } catch (err) {
      console.error("host turn failed", err);
      say = "Sorry, I can't think right now. Try again in a moment.";
    }
    // Someone may have said the parent phrase; it never stays on screen.
    setHeard(maskText(text, mcp.secrets));
    setReply(say);
    setVoice("speaking");
    await speak(say, { usePolly: true, measure: true });
    setVoice("idle");
    setHeard("");
    setBusy(false);
  }, []);

  /** The mic button: listen, stop listening, or cut Trivi off. */
  const talk = useCallback(async () => {
    const { setVoice, setHeard } = uiRef.current;
    if (listening.current) {
      listenRef.current?.stop();
      return;
    }
    if (busy) {
      // Only speech can be cut short; a model turn runs to the end.
      stopSpeaking();
      return;
    }
    listening.current = true;
    setVoice("listening");
    setHeard("");
    void measureMic();
    let heard = "";
    try {
      const l = listenOnce(setHeard);
      listenRef.current = l;
      heard = await l.done;
    } catch (err) {
      console.error("speech recognition failed", err);
    }
    listening.current = false;
    stopLevels();
    if (heard) return send(heard);
    setVoice("idle");
    setHeard("");
  }, [busy, send]);

  /** Add a player from the settings drawer, through the same MCP tool the host uses. */
  /** The drawer's changes, through the parent API. Each throws the API's message on a refusal. */
  const settings = useMemo<LiveSettings | null>(() => {
    if (!dashboard) return null;
    const post = async (path: string, body: unknown, method?: "DELETE") => applyDashboard(await parentApi(path, { body, method }));
    return {
      dashboard,
      rename: (title) => post("settings", { showTitle: title }),
      addPlayer: async (name, role, look) => {
        const d = await parentApi("players", { body: { name, role: role === "grown-up" ? "parent" : "kid" } });
        const added = d.players.find((p) => !dashRef.current?.players.some((x) => x.playerId === p.playerId));
        if (added) saveLook(added.playerId, look);
        applyDashboard(d);
      },
      removePlayer: (playerId) => post(`players/${playerId}`, undefined, "DELETE"),
      setPackPlaying: (packId, playing) => post(`packs/${packId}`, { paused: !playing }),
      addQuestion: (packId, question, answer) => post(`packs/${packId}/questions`, { questions: [{ question, answer }] }),
      setStage: (s) => post("settings", { stage: s }),
      ask: async (messages) => {
        const res = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) });
        const json = (await res.json().catch(() => ({}))) as { reply?: string; draft?: Draft | null; changes?: string[]; dashboard?: Dashboard; error?: string };
        if (json.dashboard) applyDashboard(json.dashboard);
        if (!res.ok) throw new Error(json.error ?? "Trivi couldn't answer. Try again.");
        return { reply: json.reply ?? "Done.", draft: json.draft ?? null, changes: json.changes ?? [] };
      },
      savePack: async (draft) => {
        // Kids hear these as facts, so anything the fact-check flagged stays out.
        const ok = draft.questions.filter((q) => q.check.status === "agreed");
        if (!ok.length) throw new Error("The fact-check flagged every question. Ask for a new draft.");
        const kinds = new Set(ok.map((q) => q.kind));
        const questions = ok.map(({ check: _check, ...q }) => q);
        await post("packs", { title: draft.title, topic: draft.topic, kind: kinds.size > 1 ? "mixed" : [...kinds][0], questions });
        const left = draft.questions.length - ok.length;
        return `Saved ${draft.title} with ${ok.length} questions.${left ? ` Left out ${left} the fact-check flagged.` : ""}`;
      },
    };
  }, [dashboard, applyDashboard]);

  return {
    /** Connected to a real model: the mic plays the real loop. */
    live: status === "ready" && !!config && !config.mock,
    config,
    status,
    statusText,
    rows,
    family,
    stage,
    busy,
    canListen,
    talk,
    send,
    /** The family's settings and the changes the drawer can make; null until loaded. */
    settings,
    settingsNote,
  };
}
