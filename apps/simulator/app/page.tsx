import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import "./demo/demo.css";
import "./demo/duo.css";
import "./avatars/glow.css";
import "./landing.css";
import "./landing-sections.css";

const TITLE = "Hey Trivi: the family game show that keeps score";
const DESCRIPTION =
  "Trivia and riddles settle who's right, who picks the movie, and who takes out the garbage. Trivi hosts on Alexa+, judges every guess, and keeps score from one day to the next. Not an Amazon product.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // A page's openGraph and twitter replace the layout's whole, so these repeat its type, site name and card.
  openGraph: { type: "website", siteName: "Hey Trivi", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, creator: "@hidylanjones" },
};

export default function LandingPage() {
  return <Landing />;
}
