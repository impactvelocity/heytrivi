import type { Metadata } from "next";
import { ParentApp } from "@/components/parent/ParentApp";
import { cognitoConfig, hasSession } from "@/lib/auth";
import { demoOnly } from "@/lib/live-access";
import "./parent.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hey Trivi parent page",
  description: "Your family's scores, history, and settings for Hey Trivi.",
};

export default async function ParentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <ParentApp
      signedIn={demoOnly() || (await hasSession())}
      cognito={!!cognitoConfig()}
      error={error}
    />
  );
}
