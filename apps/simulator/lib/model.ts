/**
 * The language model, for the host (app/api/model) and the pack helper
 * (app/api/pack-draft). Server side only.
 *
 * Two providers, both through the AI SDK:
 * - "gateway" (default): Vercel AI Gateway, model `amazon/nova-2-lite`. Same
 *   Nova 2 Lite model, served from the gateway's own Bedrock access.
 * - "bedrock": Amazon Bedrock directly, from this AWS account.
 *
 * Why the gateway is the default: this account's Bedrock daily token quota is
 * 0 for every Nova model and marked "not adjustable", so every direct call
 * fails with ThrottlingException ("Too many tokens per day"). Other hackathon
 * entrants with new accounts hit the same block, and the organizers can't
 * escalate it. The Bedrock path is kept, complete and IAM-scoped
 * (infra/lib/hey-trivi-stack.ts), so MODEL_PROVIDER=bedrock works as soon as
 * the account has quota. See docs/decisions.md #16 and docs/friction-log.md.
 */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { gateway, type LanguageModel } from "ai";

export const PROVIDER = process.env.MODEL_PROVIDER === "bedrock" ? "bedrock" : "gateway";

/** A model by id, on the configured provider. Defaults to the host model. */
export function languageModel(ids: { gateway?: string; bedrock?: string } = {}): LanguageModel {
  if (PROVIDER === "bedrock") {
    const bedrock = createAmazonBedrock({
      region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "us-east-2",
      credentialProvider: fromNodeProviderChain(),
    });
    return bedrock(ids.bedrock ?? process.env.BEDROCK_MODEL_ID ?? "us.amazon.nova-2-lite-v1:0");
  }
  // Reads AI_GATEWAY_API_KEY (or the Vercel OIDC token when deployed on Vercel).
  return gateway(ids.gateway ?? process.env.GATEWAY_MODEL_ID ?? "amazon/nova-2-lite");
}

/** A friendly message for a failed model call. */
export function modelErrorMessage(err: unknown): string {
  const e = err as Error;
  const throttled = PROVIDER === "bedrock" && /too many tokens|throttl/i.test(e.message);
  return throttled
    ? "Bedrock is refusing requests: the account's daily token quota is used up or zero. Set MODEL_PROVIDER=gateway to use the AI Gateway."
    : `Model error: ${e.message}`;
}
