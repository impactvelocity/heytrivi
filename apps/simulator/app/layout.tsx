import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-friendly" });

export const metadata: Metadata = {
  title: "Hey Trivi Simulator",
  description: "A family trivia game for voice assistants. Alexa+ simulator. Not an Amazon product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
