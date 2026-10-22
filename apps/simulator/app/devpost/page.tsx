import type { Metadata } from "next";
import { DevpostCards } from "@/components/devpost/Cards";
import "../demo/demo.css";
import "../demo/duo.css";
import "../demo/live.css";
import "../avatars/glow.css";
import "../brag/brag.css";
import "./devpost.css";

export const metadata: Metadata = {
  title: "Hey Trivi project images",
  description: "The images for the Hey Trivi hackathon write-up. Alexa+ simulator. Not an Amazon product.",
  robots: { index: false },
};

export default function DevpostPage() {
  return <DevpostCards />;
}
