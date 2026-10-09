/**
 * The model step (R10.3). Takes the conversation and the MCP tools from the
 * browser, asks Bedrock (Nova 2 Lite) for the next step, and returns either
 * speech or tool calls. The tools have no execute function: the browser runs
 * them through its MCP client so every message shows in the protocol panel.
 */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { generateText, jsonSchema, tool, type ModelMessage, type ToolSet } from "ai";
import { HOST_PROMPT } from "@/lib/host-prompt";

export const dynamic = "force-dynamic";

const bedrock = createAmazonBedrock({
  region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "us-east-2",
  credentialProvider: fromNodeProviderChain(),
});
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "us.amazon.nova-2-lite-v1:0";

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
      model: bedrock(MODEL_ID),
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
    console.error("model error", e.name, e.message);
    const throttled = /too many tokens|throttl/i.test(e.message);
    return Response.json(
      { error: throttled ? "Bedrock is refusing requests: the account's daily token quota is used up or zero." : `Model error: ${e.message}` },
      { status: 502 },
    );
  }
}
