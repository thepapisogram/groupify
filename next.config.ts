import type { NextConfig } from "next";

// Pages whose URLs can carry a capability token, or that act on a form's behalf.
// They must not be indexed, cached, framed, or leak their URL through Referer.
const privateHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      { source: "/forms/:formId/admin", headers: privateHeaders },
      { source: "/forms/:formId/edit", headers: privateHeaders },
      { source: "/invites/:path*", headers: privateHeaders },
      { source: "/verify-email", headers: privateHeaders },
      // Public, but not something search engines should list.
      { source: "/forms/:formId/groups", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
