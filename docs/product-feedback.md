# Product Feedback

For each tool, SDK, and API used: what it was used for, what worked, what needs work, how onboarding went, and whether we would use it again.

## AWS services used, and how (AWS Builder mini challenge)

- **AWS Lambda** runs the MCP server (Node 22, ARM64). A **function URL** is its Streamable HTTP endpoint, with no API Gateway.
- **Amazon DynamoDB** holds all game state in one on-demand table. Every game action is one `TransactWriteItems` call.
- **Amazon Cognito** signs parents up and in (managed login), and its access tokens are the bearer tokens the MCP server checks, including for Alexa+ account linking.
- **Amazon Bedrock** is the direct path to Amazon Nova 2 Lite, the simulator's host model. It's behind `MODEL_PROVIDER=bedrock` because this account's Nova quota is 0; the same model runs through the Vercel AI Gateway by default.
- **Amazon Polly** is Trivi's voice.
- **AWS Amplify Hosting** serves the Next.js app (simulator, parent page, landing page) with an SSR compute role.
- **AWS CDK / CloudFormation** creates every resource in one stack, and one command removes it.
- **Systems Manager Parameter Store** holds the MCP server's URL for the apps and tests.
- **AWS IAM** gives each piece only what it needs: Lambda gets the one table, and the web app gets Nova 2 Lite and Polly.

File paths for each are in [aws-integrations.md](aws-integrations.md).

---

## MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, `@modelcontextprotocol/client`)

- **Used for:** The MCP server's tool registration and results, and the simulator's MCP client in the browser.
- **What worked:** `registerTool` with zod 4 schemas is concise, and the JSON Schema it publishes in `tools/list` is clean. The client defaults to the plain 2025 `initialize` handshake, which is what Alexa+ expects, and runs in the browser with no polyfills.
- **What needs work:** There is no documented hook for observing raw JSON-RPC traffic. We tapped `transport.send` and wrapped `onmessage` inside `transport.start()`. Wrapping `onmessage` earlier causes infinite recursion, because the protocol layer chains to whatever handler is already installed. A supported message observer would help every debugging tool.
- **Onboarding:** The split into `server` and `client` packages wasn't obvious from older blog posts, which still show `@modelcontextprotocol/sdk`.
- **Would use again:** Yes. The same SDK gave us both ends of the protocol, so the simulator and the server can't disagree about the wire format.

## mcp-handler 2.x

- **Used for:** Serving the MCP server over Streamable HTTP from Hono on Lambda.
- **What worked:** One handler serves both the 2026 and 2025 protocol generations. It mounts cleanly in Hono via `c.req.raw`. It is stateless, so it suits Lambda.
- **What needs work:** It requires `Accept: application/json, text/event-stream` and answers single requests as SSE, and neither is shown in the README. See the friction log.
- **Onboarding:** About an hour, most of it spent on the Accept header.
- **Would use again:** Yes. Once the Accept header was known, it was the least code of any way to serve Streamable HTTP from a stateless function.

## Hono

- **Used for:** The MCP server's HTTP app: `/mcp`, the OAuth discovery documents, and the parent API at `/parent/*`, running both on Lambda and locally on Node.
- **What worked:** The same app runs under the Lambda adapter and a local Node server, so local mode and the deployed server share every route. Handing `c.req.raw` to mcp-handler needed no glue.
- **What needs work:** Nothing blocked us.
- **Onboarding:** Quick; the Lambda adapter is one import.
- **Would use again:** Yes. It's small, typed, and runtime-agnostic.

## AWS Lambda and function URLs

- **Used for:** Running the MCP server (Node 22, ARM64). The function URL is the Streamable HTTP endpoint Alexa+ and the simulator call.
- **What worked:** A function URL removed API Gateway entirely: one HTTPS endpoint, no stage or route configuration. Warm calls are fast; the slowest tool's p95 is 125 ms over 50 calls. `aws-jwt-verify` caches the Cognito JWKS across warm invocations.
- **What needs work:** Nothing in Lambda itself. An organization SCP on our account denies Lambda and CloudFormation in us-east-1 and us-west-2, so everything runs in us-east-2.
- **Onboarding:** CDK's `NodejsFunction` bundled the TypeScript workspace with no extra configuration, so the first deploy was short.
- **Would use again:** Yes. Pay-per-request suits an MCP server that's idle between family game nights.

## Amazon Cognito

- **Used for:** Parent sign-up and sign-in (managed login, Essentials plan, authorization code with PKCE), and the bearer tokens the MCP server accepts. A separate app client for Alexa+ account linking is created once Alexa's redirect URLs are known.
- **What worked:** Managed login with branding gave us a hosted sign-in page with no UI code. Cognito supports the `resource` parameter (RFC 8707) and puts it in the access token's `aud`, which is what Alexa+ account linking needs.
- **What needs work:** Access tokens carry no `aud` when `resource` isn't sent, so the client id has to stand in as the audience check. That's easy to miss when following generic JWT guidance.
- **Onboarding:** The CDK constructs cover the user pool, clients, domain, and managed login branding.
- **Would use again:** Yes. One user pool serves the parent page and Alexa+ linking, and the server checks both with one library.

## Vercel AI SDK v7 with the Amazon Bedrock provider

- **Used for:** The simulator's model step: one `generateText` call with tools that have no `execute`, so tool calls come back to the browser.
- **What worked:** Tools without `execute` stop the loop and return `toolCalls` plus `responseMessages`, which is exactly the shape needed to run tools elsewhere. `jsonSchema()` accepts the MCP tool schemas directly. `toolChoice` forces the first call to `get_household`.
- **What needs work:** v7 renamed result fields (`responseMessages`), and most examples online are for v4 and v5. Structured output that hits the token limit fails with "No output generated" instead of naming the limit. See the friction log.
- **Onboarding:** Reading the type definitions was faster than the docs.
- **Would use again:** Yes. Switching between Bedrock and the gateway is one line, and the prompt and tools don't change.

## Amazon Bedrock

- **Used for:** The host model (Nova 2 Lite), as the direct path behind `MODEL_PROVIDER=bedrock`.
- **What worked:** Cross-region inference profiles (`us.` and `global.`) are listed clearly by `ListInferenceProfiles`. The IAM policy can be scoped to the one model.
- **What needs work:** A new account's daily token quota for Nova models is 0 and marked not adjustable, and the error looks like a temporary throttle. See the friction log.
- **Onboarding:** Blocked on the quota. The code path is verified up to Bedrock's quota check.
- **Would use again:** Yes, once the quota is raised. It keeps model calls inside the same AWS account and IAM roles as everything else.

## Amazon Nova 2 Lite

- **Used for:** The simulator's host: hearing everyone's guesses, judging them, picking MCP tools, and writing what Trivi says.
- **What worked:** It sorts a whole table's answers out of one sentence, judges each guess, and picks the right tool.
- **What needs work:** Mid-game it sometimes wrote its reasoning, including the answer key, into the reply text. With `toolChoice: "required"` it still answered in plain text about one step in ten. See the friction log.
- **Onboarding:** Prompting was straightforward; the two issues above only showed up in full games.
- **Would use again:** Yes, for the host. The `say` tool and the retry make it reliable.

## Vercel AI Gateway

- **Used for:** The default route to the host model (`amazon/nova-2-lite`) while this account's Bedrock quota is 0, and to Claude Haiku 5.5 and Claude Sonnet 5.5 for the theme helper.
- **What worked:** The `gateway` provider ships inside the `ai` package, so switching was one model line. The same Nova model is offered, so the prompt and tools didn't change.
- **What needs work:** "Any tool" tool choice for Nova isn't always honored through the gateway (about one step in ten comes back as text), and the error doesn't say whether the model or the route ignored it. See the friction log.
- **Onboarding:** One API key.
- **Would use again:** Yes. It unblocked the project when Bedrock couldn't.

## Claude Haiku 5.5 and Claude Sonnet 5.5

- **Used for:** The theme helper on the parent page and Ask Trivi in the settings drawer. Haiku writes questions and riddles and answers them blind; Sonnet checks the facts.
- **What worked:** Sonnet's fact-check caught real mistakes, like a draft saying T. rex walked on four legs and an outdated Stegosaurus brain size. Splitting the job into write, then check kept each call under about 20 seconds.
- **What needs work:** Long packs need a higher output-token limit, and running out shows up as "No output generated" from the AI SDK, not as a limit.
- **Onboarding:** Same gateway key and AI SDK calls as the host model.
- **Would use again:** Yes. A parent reviews every draft anyway, and a separate fact-check means they review fewer mistakes.

## Amazon Polly

- **Used for:** The speaker's voice.
- **What worked:** `SynthesizeSpeech` with MP3 output streams straight into an `<audio>` element.
- **What needs work:** Engine availability differs by region and the voice filter fails silently. See the friction log.
- **Onboarding:** The standard engine worked on the first call; finding out that us-east-2 has no neural voices took longer.
- **Would use again:** Yes. It's one API call per line, and the browser voice covers the gaps.

## Amazon DynamoDB

- **Used for:** All game state, in one table.
- **What worked:** `TransactWriteItems` with condition expressions makes every game action all-or-nothing, including moving points and a chore together. `CancellationReasons` says exactly which condition failed, which makes idempotency records easy.
- **What needs work:** Filter expressions can't reference key attributes, so we added a `type` attribute to every item. That limit is easy to miss.
- **Onboarding:** The single-table layout and transactions came together quickly; the filter limit was the one surprise.
- **Would use again:** Yes. Transactions are what keep the score honest under retries.

## AWS CDK

- **Used for:** All infrastructure.
- **What worked:** `NodejsFunction` bundled a pnpm workspace with TypeScript packages and no extra configuration.
- **What needs work:** Expired credentials surface as "Unable to resolve AWS account". See the friction log.
- **Onboarding:** Bootstrap and the first deploy were short; expired credentials were the only recurring snag.
- **Would use again:** Yes. One stack to deploy and one command to tear down made it cheap to spin resources up only when testing.

## AWS Amplify Hosting

- **Used for:** Hosting the Next.js app (simulator, parent page, landing page) from the GitHub repo, with an SSR compute role for Bedrock and Polly.
- **What worked:** Builds on every push, and the SSR compute role means no AWS keys in environment variables.
- **What needs work:** pnpm workspaces need `node-linker=hoisted` in `.npmrc`. The compute role is attached to the app after it's created from the repo, outside the CDK deploy.
- **Onboarding:** Connecting the repo was quick; the pnpm linker setting was the one snag.
- **Would use again:** Yes. Next.js SSR with an IAM role and no servers to manage.

## Systems Manager Parameter Store and AWS IAM

- **Used for:** Parameter Store holds the MCP server's function URL, so the apps and tests read it instead of hard-coding it. IAM gives Lambda read/write on one table and the web app access to Nova 2 Lite and Polly only.
- **What worked:** CDK writes the parameter and the grants in the same stack as the resources they describe, so they can't drift.
- **What needs work:** Nothing blocked us.
- **Onboarding:** Both are a few lines of CDK.
- **Would use again:** Yes.

## Next.js 15

- **Used for:** The simulator, the parent page, the landing page, and the API routes that call the model and Polly.
- **What worked:** API routes keep model keys and AWS calls on the server while the MCP client runs in the browser.
- **What needs work:** Nothing blocked us.
- **Onboarding:** Familiar.
- **Would use again:** Yes.

## Vitest

- **Used for:** All 117 tests: game rules, store, MCP protocol and tools, and the simulator.
- **What worked:** Fast, TypeScript with no setup, and the same tests run against the in-memory store or a real DynamoDB table.
- **What needs work:** Nothing blocked us.
- **Onboarding:** Familiar.
- **Would use again:** Yes.
