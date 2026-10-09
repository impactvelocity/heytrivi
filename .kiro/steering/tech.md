# Hey Trivi — Tech

## Ground rules

- TypeScript everywhere. Node.js 22. pnpm workspaces.
- One AWS region for everything: us-east-1.
- **Check before you code.** The MCP, Strands, and AgentCore libraries change quickly. Before using a package, read its current documentation and confirm the package name and API. If it differs from this plan, follow the documentation and record the change in `docs/decisions.md`.
- Never commit secrets. Use environment variables and `.env.example`.
- Ask before adding any AWS service that is not listed here.

## Stack

| Part | Choice |
|---|---|
| MCP server runtime | AWS Lambda behind a function URL |
| MCP server framework | Hono on Lambda, with mcp-handler 2.x and the MCP SDK v2 server package, zod 4 |
| MCP transport | Streamable HTTP, stateless, plain JSON responses |
| MCP version | Must accept initialize with protocolVersion: "2025-11-25" |
| Screen UI | MCP Apps (@modelcontextprotocol/ext-apps), one UI resource: ui://hey-trivi/scoreboard |
| Database | DynamoDB, one table, on-demand |
| Signup and login | Amazon Cognito user pool with managed login |
| Simulator | Next.js 15 (App Router) on AWS Amplify Hosting. Pin to 15. |
| Simulator model | Amazon Bedrock, Nova 2 Lite, through the AI SDK Bedrock provider |
| Simulator MCP client | The official MCP SDK client, used directly so every JSON-RPC message can be logged |
| Speech in | Browser speech recognition (Chrome), with a text box fallback |
| Speech out | Amazon Polly, neural voice, through a server route |
| Pack builder | Strands Agents TypeScript SDK on Bedrock AgentCore Runtime, Bedrock model |
| Infrastructure | AWS CDK in TypeScript |
| Tests | Vitest |

## Version fallback

If mcp-handler cannot answer a 2025-11-25 initialize request correctly, use the MCP SDK's Streamable HTTP server transport directly and say so at the next checkpoint. The protocol test in task 1.4 decides this.

## Performance budget

- Every MCP tool call returns in under 500 ms at the 95th percentile, measured at the function URL.
- At most two DynamoDB requests per tool call where possible.
- Lambda memory 1024 MB. Add a keep-warm ping for demo days.

## Tool result shape

Every tool returns all three:

- `structuredContent`: the data.
- `content`: one short text block with the same data in a sentence or two, for clients that only read text.
- `_meta.ui.resourceUri`: only on tools that show the scoreboard.

Errors a person can fix (unknown player name, no open round) return `isError: true` with a short message the host can say out loud.
