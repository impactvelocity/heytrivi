/**
 * Runtime settings for the browser: where the MCP server is, which token to
 * use, and whether the model is mocked.
 */

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    mcpUrl: process.env.MCP_SERVER_URL ?? "http://localhost:4787/mcp",
    // A development token for the demo household (R9.7). Account linking
    // replaces it in milestone 5.
    token: process.env.MCP_DEV_TOKEN ?? "dev-token-demo",
    mock: process.env.MOCK_MODEL === "1",
  });
}
