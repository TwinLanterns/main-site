import type { NextConfig } from "next";

const securityHeaders = [
  // No site page is meant to be framed; blocks clickjacking (e.g. /admin).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Old "cervo" URLs permanently redirect to their /earn equivalents.
  async redirects() {
    return [
      { source: "/cervo", destination: "/earn/info", permanent: true },
      { source: "/cervo/:path*", destination: "/earn/:path*", permanent: true },
      // /jobs was folded into the searchable /programs page.
      { source: "/jobs", destination: "/programs", permanent: true },
    ];
  },
};

export default nextConfig;
