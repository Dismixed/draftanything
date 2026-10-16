import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /api/ stays crawlable: games load their puzzle from it, and Google's renderer obeys
      // robots.txt for those requests, so blocking it turned every game page into a load error
      // (a soft 404). API responses carry X-Robots-Tag: noindex instead (next.config.ts).
      disallow: ["/admin/", "/api/admin/", "/api/ai/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
