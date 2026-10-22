import type { Metadata } from "next";
import { BragVideo } from "@/components/brag/BragVideo";
import "../demo/demo.css";
import "../demo/duo.css";
import "../demo/live.css";
import "../avatars/glow.css";
import "./brag.css";

export const metadata: Metadata = {
  title: "Hey Trivi demo video",
  description: "The frames of the Hey Trivi demo video. Alexa+ simulator. Not an Amazon product.",
  robots: { index: false },
};

export default function BragPage() {
  return <BragVideo />;
}
