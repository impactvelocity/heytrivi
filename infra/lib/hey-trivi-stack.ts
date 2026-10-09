/**
 * Hey Trivi — CDK stack
 *
 * Provisions:
 *   - DynamoDB table (single table, PK + SK, on-demand)
 *   - Lambda function (Node.js 22, 1024 MB, bundled with esbuild)
 *   - Function URL (no auth — the MCP server validates bearer tokens itself)
 *   - SSM parameter storing the function URL (for CI / tests)
 *
 * Milestone 0 ships only the Lambda + table.  Auth (Cognito), the pack worker,
 * and the Amplify app are added in later milestones.
 */

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as path from "node:path";
import { Construct } from "constructs";

export class HeyTriviStack extends cdk.Stack {
  /** The function URL — exported so other stacks / tests can reference it. */
  public readonly mcpFunctionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -------------------------------------------------------------------------
    // DynamoDB — one table, partition key PK, sort key SK.
    // Design: HH#<id> / META | PLAYER#<id> | ROUND#<time>#<id> | etc.
    // -------------------------------------------------------------------------
    const table = new dynamodb.Table(this, "HeyTriviTable", {
      tableName: "hey-trivi",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // pnpm infra:destroy removes everything the project created (R12.4).
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // -------------------------------------------------------------------------
    // Lambda — bundles services/mcp-server/src/lambda.ts with esbuild.
    // The handler file re-exports the Hono app wrapped in @hono/aws-lambda.
    // -------------------------------------------------------------------------
    const mcpFn = new NodejsFunction(this, "McpFunction", {
      functionName: "hey-trivi-mcp",
      // Resolved relative to this file so CDK finds the handler regardless of
      // the working directory cdk synth is run from.
      entry: path.resolve(
        __dirname,
        "../../services/mcp-server/src/lambda.ts",
      ),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(29), // Lambda max for function URLs
      environment: {
        DYNAMODB_TABLE: table.tableName,
        NODE_ENV: "production",
        // Seed the demo family and the latency-test household on first start.
        SEED_DEMO: "1",
        // Development token for the demo household until account linking
        // (milestone 5). Override with DEV_TOKEN at deploy time.
        DEV_TOKEN: process.env.DEV_TOKEN ?? "dev-token-demo",
      },
      bundling: {
        // Target Node 22 — keeps modern JS features without transpiling them.
        target: "node22",
        // Minify for smaller cold-start package size.
        minify: true,
        // Source maps for CloudWatch stack traces.
        sourceMap: true,
        // mcp-handler ships ESM; bundle it in rather than marking external.
        externalModules: [
          // Only truly Lambda-native packages go here.
          // aws-sdk v3 is available on the Lambda runtime in Node 22.
          "@aws-sdk/*",
        ],
      },
    });

    // Grant the Lambda read/write access to the table.
    table.grantReadWriteData(mcpFn);

    // -------------------------------------------------------------------------
    // Function URL — NONE auth so MCP clients connect directly.
    // The MCP server validates bearer tokens itself (R9.1).
    // CORS is open during development; tighten for production.
    // -------------------------------------------------------------------------
    this.mcpFunctionUrl = mcpFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.POST, lambda.HttpMethod.GET, lambda.HttpMethod.DELETE],
        // Browsers don't count Authorization under "*", so list headers explicitly.
        allowedHeaders: ["authorization", "content-type", "accept", "mcp-protocol-version", "mcp-session-id", "last-event-id"],
        exposedHeaders: ["mcp-session-id", "mcp-protocol-version"],
        maxAge: cdk.Duration.hours(24),
      },
      invokeMode: lambda.InvokeMode.BUFFERED,
    });

    // -------------------------------------------------------------------------
    // Keep-warm rule — fires every 5 minutes on demo days to avoid cold starts.
    // Disabled by default; enable with CDK_KEEP_WARM=1.
    // -------------------------------------------------------------------------
    if (process.env.CDK_KEEP_WARM === "1") {
      const events = require("aws-cdk-lib/aws-events");
      const targets = require("aws-cdk-lib/aws-events-targets");
      new events.Rule(this, "KeepWarm", {
        schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
        targets: [
          new targets.LambdaFunction(mcpFn, {
            event: events.RuleTargetInput.fromObject({ source: "keep-warm" }),
          }),
        ],
      });
      mcpFn.grantInvoke(
        new cdk.aws_iam.ServicePrincipal("events.amazonaws.com"),
      );
    }

    // -------------------------------------------------------------------------
    // SSM parameter — lets the simulator and CI read the function URL without
    // hard-coding it in environment files.
    // -------------------------------------------------------------------------
    new ssm.StringParameter(this, "McpFunctionUrlParam", {
      parameterName: "/hey-trivi/mcp-function-url",
      stringValue: this.mcpFunctionUrl.url,
      description: "Hey Trivi MCP server function URL",
    });

    // -------------------------------------------------------------------------
    // Simulator compute role — Amplify Hosting runs the simulator's API routes
    // (the model step and speech) with this role, so no keys are stored.
    // Only Nova 2 Lite and Polly speech are allowed.
    // -------------------------------------------------------------------------
    const simulatorRole = new iam.Role(this, "SimulatorComputeRole", {
      roleName: "hey-trivi-simulator-compute",
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
      description: "Amplify SSR compute role for the Hey Trivi simulator",
    });
    simulatorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          "arn:aws:bedrock:*::foundation-model/amazon.nova-2-lite-v1:0",
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-2-lite-v1:0`,
        ],
      }),
    );
    simulatorRole.addToPolicy(new iam.PolicyStatement({ actions: ["polly:SynthesizeSpeech"], resources: ["*"] }));

    // -------------------------------------------------------------------------
    // Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, "McpFunctionUrl", {
      value: this.mcpFunctionUrl.url,
      description: "MCP server endpoint — use this as TEST_MCP_URL",
      exportName: "HeyTriviMcpFunctionUrl",
    });

    new cdk.CfnOutput(this, "SimulatorComputeRoleArn", {
      value: simulatorRole.roleArn,
      description: "Attach to the Amplify app as its SSR compute role",
    });

    new cdk.CfnOutput(this, "DynamoTableName", {
      value: table.tableName,
      description: "DynamoDB table name",
      exportName: "HeyTriviDynamoTable",
    });
  }
}
