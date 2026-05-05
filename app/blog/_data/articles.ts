export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readMinutes: number;
  category: "Phishing" | "Bankovní podvody" | "SMS podvody" | "Tipy";
};

/**
 * Index of blog articles. Each article's full content lives in
 * app/blog/<slug>/page.tsx — this list drives the blog index page,
 * sitemap, and structured data.
 */
export const ARTICLES: Article[] = [
  {
    slug: "falesna-ceska-posta",
    title: "Falešná Česká pošta: jak poznat podvod v roce 2026",
    description:
      "Průvodce nejčastějším českým phishingem — falešné SMS o nedoručeném balíku. Konkrétní fráze, domény a co dělat, když vám taková zpráva dorazí.",
    publishedAt: "2026-05-05",
    readMinutes: 6,
    category: "SMS podvody",
  },
  {
    slug: "bankovni-phishing-cesko",
    title: "Bankovní phishing v Česku: ČSOB, Komerční banka, Air Bank — jak útočníci pracují",
    description:
      "Reálné ukázky phishingových e-mailů a SMS, které se vydávají za české banky. Jak je rozeznat během 5 sekund a co dělat, když na podvod kliknete.",
    publishedAt: "2026-05-05",
    readMinutes: 8,
    category: "Bankovní podvody",
  },
  {
    slug: "smishing-7-typu-sms-podvodu",
    title: "Smishing: 7 typů SMS podvodů, které kolují v Česku",
    description:
      "Od „dluh na zdravotním pojištění“ po „mami, rozbil se mi telefon“ — kompletní katalog SMS podvodů aktuálních v ČR a slovní zásoba útočníků.",
    publishedAt: "2026-05-05",
    readMinutes: 7,
    category: "SMS podvody",
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
