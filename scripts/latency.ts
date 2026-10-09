/**
 * Latency test — task 2.13 (R1.5).
 *
 * Calls each tool 50 times against an MCP endpoint and reports the 95th
 * percentile. Uses the "bench" household (token dev-token-bench) so the demo
 * family's scores are untouched.
 *
 *   pnpm latency https://<function-url>/mcp
 */

const url = process.argv[2] ?? process.env.MCP_SERVER_URL ?? "http://localhost:4787/mcp";
const token = process.env.BENCH_TOKEN ?? "dev-token-bench";
const N = Number(process.env.N ?? 50);

const headers = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  "mcp-protocol-version": "2025-11-25",
  authorization: `Bearer ${token}`,
};

let id = 0;
async function call(name: string, args: Record<string, unknown>): Promise<{ ms: number; isError: boolean }> {
  const t0 = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name, arguments: args } }),
  });
  const body = await res.text();
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${body.slice(0, 200)}`);
  const line = body.trimStart().startsWith("{") ? body : body.split("\n").find((l) => l.startsWith("data: "))!.slice(6);
  const msg = JSON.parse(line);
  if (msg.error) throw new Error(`${name}: ${JSON.stringify(msg.error)}`);
  return { ms, isError: !!msg.result?.isError };
}

// Each case is safe to repeat: gifts go back and forth, spends are refused
// without the parent phrase, rounds have no stake.
const cases: Array<[string, (i: number) => Record<string, unknown>]> = [
  ["get_household", () => ({})],
  ["show_scoreboard", () => ({})],
  ["list_packs", () => ({})],
  ["start_round", () => ({ mode: "family" })],
  [
    "record_round",
    (i) => ({
      question: "Bench question",
      correctAnswer: "yes",
      guesses: [{ player: "Mom", guess: "yes", verdict: "correct" }],
      idempotencyKey: `bench-${Date.now()}-${i}`,
    }),
  ],
  ["transfer_points", (i) => (i % 2 ? { from: "Sally", to: "John", amount: 1, reason: "bench" } : { from: "John", to: "Sally", amount: 1, reason: "bench" })],
  ["spend_points", () => ({ player: "Sally", amount: 1, reason: "bench" })],
  ["complete_chore", () => ({ player: "Dad" })],
  ["add_player", () => ({ name: "Mom", role: "parent" })],
];

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
};

console.log(`Latency test: ${N} calls per tool against ${url}\n`);
await call("get_household", {}); // warm up
const rows: Array<{ tool: string; p50: number; p95: number; max: number; errors: number }> = [];
for (const [tool, args] of cases) {
  const times: number[] = [];
  let errors = 0;
  for (let i = 0; i < N; i++) {
    const r = await call(tool, args(i));
    times.push(r.ms);
    if (r.isError) errors++;
  }
  rows.push({ tool, p50: pct(times, 50), p95: pct(times, 95), max: Math.max(...times), errors });
}
console.log("tool               p50 ms   p95 ms   max ms   user-error results");
for (const r of rows) {
  console.log(
    `${r.tool.padEnd(18)} ${r.p50.toFixed(0).padStart(6)}   ${r.p95.toFixed(0).padStart(6)}   ${r.max.toFixed(0).padStart(6)}   ${r.errors}`,
  );
}
const worst = Math.max(...rows.map((r) => r.p95));
console.log(`\nWorst p95: ${worst.toFixed(0)} ms. Budget 500 ms: ${worst < 500 ? "PASS" : "FAIL"}`);
process.exit(worst < 500 ? 0 : 1);
