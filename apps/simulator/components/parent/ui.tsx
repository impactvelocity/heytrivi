"use client";

import { Avatar as Portrait, familyColors } from "@/components/demo/Avatar";
import { lookFor, savedLooks, type Look } from "@/lib/demo-data";
import { playerColor, setPalette, type ParentPlayer } from "@/lib/parent";

/** Each player's portrait and place in the family: the same faces /demo draws. */
let portraits = new Map<string, { look: Look; shape: number }>();

/** Everyone's portrait and colour. Call when the dashboard loads. */
export function setFamily(players: ParentPlayer[]): void {
  const saved = savedLooks();
  const members = players.map((p) => ({ id: p.playerId, look: saved[p.playerId] ?? lookFor(p.name) }));
  portraits = new Map(members.map((m, i) => [m.id, { look: m.look, shape: i }]));
  setPalette(familyColors(members));
}

/** A player's face. On the leaderboard, `rank` and `of` set the expression, as on /demo. */
export function Avatar({ player, small, rank, of }: { player: Pick<ParentPlayer, "playerId" | "name">; small?: boolean; rank?: number; of?: number }) {
  const p = portraits.get(player.playerId);
  if (!p) {
    return (
      <span className={`pp-av pp-av-gone${small ? " pp-av-sm" : ""}`} aria-hidden>
        {player.name[0]}
      </span>
    );
  }
  return <Portrait look={p.look} shape={p.shape} color={playerColor(player.playerId)} size={small ? 28 : 40} rank={rank} of={of} />;
}

/** "Everyone" plus one chip per player. `value` is "all" or a player id. */
export function PlayerFilter({ players, value, onChange }: { players: ParentPlayer[]; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <button type="button" className="pp-chipbtn" aria-pressed={value === "all"} onClick={() => onChange("all")}>
        Everyone
      </button>
      {players.map((p) => (
        <button key={p.playerId} type="button" className="pp-chipbtn" aria-pressed={value === p.playerId} onClick={() => onChange(p.playerId)}>
          <span className="pp-sw" style={{ background: playerColor(p.playerId) }} />
          {p.name}
        </button>
      ))}
    </>
  );
}

export function TimeZoneSelect({ id, value, onChange }: { id: string; value: string; onChange: (tz: string) => void }) {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [value];
  const list = zones.includes(value) ? zones : [value, ...zones];
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="pp-card pp-empty">{children}</div>;
}
