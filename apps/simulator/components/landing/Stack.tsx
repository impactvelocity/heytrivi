"use client";

/**
 * How Hey Trivi is built: the split between the host and the server, the AWS
 * services (a strip under the video, an architecture diagram, and a card per
 * service), the MCP tools, and what's in the repo. Facts here come from
 * README.md, docs/aws-integrations.md, and docs/latency-report.txt.
 */

import type { CSSProperties, ReactNode, SVGProps } from "react";
import { Glow } from "@/components/avatars/Glow";
import { StageBackdrop } from "@/components/demo/StageBackdrop";
import { Check, ChevronRight, Mic, Sparkle, Trophy, Users } from "@/components/demo/icons";
import { AWS_SERVICES, AwsIcon, DEMO_HREF, GitHubMark, PARENT_HREF, REPO_HREF, SectionHead, repoPath, useLoop, type AwsId } from "./shared";

/* ----------------------------------------------------------- the strip */

const STRIP: AwsId[] = ["lambda", "dynamodb", "cognito", "bedrock", "nova", "polly", "amplify", "cdk"];

/** The AWS services in a row under the video; each one jumps to its card in Built on AWS. */
export function PoweredBy() {
  return (
    <div className="lp-powered">
      <p>Runs on AWS</p>
      <ul>
        {STRIP.map((id) => (
          <li key={id}>
            <a href="#tech" title={AWS_SERVICES[id].name}>
              <AwsIcon id={id} size={40} />
              <span>{AWS_SERVICES[id].short}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

function Chip({ id, label }: { id: AwsId; label?: string }) {
  return (
    <span className="lp-chip">
      <AwsIcon id={id} size={20} />
      {label ?? AWS_SERVICES[id].name}
    </span>
  );
}

export function HowBuilt() {
  const { ref, step } = useLoop(CALL_MS.length, CALL_MS);
  const call = CALLS[Math.floor(step / 2)]!;
  const back = step % 2 === 1;
  return (
    <section className="lp-section" id="how" aria-labelledby="lp-how-title">
      <div className="lp-wrap">
        <SectionHead
          title={
            <>
              The host judges, <br className="lp-br" />
              the server keeps the record
            </>
          }
          id="lp-how-title"
        >
          Alexa+ runs the conversation and decides who's right. Hey Trivi's MCP server stores what happened and applies the rules, so a
          score never comes from a model's memory.
        </SectionHead>

        <div ref={ref} className="lp-split">
          <div className="lp-half">
            <span className="lp-half-icon">
              <Mic width={24} height={24} />
            </span>
            <p className="lp-half-kicker">The Host Judges</p>
            <h3>Alexa+</h3>
            <ul>
              {HOST.map((h) => (
                <li key={h}>
                  <Check width={14} height={14} />
                  {h}
                </li>
              ))}
            </ul>
            <p className="lp-half-foot">
              <small>In the game show</small>
              <Chip id="nova" />
              <Chip id="polly" />
            </p>
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
            <p className="lp-half-kicker">The Server Keeps the Record</p>
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
              <Chip id="lambda" />
              <Chip id="dynamodb" />
              <Chip id="cognito" />
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

/* ---------------------------------------------------- the architecture */

type ArchNode = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: string;
  sub: string[];
  aws?: AwsId;
  /** A glyph and its fill, for the clients that aren't AWS services. */
  glyph?: { Icon: (p: SVGProps<SVGSVGElement>) => ReactNode; fill: string };
  main?: boolean;
};

/* Coordinates are in the diagram's viewBox (1110 × 610): clients on the
   left, then the AWS Cloud group in three columns and three rows. */
const CLIENTS: ArchNode[] = [
  { x: 20, y: 84, title: "Alexa+", sub: ["The voice host", "Judges every guess"], glyph: { Icon: Mic, fill: "#1cb0f6" } },
  { x: 20, y: 254, title: "Game show", sub: ["Browser MCP client", "Stands in for Alexa+"], glyph: { Icon: Sparkle, fill: "#ce82ff" } },
  { x: 20, y: 424, title: "Parent page", sub: ["Sign up, write themes,", "see the history"], glyph: { Icon: Users, fill: "#ff5fd2" } },
];
const SERVICES: ArchNode[] = [
  { x: 574, y: 84, aws: "lambda", title: "AWS Lambda", sub: ["MCP server on Hono", "Node 22 on ARM"], main: true },
  { x: 854, y: 84, aws: "dynamodb", title: "Amazon DynamoDB", sub: ["One on-demand table", "Scores, chores, ledger"] },
  { x: 294, y: 254, aws: "amplify", title: "AWS Amplify", sub: ["Hosts the Next.js app", "and its API routes"] },
  { x: 854, y: 214, h: 80, aws: "bedrock", title: "Amazon Bedrock", sub: ["Nova 2 Lite, the host"] },
  { x: 854, y: 318, h: 80, aws: "polly", title: "Amazon Polly", sub: ["Trivi's speaking voice"] },
  { x: 294, y: 424, aws: "cognito", title: "Amazon Cognito", sub: ["Managed login, OAuth", "and account linking"] },
];

/** Wires as SVG paths, with a label at a point. The Amplify trunk hops over the Cognito wire at x 682. */
const WIRES: { d: string; label?: string; at?: [number, number] }[] = [
  { d: "M220 130 H574", label: "MCP · Streamable HTTP", at: [397, 118] },
  { d: "M220 280 H240 V130" },
  { d: "M790 130 H854" },
  { d: "M220 316 H294" },
  { d: "M510 300 H674 a8 8 0 0 1 16 0 H822 M822 254 V358 M822 254 H854 M822 358 H854", label: "IAM compute role", at: [592, 288] },
  { d: "M220 470 H294", label: "Sign in", at: [257, 458] },
  { d: "M510 470 H682 V176", label: "Token, checked by JWKS", at: [596, 458] },
];

/** The dots that ride the wires. They pass under the cards, so a request disappears into a service and comes out the other side. */
const PACKETS = [
  { path: "M220 130 H854", dur: 3.2, begin: 0 },
  { path: "M220 280 H240 V130 H574", dur: 2.6, begin: 1.3 },
  { path: "M220 316 H300 V300 H822 V254 H854", dur: 3, begin: 0.6 },
  { path: "M220 316 H300 V300 H822 V358 H854", dur: 3, begin: 2.1 },
  { path: "M220 470 H682 V176", dur: 3.4, begin: 1.8 },
];

function Node({ n }: { n: ArchNode }) {
  const w = n.w ?? (n.aws ? 216 : 200);
  const h = n.h ?? 92;
  const top = h / 2 - (n.sub.length > 1 ? 9 : 1);
  return (
    <g className="lp-arch-node" data-main={n.main || undefined} transform={`translate(${n.x} ${n.y})`}>
      <g>
        <rect className="lp-arch-ledge" y="4" width={w} height={h} rx="18" />
        <rect className="lp-arch-card" width={w} height={h} rx="18" />
        {n.glyph ? (
          <>
            <rect x="16" y={h / 2 - 18} width="36" height="36" rx="11" fill={n.glyph.fill} />
            <n.glyph.Icon x={24} y={h / 2 - 10} width={20} height={20} color="#fff" />
          </>
        ) : (
          <image href={`/aws/${n.aws}.svg`} x="16" y={h / 2 - 18} width="36" height="36" clipPath="url(#lp-arch-round)" />
        )}
        <text className="lp-arch-title" x="64" y={top}>
          {n.title}
        </text>
        {n.sub.map((s, i) => (
          <text key={s} className="lp-arch-sub" x="64" y={top + 19 + i * 16}>
            {s}
          </text>
        ))}
      </g>
    </g>
  );
}

const INFRA: { ids: AwsId[]; text: string; x: number }[] = [
  { ids: ["cdk", "cloudformation"], text: "AWS CDK: one CloudFormation stack", x: 294 },
  { ids: ["iam"], text: "Least-privilege IAM roles", x: 629 },
  { ids: ["systems-manager"], text: "URL in Parameter Store", x: 865 },
];

/** The AWS architecture: who calls what, inside one AWS Cloud group, in the official icons. */
function Architecture() {
  return (
    <figure className="lp-arch">
      <div className="lp-arch-scroll">
        <svg viewBox="0 0 1110 610" role="img" aria-labelledby="lp-arch-desc">
          <desc id="lp-arch-desc">
            Alexa+ and the game show call the MCP server on AWS Lambda over Streamable HTTP, and Lambda reads and writes one DynamoDB
            table. The parent page signs in with Amazon Cognito, and Lambda checks Cognito's tokens. AWS Amplify hosts the Next.js app,
            whose compute role calls Amazon Bedrock and Amazon Polly. AWS CDK deploys it all as one CloudFormation stack.
          </desc>
          {/* Rounds each service icon's corners, at any size, like the icons on the cards. */}
          <clipPath id="lp-arch-round" clipPathUnits="objectBoundingBox">
            <rect width="1" height="1" rx="0.24" />
          </clipPath>

          <text className="lp-arch-group" x="20" y="57">
            At home
          </text>
          <rect className="lp-arch-cloud" x="262" y="24" width="832" height="570" rx="20" />
          <image href="/aws/aws-cloud.svg" x="278" y="38" width="26" height="26" clipPath="url(#lp-arch-round)" />
          <text className="lp-arch-group" x="314" y="57">
            AWS Cloud <tspan>· us-east-2 · one CDK stack</tspan>
          </text>

          {WIRES.map((w) => (
            <path key={w.d} className="lp-arch-wire" d={w.d} />
          ))}
          <circle className="lp-arch-joint" cx="240" cy="130" r="4.5" />
          <g className="lp-arch-packets">
            {PACKETS.map((p) => (
              <circle key={p.path + p.begin} r="5.5" className="lp-arch-packet">
                <animateMotion path={p.path} dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
          {WIRES.filter((w) => w.label).map((w) => (
            <text key={w.label} className="lp-arch-label" x={w.at![0]} y={w.at![1]}>
              {w.label}
            </text>
          ))}

          {[...CLIENTS, ...SERVICES].map((n) => (
            <Node key={n.title} n={n} />
          ))}

          <rect className="lp-arch-infra" x="294" y="528" width="776" height="44" rx="14" />
          {INFRA.map((r) => (
            <g key={r.text} transform={`translate(${r.x + 12} 538)`}>
              {r.ids.map((id, i) => (
                <image key={id} href={`/aws/${id}.svg`} x={i * 28} width="24" height="24" clipPath="url(#lp-arch-round)" />
              ))}
              <text className="lp-arch-sub lp-arch-infra-text" x={r.ids.length * 28 + 6} y="17">
                {r.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption>
        Each dot is a request on its way. The game show is a real MCP client, so it calls the same function URL Alexa+ would.
        <span className="lp-arch-swipe"> Swipe to see the whole diagram.</span>
      </figcaption>
    </figure>
  );
}

/* ----------------------------------------------------------- the stack */

const STATS = [
  { value: "9", label: "MCP tools" },
  { value: "125 ms", label: "Slowest tool's p95, 50 calls each" },
  { value: "117", label: "Tests passing" },
  { value: "1", label: "CDK stack to deploy or tear down" },
];

const AWS: { id: AwsId; role: string; tag: string }[] = [
  { id: "lambda", role: "Runs the MCP server on Node 22 and ARM. A function URL is the HTTPS endpoint, with no API Gateway.", tag: "Compute" },
  { id: "dynamodb", role: "One on-demand table for households, players, rounds, chores, the points ledger, and themes.", tag: "Data" },
  { id: "cognito", role: "Parent sign-up and managed login. Its access tokens are the bearer tokens the MCP server checks.", tag: "Accounts" },
  { id: "bedrock", role: "The direct path to Amazon Nova 2 Lite, the game show's host. It's behind a flag while this account's Bedrock quota is 0, so the same model runs through the Vercel AI Gateway.", tag: "AI" },
  { id: "polly", role: "Trivi's speaking voice in the game show.", tag: "Voice" },
  { id: "amplify", role: "Hosts the Next.js app: the game show, the parent page, and this page.", tag: "Web" },
  { id: "cdk", role: "One CloudFormation stack creates everything, and one command tears it down.", tag: "Infra" },
  { id: "systems-manager", role: "Holds the MCP server's URL, so the apps and tests read it instead of hard-coding it.", tag: "Config" },
  { id: "iam", role: "Least-privilege roles: Lambda gets one table, and the web app gets Bedrock and Polly.", tag: "Security" },
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
        <SectionHead title="Nine AWS services, one job each" id="lp-tech-title">
          Every one is in the CDK stack or the Amplify app. Follow a guess from the kitchen table to DynamoDB, and a parent's sign-in to
          the server.
        </SectionHead>

        <Architecture />

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
            <div key={a.id} className="lp-aws-card" style={{ "--svc": AWS_SERVICES[a.id].color } as CSSProperties}>
              <div className="lp-aws-top">
                <AwsIcon id={a.id} size={44} />
                <span className="lp-aws-tag">{a.tag}</span>
              </div>
              <b>{AWS_SERVICES[a.id].name}</b>
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
  { icon: <Sparkle width={20} height={20} />, title: "Game show", body: "Stands in for Alexa+: a real MCP client with Trivi, the leaderboard, and every MCP message.", href: DEMO_HREF, cta: "Play It", live: true },
  { icon: <Users width={20} height={20} />, title: "Parent page", body: "Sign up, set up the family, write themes, and see history.", href: PARENT_HREF, cta: "Open It", live: true },
  { icon: <AwsIcon id="lambda" />, title: "MCP server", body: "Hono on Lambda: nine tools, OAuth discovery, and the scoreboard app.", href: repoPath("services/mcp-server"), cta: "Read the Code" },
  { icon: <Trophy width={20} height={20} />, title: "Game rules", body: "Pure functions for verdicts, points, stakes, tiebreaks, trades, and resets.", href: repoPath("packages/core"), cta: "Read the Code" },
  { icon: <AwsIcon id="dynamodb" />, title: "Storage", body: "One interface, with DynamoDB and in-memory versions and the demo family.", href: repoPath("packages/store"), cta: "Read the Code" },
  { icon: <AwsIcon id="cdk" />, title: "Infrastructure", body: "The AWS CDK app: table, user pool, Lambda, and roles.", href: repoPath("infra"), cta: "Read the Code" },
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
        <div className="lp-built-more">
          <a className="lp-btn lp-btn-ghost" href={REPO_HREF} target="_blank" rel="noreferrer">
            <GitHubMark size={20} />
            Browse the Repo on GitHub
            <ChevronRight width={18} height={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
