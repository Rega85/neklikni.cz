import type { MetadataRoute } from "next";

const BASE = "https://www.neklikni.cz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE}/`,         lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/pricing`,  lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/login`,    lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE}/kontakt`,  lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/gdpr`,     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/vop`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/cookies`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
