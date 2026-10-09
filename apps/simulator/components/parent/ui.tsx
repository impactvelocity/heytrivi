"use client";

import { playerColor, type ParentPlayer } from "@/lib/parent";

export function Avatar({ player, small }: { player: Pick<ParentPlayer, "playerId" | "name">; small?: boolean }) {
  return (
    <span className={`pp-av${small ? " pp-av-sm" : ""}`} style={{ background: playerColor(player.playerId) }} aria-hidden>
      {player.name[0]}
    </span>
  );
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
