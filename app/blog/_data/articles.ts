export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readMinutes: number;
  category: "Phishing" | "Bankovní podvody" | "SMS podvody" | "Tipy" | "Marketplace podvody" | "Investiční podvody";
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
  {
    slug: "bazos-marketplace-podvod-nedodane-zbozi",
    title: "Podvod na Bazoši a Facebook Marketplace: nedodané zboží po platbě (2026)",
    description:
      "Jak fungují podvody při prodeji a nákupu na Bazoši a Facebook Marketplace — varovné signály, falešné platby a co dělat, když prodejce zmizí se zálohou.",
    publishedAt: "2026-06-01",
    readMinutes: 8,
    category: "Marketplace podvody",
  },
  {
    slug: "falesny-kuryir-dpd-zasilkovna-sms",
    title: "Falešný kurýr DPD a Zásilkovna: SMS o nedoručeném balíku (2026)",
    description:
      "Podvodné SMS a e-maily imitující DPD, Zásilkovnu nebo PPL — jak poznat falešnou notifikaci o balíku, správné domény kurýrů a co dělat po zadání platební karty.",
    publishedAt: "2026-06-01",
    readMinutes: 6,
    category: "SMS podvody",
  },
  {
    slug: "vishing-falesny-banker-napadeny-ucet",
    title: "Vishing 2026: falešný bankéř volá, že máš napadený účet — jak poznat podvod",
    description:
      "Telefonický podvod, kde se útočník vydává za bezpečnostní oddělení banky. Jak probíhá hovor, co nikdy banka po telefonu nechce, a co dělat, když vám takový hovor přijde.",
    publishedAt: "2026-06-01",
    readMinutes: 7,
    category: "Bankovní podvody",
  },
  {
    slug: "podvodne-eshopy-jak-poznat-fake-obchod",
    title: "Podvodné e-shopy 2026: jak poznat fake obchod před nákupem",
    description:
      "Deset konkrétních věcí, které ověřte před každým nákupem v neznámém e-shopu. Od IČO přes platební metody po recenze — rychlý checklist, který ochrání vaše peníze.",
    publishedAt: "2026-06-01",
    readMinutes: 8,
    category: "Phishing",
  },
  {
    slug: "investicni-podvody-fake-reklamy-celebrity",
    title: "Investiční podvody 2026: falešné reklamy s celebritami a jak je poznat",
    description:
      "Deepfake videa a podvodné reklamy, které zneužívají jména českých osobností k propagaci falešných investičních platforem. Jak je rozpoznat a co dělat, když jste již zaplatili.",
    publishedAt: "2026-06-01",
    readMinutes: 8,
    category: "Investiční podvody",
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
