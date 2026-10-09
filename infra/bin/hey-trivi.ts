#!/usr/bin/env node
/**
 * Hey Trivi — CDK app entry point
 *
 * Pinned to us-east-1 per tech.md.
 * Account is read from the AWS environment so the same code works across
 * developer machines and CI without hard-coding account IDs.
 */

import * as cdk from "aws-cdk-lib";
import { HeyTriviStack } from "../lib/hey-trivi-stack";

const app = new cdk.App();

new HeyTriviStack(app, "HeyTrivi", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-2",
  },
  description: "Hey Trivi — MCP trivia game server (hackathon submission)",
});
