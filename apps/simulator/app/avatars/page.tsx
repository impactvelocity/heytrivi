import type { Metadata } from "next";
import { AvatarLab } from "@/components/avatars/AvatarLab";
import "../demo/demo.css";
import "../demo/duo.css";
import "../demo/live.css";
import "./glow.css";
import "./avatars.css";

export const metadata: Metadata = {
  title: "Glow avatar lab",
  description: "Trivi as Glow, in every state and body color. Alexa+ simulator. Not an Amazon product.",
};

export default function AvatarsPage() {
  return <AvatarLab />;
}
