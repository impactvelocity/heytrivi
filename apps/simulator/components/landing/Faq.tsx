/** Questions a judge or a parent is likely to ask, answered from the README and docs. */

import { SectionHead } from "./shared";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Does it run on a real Alexa?",
    a: "It's built as an Alexa+ MCP add-on, with OAuth account linking and a store listing in the repo. Hackathon entrants can't connect to Alexa+ yet, so the game show stands in. It's a real MCP client, and it talks to the same server.",
  },
  {
    q: "Who decides who's right?",
    a: "The host model judges each guess as right, close, or wrong, and explains the answer. The server records the verdicts and applies the rules, so the tools stay fast and the score stays the same from one conversation to the next.",
  },
  {
    q: "Can kids spend points without asking?",
    a: "Not once a parent sets a phrase. Spending needs it, and trading can too. The phrase is stored only as a salted hash, never logged or read back, and five wrong tries lock spending for ten minutes.",
  },
  {
    q: "What does Hey Trivi keep about kids?",
    a: "A first name, a role, and an optional grade band. No birthdates, no audio, and no notes about a child.",
  },
  {
    q: "Can we use our own questions?",
    a: "Yes. Parents write a theme by hand on the parent page, or describe one and let the helper draft it. Nothing reaches the family until a parent saves it.",
  },
  {
    q: "Can I run it myself?",
    a: "Yes. pnpm install and pnpm dev:local start the server with an in-memory demo family. With MOCK_MODEL=1, the game show runs scripted rounds with no AWS account at all.",
  },
];

export function Faq() {
  return (
    <section className="lp-section" id="faq" aria-labelledby="lp-faq-title">
      <div className="lp-wrap lp-faq-wrap">
        <SectionHead kicker="FAQ" tone="blue" title="Good questions, short answers" id="lp-faq-title">
          The README and the docs have the long ones.
        </SectionHead>
        <div className="lp-faq">
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
