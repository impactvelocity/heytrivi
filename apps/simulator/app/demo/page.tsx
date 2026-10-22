import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/DemoApp";
import "./demo.css";
import "./duo.css";
import "./live.css";
import "./guide.css";
import "../avatars/glow.css";

export const metadata: Metadata = {
  title: "Hey Trivi game show",
  description: "Hey Trivi on a game-show stage: the voice host, the family leaderboard, and settings. Alexa+ simulator. Not an Amazon product.",
};

export default function DemoPage() {
  return <DemoApp />;
}
