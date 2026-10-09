/**
 * OAuth discovery documents for MCP clients (R9.2, R9.3).
 *
 * The MCP server publishes both documents itself. The authorization server
 * document points at the Cognito user pool's managed login endpoints, so an
 * assistant that links an account signs the parent in with the same account
 * they use on the parent page. Only served when Cognito is configured.
 */

import type { Hono } from "hono";

export function oauthMetadata(app: Hono): void {
  const domain = process.env.COGNITO_DOMAIN?.replace(/\/$/, "");
  const poolId = process.env.COGNITO_USER_POOL_ID;
  if (!domain || !poolId) return;
  const region = poolId.split("_")[0];
  const scopes = ["openid", "email", "profile"];

  const origin = (url: string) => new URL(url).origin;

  app.get("/.well-known/oauth-protected-resource", (c) =>
    c.json({
      resource: `${origin(c.req.url)}/mcp`,
      authorization_servers: [origin(c.req.url)],
      bearer_methods_supported: ["header"],
      scopes_supported: scopes,
    }),
  );

  app.get("/.well-known/oauth-authorization-server", (c) =>
    c.json({
      issuer: origin(c.req.url),
      authorization_endpoint: `${domain}/oauth2/authorize`,
      token_endpoint: `${domain}/oauth2/token`,
      revocation_endpoint: `${domain}/oauth2/revoke`,
      jwks_uri: `https://cognito-idp.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
      scopes_supported: scopes,
    }),
  );
}
