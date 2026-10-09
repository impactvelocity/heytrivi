/**
 * Hey Trivi — CDK stack
 *
 * Provisions:
 *   - DynamoDB table (single table, PK + SK, on-demand)
 *   - Lambda function (Node.js 22, 1024 MB, bundled with esbuild)
 *   - Function URL (no auth — the MCP server validates bearer tokens itself)
 *   - SSM parameter storing the function URL (for CI / tests)
 *
 *   - Cognito user pool with managed login: parent signup and sign-in, and
 *     the access tokens the MCP server accepts (R9, R11.1)
 *
 * The Amplify app itself is connected to the repo in the console; this stack
 * provides its compute role.
 */

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as path from "node:path";
import { createHash } from "node:crypto";
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
    // Cognito — parents sign up and sign in through managed login. The parent
    // page and MCP clients both get access tokens from this pool, and the MCP
    // server maps a token's sub to the household (USER#<sub>).
    // -------------------------------------------------------------------------
    const userPool = new cognito.UserPool(this, "ParentUserPool", {
      userPoolName: "hey-trivi-parents",
      // Managed login needs the Essentials plan or above.
      featurePlan: cognito.FeaturePlan.ESSENTIALS,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: { minLength: 8, requireLowercase: false, requireUppercase: false, requireDigits: false, requireSymbols: false },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Domain prefixes are global. Derive a stable one from the account so two
    // deployments don't collide, without putting the account id in the URL.
    const domainPrefix =
      process.env.COGNITO_DOMAIN_PREFIX ?? `hey-trivi-${createHash("sha256").update(this.account).digest("hex").slice(0, 8)}`;
    const loginDomain = userPool.addDomain("ParentLoginDomain", {
      cognitoDomain: { domainPrefix },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // The parent page (Amplify) and local development.
    const appUrl = (process.env.PARENT_APP_URL ?? "https://main.d2glgwm5yifu21.amplifyapp.com").replace(/\/$/, "");
    const webClient = userPool.addClient("ParentWebClient", {
      userPoolClientName: "parent-web",
      generateSecret: false,
      // Sign-in happens on managed login (authorization code + PKCE). Cognito's
      // default auth flows include ALLOW_REFRESH_TOKEN_AUTH for refreshing.
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [`${appUrl}/auth/callback`, "http://localhost:3000/auth/callback"],
        logoutUrls: [`${appUrl}/parent`, "http://localhost:3000/parent"],
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // Managed login shows an error page until the client has a style.
    new cognito.CfnManagedLoginBranding(this, "ParentLoginBranding", {
      userPoolId: userPool.userPoolId,
      clientId: webClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    // Alexa+ account linking: a second client whose callback URLs are Alexa's.
    // Alexa+ uses several region-specific redirect URLs that include your
    // Amazon vendor id; `alexa-ai configure-account-linking` prints the exact
    // list. Set ALEXA_REDIRECT_URIS (comma-separated) to that list, or set
    // ALEXA_VENDOR_ID to use the usual four. Without either, no client is made.
    // See docs/alexa-plus.md.
    const alexaRedirects = (process.env.ALEXA_REDIRECT_URIS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const vendorId = process.env.ALEXA_VENDOR_ID;
    if (!alexaRedirects.length && vendorId) {
      for (const host of ["alexa.amazon.com", "pitangui.amazon.com", "layla.amazon.com", "alexa.amazon.co.jp"]) {
        alexaRedirects.push(`https://${host}/api/skill/link/${vendorId}`);
      }
    }
    const alexaClient = alexaRedirects.length
      ? userPool.addClient("AlexaClient", {
          userPoolClientName: "alexa-plus",
          // Alexa+ asks for a client id and secret (masked CLI prompt, or the
          // ALEXA_CLIENT_SECRET variable for the CLI). PKCE is used as well.
          // ALEXA_PUBLIC_CLIENT=1 makes a public client instead.
          generateSecret: process.env.ALEXA_PUBLIC_CLIENT !== "1",
          oAuth: {
            flows: { authorizationCodeGrant: true },
            scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
            callbackUrls: alexaRedirects,
          },
          supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
          accessTokenValidity: cdk.Duration.hours(1),
          idTokenValidity: cdk.Duration.hours(1),
          // Alexa+ refreshes silently; when the refresh token expires the
          // customer has to link again, so make it long.
          refreshTokenValidity: cdk.Duration.days(365),
          preventUserExistenceErrors: true,
        })
      : undefined;
    if (alexaClient) {
      new cognito.CfnManagedLoginBranding(this, "AlexaLoginBranding", {
        userPoolId: userPool.userPoolId,
        clientId: alexaClient.userPoolClientId,
        useCognitoProvidedValues: true,
      });
    }

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
        // Cognito access tokens from these clients are accepted (R9.4).
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_IDS: alexaClient
          ? cdk.Fn.join(",", [webClient.userPoolClientId, alexaClient.userPoolClientId])
          : webClient.userPoolClientId,
        COGNITO_DOMAIN: loginDomain.baseUrl(),
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

    new cdk.CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "CognitoDomain", {
      value: loginDomain.baseUrl(),
      description: "Set as COGNITO_DOMAIN for the parent page",
    });
    new cdk.CfnOutput(this, "CognitoWebClientId", {
      value: webClient.userPoolClientId,
      description: "Set as COGNITO_CLIENT_ID for the parent page",
    });

    if (alexaClient) {
      new cdk.CfnOutput(this, "CognitoAlexaClientId", {
        value: alexaClient.userPoolClientId,
        description: "Give to: alexa-ai configure-account-linking --client-id",
      });
    }

    new cdk.CfnOutput(this, "DynamoTableName", {
      value: table.tableName,
      description: "DynamoDB table name",
      exportName: "HeyTriviDynamoTable",
    });
  }
}
