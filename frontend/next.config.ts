import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.56.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://mri-brain-tumor-detection-agentic-ai.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
