"use client";

/**
 * What a parent gets: the parent page's tabs, and a window showing the theme
 * helper at work (lib/pack-helper.ts): Claude Haiku 5.5 writes the draft and
 * answers it blind, Claude Sonnet 5.5 checks the facts, and the parent saves.
 */

import type { CSSProperties } from "react";
import { Check, ChevronRight, Sparkle, Trophy, Users } from "@/components/demo/icons";
import { PARENT_HREF, SectionHead, useLoop } from "./shared";

const TABS = [
  { icon: <Users width={18} height={18} />, title: "Family & leaderboard", body: "Balances, lifetime totals, and chores owed. Add, rename, or remove players." },
  { icon: <Sparkle width={18} height={18} />, title: "Themes", body: "Write questions by hand, or describe what you want and let the helper draft them." },
  { icon: <Trophy width={18} height={18} />, title: "Points history", body: "Every point earned, spent, traded, or reset, by day and by person." },
];

const PROMPT = "My kids are 6 and 8 and learning about dinosaurs. Make 6 questions and riddles.";
const DRAFT = [
  { q: "Which dinosaur had three horns and a big frill?", a: "Triceratops" },
  { q: "Riddle: I had plates on my back and spikes on my tail. Who am I?", a: "Stegosaurus" },
  { q: "Did T. rex walk on two legs or four?", a: "Two", fix: "Fixed: the first draft said four" },
  { q: "What do you call a scientist who studies dinosaur fossils?", a: "A paleontologist" },
];
const HELPER_MS = [2800, 1500, 2100, 2800, 2600] as const;

export function Parents() {
  const { ref, step } = useLoop(HELPER_MS.length, HELPER_MS);
  return (
    <section className="lp-section" id="parents" aria-labelledby="lp-parents-title">
      <div className="lp-wrap lp-parents">
        <div className="lp-parents-copy">
          <SectionHead
            title={
              <>
                Parents set it up, <br className="lp-br" />
                kids just play
              </>
            }
            id="lp-parents-title"
            className="lp-head-left"
          >
            The parent page uses the same login as Alexa+ and changes the same household the family plays. Nothing a helper writes
            reaches the kids until a parent saves it.
          </SectionHead>
          <ul className="lp-parent-tabs">
            {TABS.map((t) => (
              <li key={t.title}>
                <span className="lp-parent-icon">{t.icon}</span>
                <span>
                  <b>{t.title}</b>
                  <small>{t.body}</small>
                </span>
              </li>
            ))}
          </ul>
          <a className="lp-btn lp-btn-ghost" href={PARENT_HREF}>
            Open the Parent Page
            <ChevronRight width={18} height={18} />
          </a>
        </div>

        <div ref={ref} className="lp-window" aria-hidden>
          <div className="lp-window-bar">
            <i />
            <i />
            <i />
            <span>Parent page · Themes</span>
          </div>
          <div className="lp-window-body">
            <p className="lp-helper-label">Describe a Theme</p>
            <p key={step === 0 ? "typing" : "typed"} className="lp-helper-prompt" data-typing={step === 0 || undefined}>
              {PROMPT.split(" ").map((w, i) => (
                <span key={i} style={{ "--w": i } as CSSProperties}>
                  {w}{" "}
                </span>
              ))}
            </p>
            <div className="lp-helper-steps">
              <span data-state={step === 1 ? "now" : step > 1 ? "done" : undefined}>
                <i /> Writing · Claude Haiku 5.5
              </span>
              <span data-state={step === 2 ? "now" : step > 2 ? "done" : undefined}>
                <i /> Answering blind · Claude Haiku 5.5
              </span>
              <span data-state={step === 2 ? "now" : step > 2 ? "done" : undefined}>
                <i /> Checking facts · Claude Sonnet 5.5
              </span>
            </div>
            <ol className="lp-helper-draft" data-show={step >= 3 || undefined}>
              {DRAFT.map((d, i) => (
                <li key={d.q} style={{ "--i": i } as CSSProperties}>
                  <span className="lp-helper-tick" data-fix={d.fix ? true : undefined}>
                    {d.fix ? <Sparkle width={12} height={12} /> : <Check width={12} height={12} />}
                  </span>
                  <span>
                    {d.q} <b>{d.a}</b>
                    {d.fix && <small>{d.fix}</small>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="lp-helper-save" data-saved={step >= 4 || undefined}>
              <span>{step >= 4 ? "Saved: Dinosaur Week" : "Review, then save"}</span>
              <b>{step >= 4 ? <Check width={16} height={16} /> : "Save Theme"}</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
