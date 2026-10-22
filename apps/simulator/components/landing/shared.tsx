"use client";

/**
 * Pieces the landing page sections share: links, the demo family, section
 * headings, and the loop that drives each animated preview. A preview only
 * advances while it's on screen, so a long page doesn't run a dozen timers
 * the reader can't see.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FAMILIES, type DemoMember } from "@/lib/demo-data";

export const DEMO_HREF = "/demo";
export const PARENT_HREF = "/parent";
export const HACKATHON_HREF = "https://amazonappdev2026.devpost.com";
export const REPO_HREF = "https://github.com/impactvelocity/heytrivi";
export const repoPath = (path: string) => `${REPO_HREF}/tree/main/${path}`;

/** Who made it, as on loro.sh. */
export const MAKER = {
  name: "Dylan Jones",
  href: "https://hidylanjones.com",
  photo: "/dylan.png",
  linkedin: "https://www.linkedin.com/in/hidylanjones",
  x: "https://twitter.com/hidylanjones",
};

/** The demo family (Mom, Dad, Billy, Sally), each in their own color. */
export const FAMILY = FAMILIES[0]!.members;
export const COLORS: Record<string, string> = { mom: "#ff8fb1", dad: "#7cc6ff", billy: "#ffc53d", sally: "#3ee0c5" };
export const member = (id: string) => FAMILY.find((m) => m.id === id)!;
/** A player's place in the family, which picks their avatar's shape. */
export const shapeOf = (id: string) => FAMILY.findIndex((m) => m.id === id);
/** Everyone in the demo families, for the "who it's for" cards. */
export const EVERYONE: DemoMember[] = FAMILIES.flatMap((f) => f.members);

/**
 * The AWS services on the page, each with its official architecture icon
 * (public/aws, from the AWS Architecture Icons set of 01/30/2026) and the
 * icon's category color, which tints its card.
 */
export const AWS_SERVICES = {
  lambda: { name: "AWS Lambda", short: "Lambda", color: "#ed7100" },
  dynamodb: { name: "Amazon DynamoDB", short: "DynamoDB", color: "#c925d1" },
  cognito: { name: "Amazon Cognito", short: "Cognito", color: "#dd344c" },
  bedrock: { name: "Amazon Bedrock", short: "Bedrock", color: "#01a88d" },
  nova: { name: "Amazon Nova 2 Lite", short: "Nova 2 Lite", color: "#01a88d" },
  polly: { name: "Amazon Polly", short: "Polly", color: "#01a88d" },
  amplify: { name: "AWS Amplify Hosting", short: "Amplify", color: "#dd344c" },
  cdk: { name: "AWS CDK", short: "CDK", color: "#c925d1" },
  cloudformation: { name: "AWS CloudFormation", short: "CloudFormation", color: "#e7157b" },
  "systems-manager": { name: "Systems Manager Parameter Store", short: "Parameter Store", color: "#e7157b" },
  iam: { name: "AWS IAM", short: "IAM", color: "#dd344c" },
} as const;
export type AwsId = keyof typeof AWS_SERVICES;

export function AwsIcon({ id, size = 40 }: { id: AwsId; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="lp-aws-icon" src={`/aws/${id}.svg`} alt="" width={size} height={size} />;
}

export function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.82-.26.82-.57v-2.04c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.31-5.47-1.34-5.47-5.94 0-1.3.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .31.21.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

export function SectionHead({
  title,
  id,
  className = "",
  children,
}: {
  title: ReactNode;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`lp-head ${className}`}>
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

/**
 * Steps through `count` beats while the element is on screen and loops.
 * `ms` is one hold time for every beat, or one per beat.
 */
export function useLoop<T extends HTMLElement = HTMLDivElement>(count: number, ms: number | readonly number[]) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hold = typeof ms === "number" ? ms : (ms[step] ?? 1500);
    const t = setTimeout(() => setStep((s) => (s + 1) % count), hold);
    return () => clearTimeout(t);
  }, [visible, step, count, ms]);

  return { ref, step, setStep, visible };
}
