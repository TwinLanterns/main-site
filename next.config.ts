import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old "partner" URLs permanently redirect to their /earn equivalents.
  async redirects() {
    return [
      { source: "/partner", destination: "/earn/info", permanent: true },
      { source: "/partner/:path*", destination: "/earn/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
