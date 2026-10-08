import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old "partner" URLs permanently redirect to their /earn equivalents.
  async redirects() {
    return [
      { source: "/partner", destination: "/earn/info", permanent: true },
      { source: "/partner/:path*", destination: "/earn/:path*", permanent: true },
      // /jobs was folded into the searchable /programs page.
      { source: "/jobs", destination: "/programs", permanent: true },
    ];
  },
};

export default nextConfig;
