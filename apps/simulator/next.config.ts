import type { NextConfig } from "next";

const config: NextConfig = {
  // A second dev server in the same checkout needs its own build folder, or
  // the two overwrite each other's output (routes 404 at random).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@hey-trivi/replays", "@hey-trivi/store", "@hey-trivi/core"],
  reactStrictMode: true,
  // The store and core packages are TypeScript that imports "./x.js" (Node
  // ESM style); point those at the .ts files.
  webpack: (cfg) => {
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return cfg;
  },
};

export default config;
