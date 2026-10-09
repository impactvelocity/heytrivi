import type { Metadata } from "next";
import { ParentApp } from "@/components/parent/ParentApp";
import { cognitoConfig, hasSession } from "@/lib/auth";
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
      signedIn={await hasSession()}
      cognito={!!cognitoConfig()}
      mcpUrl={process.env.MCP_SERVER_URL ?? "http://localhost:4787/mcp"}
      error={error}
    />
  );
}
