import type { MetadataRoute } from "next";
import appMeta from "@/data/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || appMeta.app.defaultUrl).replace(/\/+$/, "");
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/forms/new`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/documentation`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
