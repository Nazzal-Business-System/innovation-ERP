import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ierp/shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  devIndicators: false,
};

export default nextConfig;
