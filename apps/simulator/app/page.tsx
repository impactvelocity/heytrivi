import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import "./demo/demo.css";
import "./demo/duo.css";
import "./avatars/glow.css";
import "./landing.css";
import "./landing-sections.css";

export const metadata: Metadata = {
  title: "Hey Trivi",
  description:
    "The family game show that keeps score. Trivia and riddles settle who's right, who picks the movie, and who takes out the garbage. An MCP server for Alexa+. Not an Amazon product.",
};

export default function LandingPage() {
  return <Landing />;
}
