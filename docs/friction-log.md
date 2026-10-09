# Friction Log

Entries here count toward the hackathon score. Add one every time a tool, SDK, or document gets in the way.

---

### Protocol version mismatch in Alexa+ documentation

- Tool / doc: Alexa+ lifecycle page (developer.amazon.com)
- Task attempted: Implement MCP server with protocolVersion "2025-11-25" as required by hackathon rules
- Steps taken: Read the Alexa+ overview, hackathon rules, and the lifecycle / handshake sample page
- Expected: All three documents to agree on the protocol version
- Actual: The Alexa+ lifecycle page shows a sample handshake using protocolVersion "2025-03-26", while the Alexa+ overview and the hackathon rules both say "2025-11-25"
- Severity: major
- Workaround: Follow the hackathon rules (2025-11-25) and implement a version negotiation that also accepts older versions so the server is compatible with both
- Suggestion: Update the lifecycle page sample handshake to match the current required version, or add a note that the sample is illustrative and the required version is in the rules

---

### mcp-handler 2.x requires Accept header not mentioned in docs

- Tool / doc: mcp-handler 2.x README / npm page
- Task attempted: Write protocol tests that send raw JSON-RPC POST requests to the MCP endpoint
- Steps taken: Sent `Content-Type: application/json` POST with valid JSON-RPC body, got HTTP 406 with error "Client must accept both application/json and text/event-stream"
- Expected: The README quick-start shows bare `fetch` examples; no mention of a required Accept header
- Actual: Without `Accept: application/json, text/event-stream`, every request returns 406. The transport also responds with SSE (`event: message\ndata: {...}`) not plain JSON, which is not shown in the README examples
- Severity: major
- Workaround: Add `Accept: application/json, text/event-stream` to every request and parse the SSE `data:` line to extract the JSON-RPC response
- Suggestion: Add a plain-HTTP / curl example to the README showing the required Accept header and the SSE response format. This is an invisible failure mode for any test or client that uses fetch without it


---

### CDK reports "Unable to resolve AWS account" when credentials have expired

- Tool / doc: AWS CDK CLI 2.1145.0 (`cdk diff`, `cdk deploy`)
- Task attempted: Deploy the MCP server stack (task 1.5)
- Steps taken: Ran `cdk diff` after the session's AWS login had expired
- Expected: An error saying the credentials are expired, with a hint to sign in again
- Actual: `Unable to resolve AWS account to use. It must be either configured when you define your CDK Stack, or through the environment`, after bundling succeeded. The message points at stack configuration, not at credentials
- Severity: minor
- Workaround: Sign in again (`aws login`) and re-run
- Suggestion: When the default credential chain finds a profile but the credentials are expired, say so directly and name the profile

---

### Bedrock reports a zero daily token quota as "please wait"

- Tool / doc: Amazon Bedrock Runtime (Converse), Service Quotas
- Task attempted: Call Nova 2 Lite from the simulator's model route (task 3.3)
- Steps taken: Called Converse with `us.amazon.nova-2-lite-v1:0` in us-east-2, then Nova Lite, Nova Micro, and the global Nova 2 Lite profile
- Expected: A successful call, or an error saying the account has no quota for the model
- Actual: `ThrottlingException: Too many tokens per day, please wait before trying again.` on the very first call. Service Quotas shows "Model invocation max tokens per day for Amazon Nova 2 Lite" = 0. Waiting never helps
- Severity: blocker
- Workaround: Built and tested the simulator in mock mode; requested a quota increase. The quotas are marked "not adjustable", so Service Quotas can't raise them. Other entrants with new accounts report the same block (Devpost forum topics 45416 and 45474, one showing `ValidationException: Access to Bedrock models is not allowed for this account`), and the organizers can't escalate it. The simulator now calls the same Nova 2 Lite model through the Vercel AI Gateway by default; direct Bedrock stays behind `MODEL_PROVIDER=bedrock`
- Suggestion: When the applied quota is 0, say so ("This account has no daily token quota for this model. Request an increase in Service Quotas.") instead of a retryable throttling message

---

### Polly neural voices are missing in us-east-2, and the voice filter fails silently

- Tool / doc: Amazon Polly (DescribeVoices, SynthesizeSpeech)
- Task attempted: Speak the host's replies with a neural voice (task 3.4)
- Steps taken: `DescribeVoices` with `Engine=neural, LanguageCode=en-US`, then `SynthesizeSpeech` with `Engine=neural`
- Expected: The list of neural voices, or an error saying the engine isn't offered in this region
- Actual: `DescribeVoices` returned an empty list with no error. `SynthesizeSpeech` then failed with "The selected engine is not supported in this region." Only by listing all voices did it become clear that every en-US voice in us-east-2 supports `standard` only
- Severity: major
- Workaround: Use the standard engine, with the browser's voice as a fallback
- Suggestion: Return an error from `DescribeVoices` when the requested engine isn't available in the region, and make the region table for engines easy to find from the API reference

### `pnpm --filter infra deploy` runs pnpm's own deploy command
- Tool / doc: pnpm 9 (workspaces)
- Task attempted: Run the `infra` package's `deploy` script (`cdk deploy`) from the root with `pnpm infra:deploy`.
- Steps taken: The root script was `pnpm --filter infra deploy`.
- Expected: pnpm runs the package's `deploy` script, as it does for other script names like `test` or `build`.
- Actual: `ERR_PNPM_INVALID_DEPLOY_TARGET This command requires one parameter`. `deploy` is a built-in pnpm command, so the script never ran, and the root script still exited 0.
- Severity: minor
- Workaround: `pnpm --filter infra run deploy` (also used for `destroy`).
- Suggestion: Warn when a package script shares a name with a built-in command, or fail the parent script with a non-zero exit.

### Alexa+ MCP docs disagree on account linking details
- Tool / doc: Alexa+ MCP QuickStart and Account Linking for MCP Add-ons (developer.amazon.com)
- Task attempted: Write the account linking setup for Hey Trivi without access to Alexa+.
- Steps taken: Read the QuickStart, the account linking page, the client lifecycle page, and "Choose the Proper Alexa+ Integration Approach".
- Expected: One answer for each requirement.
- Actual: The account linking page calls the client secret optional in one place and lists it as the developer's to provide in another, while its sample token request sends only `client_id`. Only one of Alexa's several redirect URLs is shown ("the CLI output provides the list"). The QuickStart says `alexa-ai new` sets `accountLinking.enabled: true`, but the published `addon.json` example has no `accountLinking` key. The lifecycle page shows Alexa+ sending `protocolVersion: "2025-03-26"` while the overview says 2025-11-25. The testing and lifecycle links on the integration-approach page go to `/en-US/docs/alexa/add-ons/...` URLs that return 404; the working pages are under `/docs/alexaplus/add-ons/`.
- Severity: minor
- Workaround: Support both (a confidential client by default, `ALEXA_PUBLIC_CLIENT=1` for a public one), take redirect URLs from configuration, accept both protocol versions, and document the open questions in docs/alexa-plus.md.
- Suggestion: List every regional redirect URL on the page, state the token endpoint's client authentication method, and show `accountLinking` in the full `addon.json` example.
