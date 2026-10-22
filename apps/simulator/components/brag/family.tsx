/** The video's family: the demo seed's Mom, Dad, Sally and John, in the demo stage's looks. */

import { Avatar, familyColors } from "@/components/demo/Avatar";
import { FAMILIES, type DemoFamily } from "@/lib/demo-data";

export type Who = "mom" | "dad" | "john" | "sally";

const jones = FAMILIES[0]!;
const look = (id: string) => jones.members.find((m) => m.id === id)!.look;

export const FAMILY: DemoFamily = {
  id: "jones",
  name: "Jones Family",
  members: [
    { id: "mom", name: "Mom", role: "grown-up", week: 5, allTime: 0, look: look("mom") },
    { id: "dad", name: "Dad", role: "grown-up", week: 3, allTime: 0, look: look("dad") },
    { id: "john", name: "John", role: "kid", week: 6, allTime: 0, look: look("billy") },
    { id: "sally", name: "Sally", role: "kid", week: 5, allTime: 0, look: look("sally") },
  ],
};

export const COLORS = familyColors(FAMILY.members);
export const NAME: Record<Who, string> = { mom: "Mom", dad: "Dad", john: "John", sally: "Sally" };
const SHAPE: Record<Who, number> = { mom: 0, dad: 1, john: 2, sally: 3 };

/** A family member's avatar; `mood` picks the leaderboard face (0 = grin, 3 = worried). */
export function Face({ who, size = 40, mood }: { who: Who; size?: number; mood?: 0 | 1 | 2 | 3 }) {
  const m = FAMILY.members.find((x) => x.id === who)!;
  return <Avatar look={m.look} size={size} shape={SHAPE[who]} color={COLORS.get(who)} rank={mood} of={4} />;
}
