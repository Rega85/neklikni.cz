import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/profile",
          "/billing",
          "/update-password",
          "/databaze/hledat",
          "/databaze/nahlasit",
          "/databaze/claim",
        ],
      },
    ],
    sitemap: "https://www.neklikni.cz/sitemap.xml",
    host: "https://www.neklikni.cz",
  };
}
