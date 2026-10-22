/**
 * The model step (R10.3). Takes the conversation and the MCP tools from the
 * browser, asks the host model for the next step, and returns tool calls. The
 * tools have no execute function: the browser runs them through its MCP
 * client so every message shows in the protocol panel. Speech comes back as
 * a call to the `say` tool, added here, and a tool call is required every
 * step, so the model's loose text (sometimes its reasoning) is never spoken.
 *
 * The model and provider are set up in lib/model.ts.
 */

import { generateText, jsonSchema, tool, type ModelMessage, type ToolSet } from "ai";
import { HOST_PROMPT, SAY_TOOL } from "@/lib/host-prompt";
import { PROVIDER, languageModel, modelErrorMessage } from "@/lib/model";

export const dynamic = "force-dynamic";

const model = languageModel();

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
  for (const t of [...body.tools, SAY_TOOL]) {
    const { $schema: _ignored, ...schema } = t.inputSchema as Record<string, unknown>;
    tools[t.name] = tool({ description: t.description, inputSchema: jsonSchema(schema as never) });
  }
  try {
    const result = await generateText({
      model,
      system: HOST_PROMPT,
      messages: body.messages,
      tools,
      toolChoice: body.forceTool && tools[body.forceTool] ? { type: "tool", toolName: body.forceTool } : "required",
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
    return Response.json({ error: modelErrorMessage(err) }, { status: 502 });
  }
}
