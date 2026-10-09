import type { Metadata } from "next";
import "../parent/parent.css";

export const metadata: Metadata = { title: "Hey Trivi privacy policy" };

/** Linked from the Alexa+ add-on listing (privacyPolicyUrl). */
export default function PrivacyPage() {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <div className="pp">
      <article className="pp-wrap pp-legal">
        <h1>Privacy policy</h1>
        <p className="pp-muted">Hey Trivi, a family trivia game for voice assistants. Last updated October 9, 2026.</p>

        <h2>What we keep</h2>
        <ul>
          <li>The parent&apos;s email address and a password, held by our sign-in service (Amazon Cognito). We never see the password.</li>
          <li>For each player: a first name, whether they&apos;re a parent or a kid, and for kids an optional school grade band (K-2, 3-5, 6-8, or 9-12). No birthdays, last names, photos, or notes about a child.</li>
          <li>The game record: questions asked, what each player answered as text, whether it was right, points, chores owed, and trades.</li>
          <li>If you set a parent phrase, a scrambled copy (a salted hash) of it. We can&apos;t read the phrase back, and it never appears in logs or answers.</li>
          <li>Your settings: show name, time zone, and when points reset.</li>
        </ul>

        <h2>What we don&apos;t keep</h2>
        <p>
          We never receive or store audio. Your voice assistant turns speech into text, and only the text of the game reaches us. We don&apos;t use cookies for
          advertising, sell data, or share it with anyone except the services that run Hey Trivi (Amazon Web Services).
        </p>

        <h2>How it&apos;s used</h2>
        <p>Only to run your family&apos;s game: keeping score, remembering chores, and showing the parent page. Each family&apos;s data is visible only to that family&apos;s account.</p>

        <h2>Where it&apos;s kept</h2>
        <p>In Amazon Web Services in the United States (Ohio region), encrypted at rest.</p>

        <h2>Deleting your data</h2>
        <p>
          You can rename or remove players on the parent page at any time. To delete your whole family and account,{" "}
          {contact ? (
            <>
              email <b>{contact}</b>
            </>
          ) : (
            "contact us at the address on the Hey Trivi project page"
          )}{" "}
          from the account&apos;s email address, and we&apos;ll delete everything within 30 days. Unlinking Hey Trivi in your voice assistant stops it from reaching your family&apos;s data.
        </p>

        <h2>Children</h2>
        <p>
          Hey Trivi is set up and managed by a parent. Kids play by voice with their family and have no accounts of their own. We collect only a first name and an optional grade band for a child, as described above.
        </p>
      </article>
    </div>
  );
}
