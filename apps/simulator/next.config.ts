import type { NextConfig } from "next";

const config: NextConfig = {
  // A second dev server in the same checkout needs its own build folder, or
  // the two overwrite each other's output (routes 404 at random).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@hey-trivi/replays"],
  reactStrictMode: true,
};

export default config;
