"use client";

/**
 * The Hey Trivi landing page (/). The dark hero plays a round on the quiz
 * night stage; below it, on white, come the video and the sections in
 * components/landing (Bento, WhoFor, Playbook, Parents, Stack, Faq). It wears
 * the demo stage's Duo look (demo.css + duo.css, Showtime theme) so the page
 * and the game feel like one product. The footer is dark again, a bookend to
 * the hero. Styles are in app/landing.css (page, hero, video, footer) and app/landing-sections.css (everything between).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Glow, type Mood } from "@/components/avatars/Glow";
import { Avatar } from "@/components/demo/Avatar";
import { ChevronRight, Crown, Mic, Trophy } from "@/components/demo/icons";
import { MarqueeLights } from "@/components/demo/MarqueeLights";
import { StageBackdrop } from "@/components/demo/StageBackdrop";
import { Bento } from "./Bento";
import { Faq } from "./Faq";
import { Parents } from "./Parents";
import { Playbook } from "./Playbook";
import { HowBuilt, Repo, Tech } from "./Stack";
import { WhoFor, Week } from "./WhoFor";
import { COLORS, DEMO_HREF, FAMILY, HACKATHON_HREF, member } from "./shared";

/** The demo video's embed URL (YouTube or Vimeo). Until it's set, the player links to the scripted demo instead. */
const VIDEO_EMBED: string = "";

/** Who made it, as on loro.sh. */
const MAKER = {
  name: "Dylan Jones",
  href: "https://hidylanjones.com",
  photo: "/dylan.png",
  linkedin: "https://www.linkedin.com/in/hidylanjones",
  x: "https://twitter.com/hidylanjones",
};

const nameOf = (id: string) => member(id).name;

/**
 * The hero's leaderboard plays three rounds on the demo's scale (10 points a
 * right answer), and each one changes the order: Billy takes the lead, Sally
 * passes Dad, then Mom takes the lead back. Then it starts over.
 */
const START: Record<string, number> = { mom: 120, billy: 115, dad: 90, sally: 82 };
const POINTS = 10;
const ROUNDS = [
  { q: "Which planet spins on its side?", winner: "billy", right: "Billy says Uranus, and that's right!", wrong: "Dad says Mars? Not quite!" },
  { q: "How many hearts does an octopus have?", winner: "sally", right: "Sally says three, and she's right!", wrong: "Billy says two? So close!" },
  { q: "Can you look at the sun through sunglasses?", winner: "mom", right: "Mom says no, never, and she's right!", wrong: "Dad says only upside down? Not quite!" },
];
const PLACES = ["first", "second", "third", "fourth"];

type Beat = { mood: Mood; say: ReactNode; ms: number; scores: Record<string, number>; flash?: string };

/** Every beat of the loop: Trivi's mood, what Trivi says, how long it holds (ms), and the scores at that moment. */
const BEATS: Beat[] = (() => {
  const beats: Beat[] = [];
  let scores = START;
  for (const r of ROUNDS) {
    const who = nameOf(r.winner);
    beats.push({ mood: "speaking", say: r.q, ms: 3000, scores });
    beats.push({ mood: "listening", say: "Go ahead, everyone guess!", ms: 2400, scores });
    beats.push({ mood: "thinking", say: "Hmm, checking the answers…", ms: 2200, scores });
    scores = { ...scores, [r.winner]: scores[r.winner]! + POINTS };
    const place = rankOf(scores).indexOf(r.winner);
    beats.push({ mood: "correct", say: <>{r.right} <b>+{POINTS} for {who}</b></>, ms: 3000, scores, flash: r.winner });
    beats.push({ mood: "wrong", say: r.wrong, ms: 2400, scores });
    beats.push({
      mood: "celebrating",
      say: place === 0 ? <>{who} takes the lead with <b>{scores[r.winner]} points!</b></> : <>{who} moves up to <b>{PLACES[place]}!</b></>,
      ms: 2800,
      scores,
    });
  }
  return beats;
})();

/** Player ids, highest score first. */
function rankOf(scores: Record<string, number>) {
  return FAMILY.map((m) => m.id).sort((a, b) => scores[b]! - scores[a]!);
}

/** Leaderboard row height plus the gap between rows; matches .lp-board .dm-row in landing.css. */
const ROW = 68;

export function Landing() {
  return (
    <div className="dm lp" data-skin="duo" data-theme="showtime">
      <Nav />
      <main>
        <Hero />
        <div className="lp-light">
          <Video />
          <Bento />
          <WhoFor />
          <Week />
          <Playbook />
          <Parents />
          <HowBuilt />
          <Tech />
          <Repo />
          <Faq />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <a className="lp-logo" href="#top" aria-label="Hey Trivi home">
      Hey<b>Trivi</b>
    </a>
  );
}

function Nav() {
  return (
    <header className="lp-nav">
      <div className="lp-wrap lp-nav-row">
        <Logo />
        <nav className="lp-nav-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#who">Who it's for</a>
          <a href="#play">See it play</a>
          <a href="#how">How it works</a>
          <a href="#tech">Tech</a>
        </nav>
        <a className="lp-btn lp-btn-sm" href={DEMO_HREF}>
          Try the demo
        </a>
      </div>
    </header>
  );
}

/** "Made by" with a photo and social links, in the hero and the footer. */
function MadeBy() {
  return (
    <div className="lp-made">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MAKER.photo} alt="" width={28} height={28} />
      <p>
        Made by{" "}
        <a href={MAKER.href} target="_blank" rel="noreferrer">
          {MAKER.name}
        </a>
      </p>
      <a className="lp-made-icon" href={MAKER.linkedin} target="_blank" rel="noreferrer" aria-label={`${MAKER.name} on LinkedIn`}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width="15" height="15">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
        </svg>
      </a>
      <a className="lp-made-icon" href={MAKER.x} target="_blank" rel="noreferrer" aria-label={`${MAKER.name} on X`}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width="15" height="15">
          <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
        </svg>
      </a>
    </div>
  );
}

function Hero() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % BEATS.length), BEATS[step]!.ms);
    return () => clearTimeout(t);
  }, [step]);
  const beat = BEATS[step]!;
  const ranked = rankOf(beat.scores);
  const top = beat.scores[ranked[0]!]!;

  return (
    <section className="lp-hero" id="top">
      <StageBackdrop kind="quiz" />
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">Built for the Build, Ship, Shape hackathon</p>
          <h1 className="lp-h1">
            The family game show that <em>keeps score</em>
          </h1>
          <p className="lp-lede">
            Trivia and riddles settle who's right, who picks the movie, and who takes out the garbage. Trivi judges every guess, keeps
            score from one day to the next, and lets the family spend points on the fun stuff.
          </p>
          <div className="lp-ctas">
            <a className="lp-btn lp-btn-lg" href={DEMO_HREF}>
              <Mic width={20} height={20} />
              Try the scripted demo
            </a>
            <a className="lp-btn lp-btn-lg lp-btn-ghost" href={HACKATHON_HREF} target="_blank" rel="noreferrer">
              See the hackathon
              <ChevronRight width={18} height={18} />
            </a>
          </div>
          <p className="lp-fine">Runs in Chrome with no sign-up. Alexa+ simulator. Not an Amazon product.</p>
          <MadeBy />
        </div>

        <div className="lp-hero-art" aria-hidden>
          <div className="lp-hero-glow">
            <Glow mood={beat.mood} color="grape" />
          </div>
          <div key={step} className="lp-bubble lp-bubble-hero">
            {beat.say}
          </div>
          <div className="lp-board">
            <p className="lp-board-title">
              <Trophy width={16} height={16} /> This week
            </p>
            <ol className="dm-board-list lp-board-list" style={{ height: FAMILY.length * ROW - (ROW - 60) }}>
              {FAMILY.map((m, shape) => {
                const i = ranked.indexOf(m.id);
                const score = beat.scores[m.id]!;
                return (
                  <li key={m.id} className={`dm-row${i === 0 ? " dm-row-lead" : ""}`} style={{ transform: `translateY(${i * ROW}px)` }}>
                    <span className="dm-rank">{i === 0 ? <Crown width={20} height={20} /> : i + 1}</span>
                    <Avatar look={m.look} size={40} shape={shape} color={COLORS[m.id]} rank={i} of={FAMILY.length} />
                    <span className="dm-row-main">
                      <span className="dm-row-name">{m.name}</span>
                      <span className="dm-meter">
                        <span style={{ width: `${(score / top) * 100}%` }} />
                      </span>
                    </span>
                    <span className="dm-score">
                      {score}
                      <small>pts</small>
                    </span>
                    {beat.flash === m.id && (
                      <span key={step} className="dm-flash">
                        +{POINTS}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function Video() {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="lp-section lp-video" aria-label="Demo video">
      <div className="lp-wrap">
        <div className="dm-frame lp-frame">
          <MarqueeLights mode={playing ? "glow" : "chase"} />
          <div className="dm-stage lp-screen">
            {playing && VIDEO_EMBED ? (
              <iframe
                src={`${VIDEO_EMBED}${VIDEO_EMBED.includes("?") ? "&" : "?"}autoplay=1`}
                title="Hey Trivi demo video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="lp-poster">
                <div className="lp-poster-glow" aria-hidden>
                  <Glow mood="speaking" color="grape" />
                </div>
                {VIDEO_EMBED ? (
                  <button type="button" className="lp-play" onClick={() => setPlaying(true)}>
                    <span className="lp-play-icon" aria-hidden />
                    Play the demo video
                  </button>
                ) : (
                  <a className="lp-play" href={DEMO_HREF}>
                    <span className="lp-play-icon" aria-hidden />
                    Video coming soon. Try the live demo
                  </a>
                )}
                <p className="lp-poster-cap">Under 3 minutes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** How long Trivi celebrates when the footer first comes into view, before settling to idle. */
const CHEER_MS = 2600;

function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        setMood("celebrating");
        t = setTimeout(() => setMood("idle"), CHEER_MS);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div ref={ref} className="lp-final">
          <div className="lp-final-glow" aria-hidden>
            <Glow mood={mood} color="grape" />
          </div>
          <h2>Ready for round one?</h2>
          <p>Pick a family, tap the mic, and answer out loud.</p>
          <a className="lp-btn lp-btn-lg" href={DEMO_HREF}>
            <Mic width={20} height={20} />
            Try the scripted demo
          </a>
        </div>
        <div className="lp-foot-row">
          <div className="lp-foot-brand">
            <Logo />
            <MadeBy />
          </div>
          <nav className="lp-foot-links" aria-label="More">
            <a href={HACKATHON_HREF} target="_blank" rel="noreferrer">
              Hackathon
              <ChevronRight width={16} height={16} />
            </a>
          </nav>
        </div>
        <p className="lp-foot-fine">
          Built for{" "}
          <a href={HACKATHON_HREF} target="_blank" rel="noreferrer">
            Build, Ship, Shape: Amazon Developer Hackathon
          </a>
          , in the Alexa+ track and the AWS Builder mini challenge. Alexa+ simulator. Not an Amazon product. MIT licensed.
        </p>
      </div>
    </footer>
  );
}
