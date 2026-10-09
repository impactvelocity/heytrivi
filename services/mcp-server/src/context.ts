/**
 * Per-request context: which household this request belongs to.
 *
 * The auth middleware resolves the bearer token to a household and runs the
 * MCP handler inside this AsyncLocalStorage, so tools never see a household
 * other than the caller's (R9.6).
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { MemoryItemStore, Repo, seedDemo, DEMO_DEV_TOKEN, type ItemStore } from "@hey-trivi/store";
import { DynamoItemStore } from "@hey-trivi/store/dynamo";

export interface RequestContext {
  householdId: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function currentHousehold(): string {
  const ctx = als.getStore();
  if (!ctx) throw new Error("No household for this request");
  return ctx.householdId;
}

let repoPromise: Promise<Repo> | undefined;

/**
 * The repository. With DYNAMODB_TABLE set it uses DynamoDB; otherwise an
 * in-memory store seeded with the demo family, so a fresh clone runs with no
 * AWS account (R12.1).
 */
export function getRepo(): Promise<Repo> {
  repoPromise ??= (async () => {
    const table = process.env.DYNAMODB_TABLE;
    const db: ItemStore = table ? new DynamoItemStore(table) : new MemoryItemStore();
    const repo = new Repo(db);
    if (!table || process.env.SEED_DEMO === "1") {
      await seedDemo(repo, { devToken: process.env.DEV_TOKEN || DEMO_DEV_TOKEN });
      // A second copy of the demo family for the latency test, so it never
      // disturbs the real demo household.
      await seedDemo(repo, { householdId: "bench", devToken: "dev-token-bench" });
    }
    return repo;
  })();
  return repoPromise;
}

/** For tests: swap in a fresh repo. */
export function setRepo(repo: Repo): void {
  repoPromise = Promise.resolve(repo);
}
