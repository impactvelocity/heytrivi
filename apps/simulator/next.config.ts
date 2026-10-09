import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@hey-trivi/replays"],
  reactStrictMode: true,
};

export default config;
