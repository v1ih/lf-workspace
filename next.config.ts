import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here reads the logged-in session, so they are all dynamic.
  // Cache Components stays off to keep the data flow simple (see docs/ARCHITECTURE.md).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
