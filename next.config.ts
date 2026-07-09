import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/hot-takes", destination: "/hot-takes/index.html" },
    ];
  },
};

export default nextConfig;
