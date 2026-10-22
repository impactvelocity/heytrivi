/**
 * Development tokens on a deployed server. The demo seed's default token is
 * printed in the repo, so once a deploy sets its own DEV_TOKEN the default
 * must stop working, even though its TOKEN# item is still in the table.
 */

import { MemoryItemStore, Repo, seedDemo } from "@hey-trivi/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { householdForRequest } from "../auth.js";
import { setRepo } from "../context.js";

const req = (token: string) => new Request("http://localhost/mcp", { headers: { authorization: `Bearer ${token}` } });
const saved = { table: process.env.DYNAMODB_TABLE, dev: process.env.DEV_TOKEN };

beforeEach(async () => {
  const repo = new Repo(new MemoryItemStore());
  await seedDemo(repo, { devToken: "dev-token-demo" });
  await repo.addDevToken("own-secret-token", "demo");
  setRepo(repo);
});

afterEach(() => {
  for (const [key, value] of [["DYNAMODB_TABLE", saved.table], ["DEV_TOKEN", saved.dev]] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("development tokens", () => {
  it("accepts the default demo token locally", async () => {
    delete process.env.DYNAMODB_TABLE;
    expect(await householdForRequest(req("dev-token-demo"))).toBe("demo");
  });

  it("keeps accepting it on a deploy that still uses the default", async () => {
    process.env.DYNAMODB_TABLE = "table";
    process.env.DEV_TOKEN = "dev-token-demo";
    expect(await householdForRequest(req("dev-token-demo"))).toBe("demo");
  });

  it("refuses it once a deploy has its own DEV_TOKEN, and accepts that one", async () => {
    process.env.DYNAMODB_TABLE = "table";
    process.env.DEV_TOKEN = "own-secret-token";
    expect(await householdForRequest(req("dev-token-demo"))).toBeUndefined();
    expect(await householdForRequest(req("own-secret-token"))).toBe("demo");
  });
});
