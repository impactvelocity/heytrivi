# Hey Trivi — Hackathon Rules

## What the submission must contain

- A GitHub repo with all source, assets, and clear setup and run instructions in the README.
- The repo must import and call MCP at runtime. A mention in the README is not enough.
- MCP server on spec version 2025-11-25 or later, over Streamable HTTP.
- A locally runnable path. Judges may download and run it themselves.
- An MIT LICENSE file at the repo root.
- A demo video under three minutes showing the project working.
- Product feedback for every tool, API, and SDK used.
- No third-party trademarks or copyrighted music, images, or text in any asset.

## Keep these documents current as you work

**docs/friction-log.md.** Friction log entries can add up to 10% to the score. Every time a tool, SDK, or document gets in the way, add an entry in this format:

```
### <short title>
- Tool / doc:
- Task attempted:
- Steps taken:
- Expected:
- Actual:
- Severity: blocker | major | minor
- Workaround:
- Suggestion:
```

Known entry to add first: the Alexa+ lifecycle page shows a sample handshake with protocol version 2025-03-26, while the Alexa+ overview and the hackathon rules say 2025-11-25.

**docs/product-feedback.md.** For each tool: what it was used for, what worked, what needs work, how onboarding went, and whether we would use it again.

**docs/aws-integrations.md.** One row per AWS service: what it does here and the file paths that use it. This is the evidence for the AWS Builder mini challenge.

## What the judges reward

- **Alexa+ track:** state kept across sessions, agentic workflows, cards and visuals, MCP Apps. A single-turn Q&A bot is rated "obvious."
- **AWS Builder:** a multi-service pipeline and agent orchestration. A single Bedrock call is rated "obvious."
