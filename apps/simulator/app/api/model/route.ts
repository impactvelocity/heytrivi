/**
 * The model step (R10.3). Takes the conversation and the MCP tools from the
 * browser, asks the host model for the next step, and returns either speech
 * or tool calls. The tools have no execute function: the browser runs them
 * through its MCP client so every message shows in the protocol panel.
 *
 * Two providers, both through the AI SDK:
 * - "gateway" (default): Vercel AI Gateway, model `amazon/nova-2-lite`. Same
 *   Nova 2 Lite model, served from the gateway's own Bedrock access.
 * - "bedrock": Amazon Bedrock directly, from this AWS account.
 *
 * Why the gateway is the default: this account's Bedrock daily token quota is
 * 0 for every Nova model and marked "not adjustable", so every direct call
 * fails with ThrottlingException ("Too many tokens per day"). Other hackathon
 * entrants with new accounts hit the same block, and the organizers can't
 * escalate it. The Bedrock path is kept, complete and IAM-scoped
 * (infra/lib/hey-trivi-stack.ts), so MODEL_PROVIDER=bedrock works as soon as
 * the account has quota. See docs/decisions.md #16 and docs/friction-log.md.
 */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { gateway, generateText, jsonSchema, tool, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import { HOST_PROMPT } from "@/lib/host-prompt";

export const dynamic = "force-dynamic";

const PROVIDER = process.env.MODEL_PROVIDER === "bedrock" ? "bedrock" : "gateway";

function hostModel(): LanguageModel {
  if (PROVIDER === "bedrock") {
    const bedrock = createAmazonBedrock({
      region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "us-east-2",
      credentialProvider: fromNodeProviderChain(),
    });
    return bedrock(process.env.BEDROCK_MODEL_ID ?? "us.amazon.nova-2-lite-v1:0");
  }
  // Reads AI_GATEWAY_API_KEY (or the Vercel OIDC token when deployed on Vercel).
  return gateway(process.env.GATEWAY_MODEL_ID ?? "amazon/nova-2-lite");
}

const model = hostModel();

interface Body {
  messages: ModelMessage[];
  tools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>;
  forceTool?: string;
}

export async function POST(req: Request) {
  if (process.env.MOCK_MODEL === "1") {
    return Response.json({ error: "The model is mocked (MOCK_MODEL=1). Play a replay script instead." }, { status: 400 });
  }
  const body = (await req.json()) as Body;
  const tools: ToolSet = {};
  for (const t of body.tools) {
    const { $schema: _ignored, ...schema } = t.inputSchema;
    tools[t.name] = tool({ description: t.description, inputSchema: jsonSchema(schema as never) });
  }
  try {
    const result = await generateText({
      model,
      system: HOST_PROMPT,
      messages: body.messages,
      tools,
      toolChoice: body.forceTool && tools[body.forceTool] ? { type: "tool", toolName: body.forceTool } : "auto",
      maxOutputTokens: 600,
      temperature: 0.4,
    });
    return Response.json({
      text: result.text,
      toolCalls: result.toolCalls.map((c) => ({ toolCallId: c.toolCallId, toolName: c.toolName, input: c.input })),
      responseMessages: result.responseMessages,
    });
  } catch (err) {
    const e = err as Error;
    console.error("model error", PROVIDER, e.name, e.message);
    const throttled = PROVIDER === "bedrock" && /too many tokens|throttl/i.test(e.message);
    return Response.json(
      {
        error: throttled
          ? "Bedrock is refusing requests: the account's daily token quota is used up or zero. Set MODEL_PROVIDER=gateway to use the AI Gateway."
          : `Model error: ${e.message}`,
      },
      { status: 502 },
    );
  }
}
