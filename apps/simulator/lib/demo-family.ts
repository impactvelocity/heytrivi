/**
 * The parent page's demo with DEMO=1: the Jones family, with two weeks of
 * play, built in this app from the same store and seed the game server uses.
 * Nothing here reaches the game server. Reads answer from the built family;
 * saves answer as if they worked and change nothing, so no visitor can leave
 * anything behind for the next one.
 */

import { DEMO_HOUSEHOLD_ID, MemoryItemStore, Repo, packDetail, parentDashboard, seedDemo } from "@hey-trivi/store";

/** Build the family again after this long, so "yesterday" stays yesterday. */
const FRESH_MS = 6 * 60 * 60_000;

let built: { repo: Promise<Repo>; at: number } | undefined;

function demoRepo(): Promise<Repo> {
  if (!built || Date.now() - built.at > FRESH_MS) {
    const repo = (async () => {
      const r = new Repo(new MemoryItemStore());
      await seedDemo(r, { history: true });
      return r;
    })();
    built = { repo, at: Date.now() };
  }
  return built.repo;
}

const PACK = /^packs\/([^/]+)/;

/** Answer a parent API call (`path` after /api/parent/) from the built family. */
export async function demoParentApi(method: string, path: string): Promise<Response> {
  const repo = await demoRepo();
  const hh = DEMO_HOUSEHOLD_ID;
  if (path === "session") return Response.json({ ok: true });
  const dashboard = async () => {
    const d = await parentDashboard(repo, hh);
    return { ...d, household: { ...d.household, readOnly: true } };
  };
  const packId = path.match(PACK)?.[1];
  const pack = packId && (await repo.getPack(hh, packId)) ? await packDetail(repo, hh, packId) : undefined;

  if (method === "GET") {
    if (path === "me") return Response.json(await dashboard());
    if (pack) return Response.json({ pack });
    return Response.json({ error: "That theme doesn't exist." }, { status: 400 });
  }
  // A save: the page shows its usual message, and the family stays as it was.
  return Response.json(pack && method !== "DELETE" ? { ...(await dashboard()), pack } : await dashboard());
}
