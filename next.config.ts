import type { NextConfig } from "next";

// The app is one interactive page plus JSON route handlers that read live, in-memory state.
// Nothing here should ever be prerendered or cached, so Cache Components stays off.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["neo4j-driver"],
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
};

export default nextConfig;
