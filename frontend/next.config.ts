import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.56.1", "192.168.1.4"],
  async rewrites() {
    const backendTarget = process.env.BACKEND_API_TARGET ?? "http://178.105.124.156/api";
    return [
      {
        source: "/api/:path*",
        destination: `${backendTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
