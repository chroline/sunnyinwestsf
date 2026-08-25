import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/api/forecast`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/index.md`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/llms.txt`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/openapi.json`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/mcp`, changeFrequency: "weekly", priority: 0.4 },
  ];
}
