"use client";

/**
 * How Hey Trivi is built: the split between the host and the server, the AWS
 * services and what each one does, the MCP tools, and what's in the repo. Facts here come from README.md,
 * docs/aws-integrations.md, and docs/latency-report.txt.
 */

import type { ReactNode } from "react";
import { Glow } from "@/components/avatars/Glow";
import { StageBackdrop } from "@/components/demo/StageBackdrop";
import { Cards, Check, ChevronRight, Mic, Sliders, Sparkle, Users } from "@/components/demo/icons";
import { DEMO_HREF, PARENT_HREF, SectionHead, repoPath, useLoop } from "./shared";

/* ------------------------------------------------------------ the split */

const HOST = ["Hears everyone's guesses at once", "Decides right, close, or wrong", "Explains the answer, out loud"];
const SERVER = ["The family, the points, and the chores", "Stakes, tiebreaks, trades, and resets", "The parent phrase, as a salted hash"];

/** The calls that ride between the two halves, one after another: out to the server, then back. */
const CALLS = [
  { tool: "record_round", back: "Billy +10" },
  { tool: "spend_points", back: "Needs the phrase" },
  { tool: "transfer_points", back: "Garbage moves" },
];
const CALL_MS = CALLS.flatMap(() => [1500, 1900]);

export function HowBuilt() {
  const { ref, step } = useLoop(CALL_MS.length, CALL_MS);
  const call = CALLS[Math.floor(step / 2)]!;
  const back = step % 2 === 1;
  return (
    <section className="lp-section" id="how" aria-labelledby="lp-how-title">
      <div className="lp-wrap">
        <SectionHead title="The host judges, the server keeps the record" id="lp-how-title">
          Alexa+ runs the conversation and decides who's right. Hey Trivi's MCP server stores what happened and applies the rules, so a
          score never comes from a model's memory.
        </SectionHead>

        <div ref={ref} className="lp-split">
          <div className="lp-half">
            <span className="lp-half-icon">
              <Mic width={24} height={24} />
            </span>
            <p className="lp-half-kicker">The host judges</p>
            <h3>Alexa+</h3>
            <ul>
              {HOST.map((h) => (
                <li key={h}>
                  <Check width={14} height={14} />
                  {h}
                </li>
              ))}
            </ul>
            <p className="lp-half-foot">In the game show: Amazon Nova 2 Lite and Amazon Polly</p>
          </div>

          <div className="lp-split-wire" aria-hidden>
            <span className="lp-split-label">MCP · Streamable HTTP</span>
            <span className="lp-split-track">
              <span key={step} className="lp-split-pill" data-back={back || undefined}>
                {back ? <>← {call.back}</> : <>{call.tool} →</>}
              </span>
            </span>
          </div>

          <div className="lp-half" data-main>
            <StageBackdrop kind="quiz" />
            <span className="lp-half-glow">
              <Glow mood={back ? "speaking" : "thinking"} color="grape" />
            </span>
            <p className="lp-half-kicker">The server keeps the record</p>
            <h3>Hey Trivi MCP server</h3>
            <ul>
              {SERVER.map((h) => (
                <li key={h}>
                  <Check width={14} height={14} />
                  {h}
                </li>
              ))}
            </ul>
            <p className="lp-half-foot">
              <span>AWS Lambda</span>
              <span>Amazon DynamoDB</span>
              <span>Amazon Cognito</span>
            </p>
          </div>
        </div>

        <p className="lp-split-note">
          Every family uses the same server URL, and a parent's login decides which household it loads. Any MCP client can connect.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- the stack */

const STATS = [
  { value: "9", label: "MCP tools" },
  { value: "125 ms", label: "Slowest tool's p95, 50 calls each" },
  { value: "117", label: "Tests passing" },
  { value: "1", label: "CDK stack to deploy or tear down" },
];

const AWS: { name: string; role: string; tag: string }[] = [
  { name: "AWS Lambda", role: "Runs the MCP server on Node 22 and ARM. A function URL is the HTTPS endpoint, with no API Gateway.", tag: "Compute" },
  { name: "Amazon DynamoDB", role: "One on-demand table for households, players, rounds, chores, the points ledger, and themes.", tag: "Data" },
  { name: "Amazon Cognito", role: "Parent sign-up and managed login. Its access tokens are the bearer tokens the MCP server checks.", tag: "Accounts" },
  { name: "Amazon Bedrock", role: "The direct path to Amazon Nova 2 Lite, the game show's host. It's behind a flag while this account's Bedrock quota is 0, so the same model runs through the Vercel AI Gateway.", tag: "AI" },
  { name: "Amazon Polly", role: "Trivi's speaking voice in the game show.", tag: "Voice" },
  { name: "AWS Amplify Hosting", role: "Hosts the Next.js app: the game show, the parent page, and this page.", tag: "Web" },
  { name: "AWS CDK", role: "One CloudFormation stack creates everything, and one command tears it down.", tag: "Infra" },
  { name: "Systems Manager Parameter Store", role: "Holds the MCP server's URL, so the apps and tests read it instead of hard-coding it.", tag: "Config" },
  { name: "AWS IAM", role: "Least-privilege roles: Lambda gets one table, and the web app gets Bedrock and Polly.", tag: "Security" },
];

const ALSO = ["MCP TypeScript SDK", "Hono", "Next.js", "AI SDK", "Vercel AI Gateway", "Claude Haiku 5.5", "Claude Sonnet 5.5", "Vitest"];

const TOOLS: { name: string; when: string }[] = [
  { name: "get_household", when: "“Let's play Hey Trivi.” “What's the score?”" },
  { name: "start_round", when: "“Ask us one.” “For the garbage.” A tiebreak." },
  { name: "record_round", when: "After the guesses: “Mom says… Dad says…”" },
  { name: "complete_chore", when: "“Billy took out the garbage.”" },
  { name: "spend_points", when: "“Sally spends 50 points to pick the movie.”" },
  { name: "transfer_points", when: "“I'll give Sally 20 points to take the garbage.”" },
  { name: "show_scoreboard", when: "“Show the scores.” Returns the scoreboard MCP App." },
  { name: "add_player", when: "“Add Grandma to the game.”" },
  { name: "list_packs", when: "“What themes do we have?”" },
];

export function Tech() {
  return (
    <section className="lp-section" id="tech" aria-labelledby="lp-tech-title">
      <div className="lp-wrap">
        <SectionHead title="Built on AWS" id="lp-tech-title">
          Every service here is in the CDK stack or the Amplify app, and each one has a job.
        </SectionHead>

        <dl className="lp-stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="lp-aws">
          {AWS.map((a) => (
            <div key={a.name} className="lp-aws-card">
              <span className="lp-aws-tag">{a.tag}</span>
              <b>{a.name}</b>
              <p>{a.role}</p>
            </div>
          ))}
        </div>

        <div className="lp-also">
          <span>Also in the stack</span>
          {ALSO.map((a) => (
            <code key={a}>{a}</code>
          ))}
        </div>

        <div className="lp-tools">
          <div className="lp-tools-head">
            <b>Nine MCP tools, and none of them call a model</b>
            <span>What the family says, and the tool the host calls</span>
          </div>
          <ul>
            {TOOLS.map((t) => (
              <li key={t.name}>
                <code>{t.name}</code>
                <span>{t.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ the repo */

const BUILT: { icon: ReactNode; title: string; body: string; href: string; cta: string; live?: boolean }[] = [
  { icon: <Sparkle width={20} height={20} />, title: "Game show", body: "Stands in for Alexa+: a real MCP client with Trivi, the leaderboard, and every MCP message.", href: DEMO_HREF, cta: "Play it", live: true },
  { icon: <Users width={20} height={20} />, title: "Parent page", body: "Sign up, set up the family, write themes, and see history.", href: PARENT_HREF, cta: "Open it", live: true },
  { icon: <Cards width={20} height={20} />, title: "MCP server", body: "Hono on Lambda: nine tools, OAuth discovery, and the scoreboard app.", href: repoPath("services/mcp-server"), cta: "Code" },
  { icon: <Sliders width={20} height={20} />, title: "Game rules", body: "Pure functions for verdicts, points, stakes, tiebreaks, trades, and resets.", href: repoPath("packages/core"), cta: "Code" },
  { icon: <Cards width={20} height={20} />, title: "Storage", body: "One interface, with DynamoDB and in-memory versions and the demo family.", href: repoPath("packages/store"), cta: "Code" },
  { icon: <Sliders width={20} height={20} />, title: "Infrastructure", body: "The AWS CDK app: table, user pool, Lambda, and roles.", href: repoPath("infra"), cta: "Code" },
];

export function Repo() {
  return (
    <section className="lp-section" id="built" aria-labelledby="lp-built-title">
      <div className="lp-wrap">
        <SectionHead title="Everything that was built" id="lp-built-title">
          All of it was built during the hackathon, starting October 8, 2026, and it's open source under the MIT license.
        </SectionHead>
        <div className="lp-built">
          {BUILT.map((b) => (
            <a
              key={b.title}
              className="lp-built-card"
              href={b.href}
              data-live={b.live || undefined}
              {...(b.live ? {} : { target: "_blank", rel: "noreferrer" })}
            >
              <span className="lp-built-icon">{b.icon}</span>
              <b>{b.title}</b>
              <p>{b.body}</p>
              <span className="lp-built-cta">
                {b.cta} <ChevronRight width={14} height={14} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
