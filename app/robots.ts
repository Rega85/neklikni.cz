import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/profile", "/billing", "/update-password"],
      },
    ],
    sitemap: "https://www.neklikni.cz/sitemap.xml",
    host: "https://www.neklikni.cz",
  };
}
