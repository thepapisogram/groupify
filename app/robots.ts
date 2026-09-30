import type { MetadataRoute } from "next";
import appMeta from "@/data/metadata";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL || appMeta.app.defaultUrl).replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/documentation", "/forms/new"],
        // Forms, groups, invites and the API belong to individual users and are never worth indexing.
        disallow: ["/api/", "/forms/", "/invites/", "/verify-email", "/reset-password", "/forgot-password", "/account", "/login", "/signup"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
