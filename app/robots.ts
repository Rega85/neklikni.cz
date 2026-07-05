import type { MetadataRoute } from "next";

// Link-preview/unfurl boty (ne search indexery) — potřebují přístup
// na /api/og pro dynamický OG obrázek kvízu, jinak jim obecné
// "Disallow: /api/" níže zablokuje náhled u sdílených odkazů.
// Tyhle boty nekrawlují web plošně, jen fetchnou jednu konkrétní
// URL při sdílení, takže plný "allow /" je bezpečný.
const LINK_PREVIEW_BOTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: LINK_PREVIEW_BOTS,
        allow: "/",
      },
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
