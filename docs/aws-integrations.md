# AWS Integrations

Evidence for the AWS Builder mini challenge. One row per AWS service.

| Service | What it does in Hey Trivi | Key file paths |
|---|---|---|
| AWS Lambda (Node.js 22, ARM64) | Runs the MCP server — handles all JSON-RPC requests from Alexa+ and the simulator. Exposed via a function URL (no API Gateway needed). | `services/mcp-server/src/lambda.ts`, `infra/lib/hey-trivi-stack.ts` |
| Lambda Function URL | Provides the HTTPS endpoint for the MCP server without API Gateway overhead. Auth type NONE so any MCP client connects; bearer-token validation is in the server code. | `infra/lib/hey-trivi-stack.ts` |
| Amazon DynamoDB (on-demand) | Single-table design storing households, players, rounds, chores, ledger, packs, and news. PK + SK composite key. | `infra/lib/hey-trivi-stack.ts`, `packages/store/` |
| AWS SSM Parameter Store | Stores the function URL at `/hey-trivi/mcp-function-url` so the simulator and CI can read it without hard-coding. | `infra/lib/hey-trivi-stack.ts` |
| AWS IAM | Grants the Lambda execution role least-privilege DynamoDB read/write on the single table. | `infra/lib/hey-trivi-stack.ts` (via `table.grantReadWriteData`) |

| AWS CloudFormation (via AWS CDK) | Provisions and tears down every resource in one stack (`HeyTrivi`, us-east-2). | `infra/bin/hey-trivi.ts`, `infra/lib/hey-trivi-stack.ts` |
| Amazon S3 / ECR (CDK bootstrap) | CDK's bootstrap stack stores the bundled Lambda code for deployment. | `infra/cdk.json` |

| Amazon Bedrock (Nova 2 Lite, via the AI SDK Bedrock provider) | The simulator's host model: decides verdicts, picks MCP tools, and writes what the speaker says. Tools are passed from the browser's MCP client. Selected with `MODEL_PROVIDER=bedrock`; the default is the same Nova 2 Lite model through the Vercel AI Gateway, because this account's Bedrock quota is 0 (see decisions #16). | `apps/simulator/app/api/model/route.ts`, `apps/simulator/lib/host.ts`, `apps/simulator/lib/host-prompt.ts` |
| Amazon Polly (standard engine) | The speaker's voice. | `apps/simulator/app/api/speak/route.ts`, `apps/simulator/lib/speech.ts` |

| AWS Amplify Hosting | Hosts the simulator (Next.js SSR) from the GitHub repo. Its SSR compute role grants the API routes access to Bedrock and Polly. | `amplify.yml`, `.npmrc`, `infra/lib/hey-trivi-stack.ts` (compute role) |

<!-- Add rows as services are wired up. -->
