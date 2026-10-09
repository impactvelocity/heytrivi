import type { Metadata } from "next";
import "../parent/parent.css";

export const metadata: Metadata = { title: "Hey Trivi terms of use" };

/** Linked from the Alexa+ add-on listing (termsOfUseUrl). */
export default function TermsPage() {
  return (
    <div className="pp">
      <article className="pp-wrap pp-legal">
        <h1>Terms of use</h1>
        <p className="pp-muted">Hey Trivi, a family trivia game for voice assistants. Last updated October 9, 2026.</p>

        <h2>The game</h2>
        <p>
          Hey Trivi is a free family game. Points, chores, and trades are part of the game and have no money value. Spending points never charges anything.
        </p>

        <h2>Your account</h2>
        <p>
          A parent or guardian creates the family&apos;s account and is responsible for who plays. Keep your password and parent phrase to yourself. You can change the
          parent phrase on the parent page at any time.
        </p>

        <h2>Answers and questions</h2>
        <p>
          The voice assistant decides whether an answer is right, and it can make mistakes. Questions are for fun and learning, and aren&apos;t professional advice of
          any kind.
        </p>

        <h2>Availability</h2>
        <p>Hey Trivi is a hackathon project. It&apos;s provided as is, may change or stop, and may be unavailable at times.</p>

        <h2>Privacy</h2>
        <p>
          See the <a href="/privacy">privacy policy</a> for what we keep and how to delete it.
        </p>
      </article>
    </div>
  );
}
