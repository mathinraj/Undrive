import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/vault", "/vault/", "/api/"],
    },
    sitemap: "https://undrive.app/sitemap.xml",
  };
}
