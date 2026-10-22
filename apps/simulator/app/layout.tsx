import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-friendly" });

const TITLE = "Hey Trivi";
const DESCRIPTION = "The family game show that keeps score. A voice trivia game for Alexa+. Not an Amazon product.";

/**
 * The defaults every page starts from. The share image is app/opengraph-image.png
 * (the /devpost?card=og card, saved at 1200×630); Next adds its tags. Links in
 * the tags resolve against APP_URL, or the Amplify URL when it isn't set.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://main.d2glgwm5yifu21.amplifyapp.com"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  openGraph: { type: "website", siteName: TITLE, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, creator: "@hidylanjones" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
