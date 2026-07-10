import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.163"],
  async redirects() {
    return [
      { source: "/frames", destination: "/freezeframes", permanent: true },
      { source: "/frames/:path*", destination: "/freezeframes/:path*", permanent: true },
      { source: "/admin/frames", destination: "/admin/freezeframes", permanent: true },
      { source: "/admin/frames/:path*", destination: "/admin/freezeframes/:path*", permanent: true },
      { source: "/hot-takes/index.html", destination: "/hot-takes", permanent: true },
    ];
  },
};

export default nextConfig;
