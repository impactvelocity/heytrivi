# Product Feedback

For each tool, SDK, and API used: what it was used for, what worked, what needs work, how onboarding went, and whether we would use it again.

---

## MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, `@modelcontextprotocol/client`)

- **Used for:** The MCP server's tool registration and results, and the simulator's MCP client in the browser.
- **What worked:** `registerTool` with zod 4 schemas is concise, and the JSON Schema it publishes in `tools/list` is clean. The client defaults to the plain 2025 `initialize` handshake, which is what Alexa+ expects, and runs in the browser with no polyfills.
- **What needs work:** There is no documented hook for observing raw JSON-RPC traffic. We tapped `transport.send` and wrapped `onmessage` inside `transport.start()`. Wrapping `onmessage` earlier causes infinite recursion, because the protocol layer chains to whatever handler is already installed. A supported message observer would help every debugging tool.
- **Onboarding:** The split into `server` and `client` packages wasn't obvious from older blog posts, which still show `@modelcontextprotocol/sdk`.
- **Would use again:** Yes.

## mcp-handler 2.x

- **Used for:** Serving the MCP server over Streamable HTTP from Hono on Lambda.
- **What worked:** One handler serves both the 2026 and 2025 protocol generations. It mounts cleanly in Hono via `c.req.raw`. It is stateless, so it suits Lambda.
- **What needs work:** It requires `Accept: application/json, text/event-stream` and answers single requests as SSE, and neither is shown in the README. See the friction log.
- **Onboarding:** About an hour, most of it spent on the Accept header.
- **Would use again:** Yes.

## Vercel AI SDK v7 with the Amazon Bedrock provider

- **Used for:** The simulator's model step: one `generateText` call with tools that have no `execute`, so tool calls come back to the browser.
- **What worked:** Tools without `execute` stop the loop and return `toolCalls` plus `responseMessages`, which is exactly the shape needed to run tools elsewhere. `jsonSchema()` accepts the MCP tool schemas directly. `toolChoice` forces the first call to `get_household`.
- **What needs work:** v7 renamed result fields (`responseMessages`), and most examples online are for v4 and v5.
- **Onboarding:** Reading the type definitions was faster than the docs.
- **Would use again:** Yes.

## Amazon Bedrock

- **Used for:** The host model (Nova 2 Lite).
- **What worked:** Cross-region inference profiles (`us.` and `global.`) are listed clearly by `ListInferenceProfiles`.
- **What needs work:** A new account's daily token quota for Nova models is 0, and the error looks like a temporary throttle. See the friction log.
- **Onboarding:** Blocked on the quota.
- **Would use again:** Yes, once the quota is raised.

## Amazon Polly

- **Used for:** The speaker's voice.
- **What worked:** `SynthesizeSpeech` with MP3 output streams straight into an `<audio>` element.
- **What needs work:** Engine availability differs by region and the voice filter fails silently. See the friction log.
- **Would use again:** Yes.

## Amazon DynamoDB

- **Used for:** All game state, in one table.
- **What worked:** `TransactWriteItems` with condition expressions makes every game action all-or-nothing, including moving points and a chore together. `CancellationReasons` says exactly which condition failed, which makes idempotency records easy.
- **What needs work:** Filter expressions can't reference key attributes, so we added a `type` attribute to every item. That limit is easy to miss.
- **Would use again:** Yes.

## AWS CDK

- **Used for:** All infrastructure.
- **What worked:** `NodejsFunction` bundled a pnpm workspace with TypeScript packages and no extra configuration.
- **What needs work:** Expired credentials surface as "Unable to resolve AWS account". See the friction log.
- **Would use again:** Yes.
