import type { MetadataRoute } from "next";
import appMeta from "@/data/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appMeta.app.name,
    short_name: appMeta.app.name,
    description: appMeta.app.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#07090f",
    theme_color: "#07090f",
    icons: [{ src: "/logo.png", sizes: "any", type: "image/png" }],
  };
}
