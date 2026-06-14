"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Info,
  Shield,
  AlertTriangle,
  Share2,
  Check,
  X,
  Copy,
  Camera,
  Lock,
  Download,
  Sparkles,
  Search as SearchIcon,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Tag,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  detectIdentifierType,
  identifierLabel,
  looksLikeFullMessage,
} from "@/utils/databaze/identifiers";
import {
  CATEGORY_LABELS,
  type IdentifierType,
  type IncidentCategory,
  type SubjectVisibility,
} from "@/types/databaze";
import HomeSections from "./components/HomeSections";
import { HomeSchema } from "./components/StructuredData";
import { trackEvent } from "./lib/analytics";
import ErrorBoundary from "./components/ErrorBoundary";
import RiskGauge from "./components/RiskGauge";
import UpsellModal from "./components/UpsellModal";
import AnalysisScanner from "./components/AnalysisScanner";
import ReferralCard from "./components/ReferralCard";

type DatabaseMatch = {
  type: "phone" | "account" | "email" | "facebook_url" | "var_symbol" | "other";
  value_masked: string;
  query_value: string;
  incident_count: number;
  trust_score: number;
};

type AnalysisResult = {
  risk: number;
  verdict: string;
  analysis: string;
  threats: string[];
  tactics?: string[];
  recommendation: string;
  shareId?: string;
  credits?: number;
  tier?: string;
  remainingChecks?: number;
  limitReached?: boolean;
  database_matches?: DatabaseMatch[];
};

// DB match labels — pro `account` rozlišujeme IBAN (zahr. účet) od českého
// čísla účtu podle prefixu maskované hodnoty. Sjednoceno s identifierLabel()
// v utils/databaze/identifiers.ts.
function dbMatchLabel(
  type: DatabaseMatch["type"],
  valueMasked: string,
): string {
  switch (type) {
    case "phone":
      return "Telefon";
    case "email":
      return "E-mail";
    case "facebook_url":
      return "Profil na platformě";
    case "var_symbol":
      return "Variabilní symbol";
    case "account":
      return /^[A-Z]{2}\d{2}/.test(valueMasked)
        ? "Číslo účtu (IBAN)"
        : "Číslo účtu";
    case "other":
    default:
      return "Neurčený identifikátor";
  }
}

// ── Database search (hero) types ─────────────────────
type SearchSubject = {
  id: string;
  display_name_masked: string;
  trust_score: number;
  visibility_status: SubjectVisibility;
  incident_count: number;
  top_categories: Array<{ category: IncidentCategory; count: number }>;
  date_range: { from: string; to: string } | null;
  is_claimed: boolean;
  identifiers: Array<{
    type: IdentifierType;
    value_masked: string;
    verified: boolean;
  }>;
};

type SearchApiResult = {
  found: boolean;
  detected_type: IdentifierType | null;
  normalized_value?: string;
  subject?: SearchSubject;
  message?: string;
};

type LimitReachedState = {
  message: string;
  requireRegistration: boolean;
};

const CATEGORY_EMOJI: Record<IncidentCategory, string> = {
  non_delivery: "📦",
  misrepresentation: "🎭",
  fake_courier: "🚚",
  disappeared_listing: "👻",
  fake_profile: "🪪",
  romance: "💔",
  investment: "📈",
  rental: "🏠",
  tickets: "🎫",
  employment: "💼",
  other: "❓",
};

function formatCzechDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type UserProfile = { tier: string; credits_remaining?: number };

const EXAMPLES = [
  {
    label: "📱 SMS z banky",
    text: "Vážený kliente, Vaše karta byla zablokována z důvodu podezřelé aktivity. Pro okamžité odblokování klikněte na odkaz: www.csob-overeni.cz/login. Máte 24 hodin.",
  },
  {
    label: "📦 Nedoručený balíček",
    text: "Ceska posta: Vas balik nelze dorucit kvuli chybejicimu poplatku 29 Kc. Zaplaťte zde pro doručení: https://ceska-posta-doruceni.com/platba",
  },
  {
    label: "🏆 Výhra v soutěži",
    text: "GRATULUJEME! Byl/a jste vybrán/a jako výherce iPhone 16 Pro v naší soutěži. Pro vyzvednutí výhry vyplňte údaje zde: www.vyhry-cz.com/iphone",
  },
  {
    label: "⚡ Urgentní email z úřadu",
    text: "Finanční úřad ČR: Evidujeme u Vás nedoplatek na dani z příjmu ve výši 4.250 Kč. Pokud nezaplatíte do 48 hodin, bude zahájeno exekuční řízení. Platba zde: www.financni-urad-platby.cz",
  },
];

// ── Hero: přepínač mezi databázovým vyhledáváním a AI analýzou ─
function ModeSwitch({
  mode,
  onMode,
}: {
  mode: "prodejce" | "zprava";
  onMode: (m: "prodejce" | "zprava") => void;
}) {
  const tabs: Array<{
    key: "prodejce" | "zprava";
    icon: typeof SearchIcon;
    label: string;
    sub: string;
  }> = [
    {
      key: "prodejce",
      icon: SearchIcon,
      label: "Prodejce, číslo, účet",
      sub: "databáze nahlášených podvodů",
    },
    {
      key: "zprava",
      icon: Sparkles,
      label: "Podezřelá zpráva",
      sub: "SMS, e-mail nebo odkaz — AI verdikt",
    },
  ];

  return (
    <div className="flex gap-2.5 max-w-xl mx-auto w-full">
      {tabs.map(({ key, icon: Icon, label, sub }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onMode(key)}
            aria-pressed={active}
            className={`flex-1 flex flex-col items-center gap-0.5 rounded-2xl border px-2 sm:px-3 py-3 transition-all ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            <span
              className={`inline-flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-sm font-bold tracking-tight ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Icon
                size={16}
                className={active ? "text-primary-foreground" : "text-muted-foreground"}
                aria-hidden="true"
              />
              {label}
            </span>
            <span
              className={`text-[10px] sm:text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  // ── AI message analysis state ──────────────────────
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ctaCopied, setCtaCopied] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Shared / profile state ──────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [upsellReason, setUpsellReason] = useState<
    "anon_daily" | "no_credits" | null
  >(null);
  const [stats, setStats] = useState<{
    analyses: number | null;
    incidents: number | null;
  }>({ analyses: null, incidents: null });

  // ── Hero mode switch (zpráva vs. databázové vyhledávání) ─
  const [mode, setMode] = useState<"prodejce" | "zprava">("prodejce");
  const [modeHint, setModeHint] = useState<"switched" | "identifier" | null>(
    null,
  );

  // ── Hero database search state ──────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchApiResult | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<LimitReachedState | null>(
    null,
  );
  const searchResultRef = useRef<HTMLDivElement>(null);

  const switchMode = (m: "prodejce" | "zprava") => {
    setMode(m);
    setModeHint(null);
  };

  useEffect(() => {
    // Bookmarklet handler - přečte ?q= parametr z URL a rovnou spustí hledání
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) {
      setSearchQuery(query);
      window.history.replaceState({}, "", "/");
      void performSearch(query);
    }

    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profile) setProfile(d.profile);
      })
      .catch(() => {})
      .finally(() => setProfileChecked(true));

    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setStats({
          analyses: typeof d?.total === "number" ? d.total : null,
          incidents: typeof d?.incidents === "number" ? d.incidents : null,
        }),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when user clicks logo/Home while already on "/"
  useEffect(() => {
    const reset = () => {
      setMode("prodejce");
      setModeHint(null);
      setSearchQuery("");
      setSearchResult(null);
      setSearchError(null);
      setLimitReached(null);
      setInput("");
      setResult(null);
      setError(null);
      setImages([]);
      setUpsellReason(null);
    };
    window.addEventListener("homeReset", reset);
    return () => window.removeEventListener("homeReset", reset);
  }, []);

  useEffect(() => {
    if (
      (searchResult || limitReached || searchError || result) &&
      searchResultRef.current
    ) {
      searchResultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [searchResult, limitReached, searchError, result]);

  const MAX_IMAGES = 4;
  const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = () => reject(new Error("Soubor nelze přečíst."));
      reader.readAsDataURL(file);
    });

  const addImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_IMAGES} screenshotů na jednu analýzu.`);
      return;
    }
    const toProcess = files.slice(0, remaining);
    const truncated = files.length > remaining;
    const newOnes: string[] = [];
    for (const f of toProcess) {
      if (!f.type.startsWith("image/")) {
        setError("Lze nahrávat pouze obrázky (PNG, JPG, WEBP).");
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setError(`Obrázek "${f.name}" je příliš velký (max 4 MB).`);
        continue;
      }
      try {
        newOnes.push(await readFileAsDataUrl(f));
      } catch {
        setError("Některý soubor se nepodařilo přečíst.");
      }
    }
    if (newOnes.length > 0) {
      setImages((prev) => [...prev, ...newOnes]);
      setInput("");
      setResult(null);
    }
    if (truncated) {
      setError(
        `Přijal jsem prvních ${remaining}. Limit je ${MAX_IMAGES} screenshotů.`,
      );
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) await addImageFiles(files);
  };

  const removeImageAt = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnalysis = useCallback(async () => {
    const hasImages = images.length > 0;
    if ((!input.trim() && !hasImages) || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    trackEvent("analyze_started", {
      kind: hasImages ? "image" : "text",
      image_count: images.length,
    });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasImages ? { images } : { text: input }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error(
          "Server neodpověděl. Možná je přetížen, zkuste to znovu.",
        );
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.limitReached) {
          setError(data.message || "Denní limit vyčerpán.");
          setUpsellReason("anon_daily");
          trackEvent("analyze_limit_reached", {
            tier: profile?.tier ?? "anon",
          });
        } else if (res.status === 402) {
          setError(data.message || "Nedostatek analýz.");
          setUpsellReason("no_credits");
          trackEvent("analyze_limit_reached", {
            tier: profile?.tier ?? "anon",
            reason: "no_credits",
          });
        } else {
          setError(data.error || "Něco se pokazilo. Zkuste to znovu.");
        }
        return;
      }

      setResult(data);
      trackEvent("analyze_completed", {
        risk: data.risk,
        tier: data.tier ?? "free",
      });
      window.dispatchEvent(new CustomEvent("creditsUpdated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepodařilo se připojit k serveru.",
      );
    } finally {
      setLoading(false);
    }
  }, [input, images, loading, profile?.tier]);

  const handleClear = () => {
    setInput("");
    setResult(null);
    setError(null);
    setImages([]);
  };

  // ── Hero database search ────────────────────────────
  const performSearch = useCallback(async (q: string) => {
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setLimitReached(null);
    setLastSearchedQuery(q);
    try {
      const res = await fetch("/api/databaze/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res
        .json()
        .catch(() => ({}))) as Partial<SearchApiResult> & {
        error?: string;
        limit_reached?: boolean;
        require_registration?: boolean;
      };
      if (res.status === 429 && data.limit_reached) {
        setLimitReached({
          message: data.error ?? "Limit vyhledávání vyčerpán.",
          requireRegistration: data.require_registration === true,
        });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Nepodařilo se prohledat databázi.");
      }
      setSearchResult(data as SearchApiResult);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Neznámá chyba.");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || searchLoading) return;
    void performSearch(q);
  };

  // Heuristiku "vypadá jako zpráva" spustíme jen u null / var_symbol —
  // u phone/email/account/facebook_url je identifikátor jednoznačný,
  // i kdyby byl dlouhý (FB URL, IBAN s mezerami).
  const UNAMBIGUOUS_TYPES = [
    "phone",
    "email",
    "account",
    "facebook_url",
  ] as const;

  // Vstup do databázového vyhledávání: pokud text vypadá jako celá zpráva,
  // automaticky přepneme na AI mód a text přeneseme tam (smart switching).
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const detectedType = detectIdentifierType(v);
    const isUnambiguous =
      detectedType !== null &&
      (UNAMBIGUOUS_TYPES as readonly string[]).includes(detectedType);

    if (!isUnambiguous && looksLikeFullMessage(v)) {
      setInput(v);
      setResult(null);
      setError(null);
      setSearchQuery("");
      setMode("zprava");
      setModeHint("switched");
      return;
    }
    setSearchQuery(v);
    setModeHint(null);
  };

  // Vstup do AI analýzy zprávy: pokud text vypadá jako identifikátor
  // (telefon, e-mail, účet, profil), nabídneme přepnutí na databázi.
  const handleAiTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    setModeHint(detectIdentifierType(v) !== null ? "identifier" : null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node))
      setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) void addImageFiles(files);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalysis();
    if (e.key === "Escape") handleClear();
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    trackEvent("cta_pdf_download", { risk: result.risk });
    const riskClass =
      result.risk >= 70 ? "high" : result.risk >= 40 ? "medium" : "low";
    const date = new Date().toLocaleDateString("cs-CZ");
    const threatsHtml =
      result.threats && result.threats.length > 0
        ? `<ul class="threats">${result.threats.map((t) => `<li>${t}</li>`).join("")}</ul>`
        : "";
    const html = `<!DOCTYPE html>
<html><head>
  <title>NeKlikni.cz - Výsledek analýzy</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .risk { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; }
    .risk.high { color: #ef4444; }
    .risk.medium { color: #f59e0b; }
    .risk.low { color: #10b981; }
    .verdict { font-size: 24px; text-align: center; font-weight: bold; margin-bottom: 20px; }
    .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .section h3 { margin: 0 0 10px; color: #4b5563; }
    .threats { list-style: none; padding: 0; }
    .threats li { padding: 5px 0; }
    .threats li::before { content: "⚠ "; }
    .footer { text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head><body>
  <div class="header"><div class="logo">NeKlikni.cz</div><div>Výsledek bezpečnostní analýzy</div></div>
  <div class="risk ${riskClass}">${result.risk}%</div>
  <div class="verdict">${result.verdict}</div>
  ${result.analysis ? `<div class="section"><h3>Analýza</h3><p>${result.analysis}</p></div>` : ""}
  ${threatsHtml ? `<div class="section"><h3>Identifikované hrozby</h3>${threatsHtml}</div>` : ""}
  ${result.recommendation ? `<div class="section"><h3>Doporučení</h3><p>${result.recommendation}</p></div>` : ""}
  <div class="footer">Vygenerováno na neklikni.cz • ${date}</div>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const handleShare = async () => {
    const url = result?.shareId
      ? `${window.location.origin}/report/${result.shareId}`
      : window.location.href;
    await navigator.clipboard.writeText(url);
    trackEvent("cta_share_clicked", { method: "copy" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DISCLAIMER =
    "Výsledky analýzy vygenerované umělou inteligencí mají informativní charakter. Technologie se může mýlit — poslední rozhodnutí je vždy na Vás.";

  const canUploadImage =
    !!profile?.tier && ["basic", "pro", "oneshot"].includes(profile.tier);

  const riskBorderColor = !result
    ? ""
    : result.risk >= 70
      ? "border-destructive/30"
      : result.risk >= 40
        ? "border-warning/30"
        : "border-success/30";

  return (
    <div className="flex flex-col min-h-screen ">
      <HomeSchema />
      <main className="flex-grow text-foreground pt-20 sm:pt-16 px-4 sm:px-6 pb-8 flex flex-col items-center relative">
        {/* ── HERO: dva rovnocenné vstupy — databáze i AI zpráva ── */}
        <section className="max-w-2xl w-full mx-auto relative z-10 text-center space-y-4 sm:space-y-5">
          {stats.analyses !== null && (
            <>
              {/* Mobile — kompaktní jednořádkový badge */}
              <div className="flex sm:hidden items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="motion-safe:animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="font-semibold text-foreground">
                  {stats.analyses.toLocaleString("cs-CZ")}
                </span>
                <span>prověřeno</span>
              </div>

              {/* Desktop — plný badge */}
              <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border text-xs sm:text-[13px] text-muted-foreground backdrop-blur-sm">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="motion-safe:animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-success">
                  online
                </span>
                <span className="text-muted-foreground">·</span>
                <span>
                  <span className="font-semibold text-foreground">
                    {stats.analyses.toLocaleString("cs-CZ")}
                  </span>{" "}
                  prověřených zpráv a kontaktů
                </span>
              </div>
            </>
          )}

          <h1 className="text-balance font-sans font-black tracking-tight text-foreground text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
            Neklikej.{" "}
            <span className="brand-gradient-text">Nejdřív si to ověř.</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Vlož zprávu, číslo, účet nebo e-mail. AI a databáze nahlášených
            podvodů ti do 10 sekund řeknou, čemu věřit.
          </p>

          <ModeSwitch mode={mode} onMode={switchMode} />

          {mode === "prodejce" && (
            <div className="max-w-xl mx-auto w-full space-y-3 text-left">
              <form
                onSubmit={handleHeroSearch}
                className="flex flex-col sm:flex-row rounded-2xl border border-border bg-card overflow-hidden transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30"
              >
                <label htmlFor="hero_search_q" className="sr-only">
                  Telefon, e-mail, číslo účtu, web e-shopu nebo profil k ověření
                </label>
                <input
                  id="hero_search_q"
                  name="q"
                  type="search"
                  inputMode="text"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={handleQueryChange}
                  placeholder="Telefon, e-mail, číslo účtu nebo web e-shopu…"
                  disabled={searchLoading}
                  className="flex-1 min-h-[56px] border-0 bg-transparent px-5 py-4 sm:py-5 text-base sm:text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || searchLoading}
                  className="group inline-flex items-center justify-center gap-2 min-h-[56px] border-t border-border bg-primary hover:brightness-110 px-6 py-4 sm:py-5 sm:border-t-0 sm:border-l text-base sm:text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {searchLoading ? (
                    <Loader2
                      size={20}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <SearchIcon size={20} aria-hidden="true" />
                  )}
                  Prověřit
                </button>
              </form>

              {modeHint === "switched" && (
                <p className="flex items-center gap-1.5 text-xs text-warning">
                  <Sparkles size={12} aria-hidden="true" />
                  Vypadá to jako celá zpráva — přepnuli jsme tě na AI analýzu.
                </p>
              )}

              <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground pt-1">
                <li className="inline-flex items-center gap-1.5">
                  <Check
                    size={14}
                    className="text-success shrink-0"
                    aria-hidden="true"
                  />
                  100% anonymní
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Check
                    size={14}
                    className="text-success shrink-0"
                    aria-hidden="true"
                  />
                  Bez registrace
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Check
                    size={14}
                    className="text-success shrink-0"
                    aria-hidden="true"
                  />
                  Výsledek hned
                </li>
              </ul>
            </div>
          )}

          {mode === "zprava" && (
            <div className="max-w-xl mx-auto w-full text-left space-y-3">
              <div className="relative rounded-2xl p-[1.5px] border border-border bg-card ">
                <div
                  className="rounded-2xl bg-card backdrop-blur-2xl overflow-hidden"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed z-10 flex items-center justify-center pointer-events-none">
                      <p className="text-primary font-bold text-lg">
                        Přetáhněte obrázek sem
                      </p>
                    </div>
                  )}

                  {/* Example chips */}
                  <div className="flex flex-wrap gap-2 px-5 pt-4">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex.label}
                        onClick={() => {
                          setInput(ex.text);
                          setResult(null);
                          setError(null);
                          setModeHint(null);
                        }}
                        className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-muted-foreground bg-secondary border border-border hover:bg-primary/10 hover:text-foreground hover:border-primary/40 active:scale-95 transition-all duration-200"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>

                  {/* Header row */}
                  <div className="flex items-center px-5 pt-4 pb-1">
                    <p className="flex items-center gap-2 text-foreground text-[13px] font-semibold">
                      <Sparkles size={13} className="text-primary" />
                      Vlož zprávu, AI odhalí podvod během chvilky
                    </p>
                  </div>

                  {/* Textarea */}
                  <div
                    className={`relative mx-3 mb-3 rounded-xl transition-all ${
                      isFocused
                        ? "ring-2 ring-primary/40 shadow-[0_0_40px_-15px_rgba(59,130,246,0.45)]"
                        : ""
                    }`}
                  >
                    <textarea
                      value={input}
                      onChange={handleAiTextChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      rows={4}
                      placeholder="Vložte podezřelou SMS, e-mail nebo odkaz…"
                      aria-label="Vstupní pole pro analýzu zprávy"
                      className="w-full bg-black/30 rounded-xl px-4 pt-3 pb-4 focus:outline-none text-foreground text-[15px] resize-none placeholder:text-muted-foreground border border-border"
                    />
                  </div>

                  {modeHint === "identifier" && (
                    <p className="mx-3 mb-3 -mt-1 flex items-center gap-1.5 text-xs text-primary">
                      <Info size={12} aria-hidden="true" />
                      Vypadá to jako identifikátor —{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery(input.trim());
                          setInput("");
                          switchMode("prodejce");
                        }}
                        className="underline underline-offset-2 hover:text-primary"
                      >
                        prověřit raději v databázi?
                      </button>
                    </p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />

                  <div className="px-3 pb-4 space-y-2.5">
                    {loading ? (
                      <AnalysisScanner />
                    ) : (
                      <>
                        <button
                          onClick={handleAnalysis}
                          disabled={!input.trim() && images.length === 0}
                          className="group relative w-full overflow-hidden bg-primary hover:brightness-110 text-foreground py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                          <Sparkles
                            size={16}
                            className="group-hover:rotate-12 transition-transform"
                          />
                          Prověřit zprávu zdarma
                        </button>

                        {images.length > 0 && (
                          <div className="px-1 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <p className="text-muted-foreground">
                                Screenshoty připravené k analýze ·{" "}
                                {images.length}/{MAX_IMAGES}
                              </p>
                              <button
                                type="button"
                                onClick={() => setImages([])}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                Vymazat vše
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {images.map((src, idx) => (
                                <div key={idx} className="relative group/thumb">
                                  <img
                                    src={src}
                                    alt={`Screenshot ${idx + 1}`}
                                    className="w-14 h-14 object-cover rounded-lg border border-border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImageAt(idx)}
                                    aria-label={`Odebrat screenshot ${idx + 1}`}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {images.length < MAX_IMAGES &&
                          (canUploadImage ? (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full flex items-center justify-center gap-2 border border-dashed border-primary/40 hover:border-primary/70 text-primary hover:text-primary hover:bg-primary/5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                            >
                              <Camera size={14} />{" "}
                              {images.length === 0
                                ? "Přidat screenshot"
                                : "Přidat další"}{" "}
                              <span className="text-primary/60 ml-1">
                                (až {MAX_IMAGES})
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                window.location.href = "/pricing";
                              }}
                              className="w-full flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary text-xs transition-colors py-1.5"
                            >
                              <Lock size={12} /> Přidat screenshot{" "}
                              <span className="text-primary/60 ml-1">
                                (BASIC+)
                              </span>
                            </button>
                          ))}

                        <p className="text-muted-foreground text-[10px] text-center hidden sm:block">
                          Ctrl + Enter pro odeslání · Esc pro smazání
                        </p>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-2.5 border-t border-border bg-secondary/40">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground text-center">
                      ŠIFROVÁNO • ANONYMNÍ • OBSAH SE NEUKLÁDÁ
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Výsledek vyhledávání v databázi / AI analýzy ─── */}
        <section className="w-full flex justify-center relative z-10 mt-6">
          <div
            ref={searchResultRef}
            className="w-full max-w-3xl px-4 space-y-4 scroll-mt-24"
          >
            {mode === "prodejce" && (
              <>
                {searchLoading && (
                  <AnalysisScanner
                    messages={[
                      "Hledáme v databázi…",
                      "Porovnáváme identifikátory…",
                      "Zpracováváme výsledky…",
                    ]}
                  />
                )}

                {searchError && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-left text-sm text-destructive">
                    {searchError}
                  </div>
                )}

                {!searchLoading && limitReached && (
                  <div className="rounded-[32px] border-2 border-primary/40 bg-primary/5 p-6 sm:p-8 text-left space-y-4">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground">
                      Dnes jsi už jeden subjekt ověřil/a
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      První ověření je{" "}
                      <strong className="text-foreground">
                        zdarma bez registrace
                      </strong>
                      . Pro neomezené vyhledávání se zaregistruj — je to taky
                      zdarma a zabere to půl minuty.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/register"
                        className="brand-gradient inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-foreground shadow-[0_0_18px_-4px_rgba(59,130,246,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(99,102,241,0.7)]"
                      >
                        Registrovat se zdarma
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                      <Link
                        href="/login?redirect=/"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-6 py-3 text-sm font-medium text-foreground transition hover:border-muted-foreground hover:bg-secondary/80"
                      >
                        Už mám účet — přihlásit
                      </Link>
                    </div>
                  </div>
                )}

                {!searchLoading && !limitReached && searchResult && (
                  <>
                    {searchResult.found && searchResult.subject ? (
                      <div
                        className={`rounded-[32px] border-2 backdrop-blur-3xl shadow-2xl p-6 sm:p-8 text-left space-y-5 ${
                          searchResult.subject.trust_score < 50
                            ? "border-destructive/40 bg-destructive/10"
                            : "border-warning/40 bg-warning/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={28}
                            className={`flex-shrink-0 ${searchResult.subject.trust_score < 50 ? "text-destructive" : "text-warning"}`}
                            aria-hidden="true"
                          />
                          <div className="space-y-1">
                            <h2 className="text-xl sm:text-2xl font-black text-foreground">
                              ⚠️ Subjekt evidován v databázi nahlášených podvodů
                            </h2>
                            {searchResult.normalized_value && (
                              <p className="text-xs text-muted-foreground">
                                Hledáno:{" "}
                                <span className="font-mono text-muted-foreground">
                                  {searchResult.normalized_value}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-foreground">
                            {searchResult.subject.incident_count}{" "}
                            {searchResult.subject.incident_count === 1
                              ? "nahlášení"
                              : "nahlášení"}
                          </span>
                          <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-foreground">
                            Trust score:{" "}
                            <strong>
                              {searchResult.subject.trust_score}/100
                            </strong>
                          </span>
                          {searchResult.subject.date_range && (
                            <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-foreground">
                              {formatCzechDate(
                                searchResult.subject.date_range.from,
                              )}{" "}
                              –{" "}
                              {formatCzechDate(
                                searchResult.subject.date_range.to,
                              )}
                            </span>
                          )}
                        </div>

                        {searchResult.subject.top_categories.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {searchResult.subject.top_categories.map((c) => (
                              <span
                                key={c.category}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground"
                              >
                                <span aria-hidden="true">
                                  {CATEGORY_EMOJI[c.category]}
                                </span>
                                {CATEGORY_LABELS[c.category]}
                                <span className="text-muted-foreground">
                                  × {c.count}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}

                        {searchResult.subject.identifiers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {searchResult.subject.identifiers.map(
                              (idf, idx) => (
                                <span
                                  key={`${idf.type}_${idx}`}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs"
                                >
                                  <Tag
                                    size={11}
                                    className="text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                  <span className="text-muted-foreground">
                                    {identifierLabel(
                                      idf.type,
                                      idf.value_masked,
                                    )}
                                    :
                                  </span>
                                  <span className="font-mono text-foreground">
                                    {idf.value_masked}
                                  </span>
                                </span>
                              ),
                            )}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <Link
                            href={`/databaze/nahlasit?prefill=${encodeURIComponent(lastSearchedQuery)}`}
                            className="brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-foreground shadow-[0_0_18px_-4px_rgba(59,130,246,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(99,102,241,0.7)]"
                          >
                            Nahlaste i svůj případ — posílíte důkazy
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                          <Link
                            href={`/databaze/hledat?q=${encodeURIComponent(lastSearchedQuery)}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
                          >
                            Zobrazit detail v databázi
                          </Link>
                        </div>
                      </div>
                    ) : searchResult.detected_type === null ? (
                      <div className="rounded-[32px] border-2 border-border/50 bg-secondary backdrop-blur-md p-6 sm:p-8 text-left space-y-3">
                        <div className="flex items-start gap-3">
                          <HelpCircle
                            size={28}
                            className="flex-shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="space-y-2">
                            <h2 className="text-xl font-bold text-foreground">
                              Tento formát neumíme prohledat
                            </h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {searchResult.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[32px] border-2 border-primary/30 bg-primary/5 backdrop-blur-md p-6 sm:p-8 text-left space-y-5">
                        <div className="flex items-start gap-3">
                          <ShieldCheck
                            size={28}
                            className="flex-shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div className="space-y-1">
                            <h2 className="text-xl sm:text-2xl font-black text-foreground">
                              Nenalezen v databázi
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {searchResult.message ??
                                "To ale neznamená, že je bezpečný — buď opatrný a ověř ho i jinak."}
                            </p>
                          </div>
                        </div>

                        {/* JEDINÝ vstup do AI analýzy z homepage */}
                        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
                          <p className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                            <Sparkles
                              size={15}
                              className="text-primary shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            Poslal vám zprávu? Vložte ji a naše pokročilá AI ji
                            okamžitě prověří zdarma.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setInput(searchQuery);
                              switchMode("zprava");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:brightness-110 px-5 py-3 text-sm font-bold text-foreground shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
                          >
                            <Sparkles size={15} /> Vložit zprávu k AI analýze
                          </button>
                        </div>

                        <Link
                          href={`/databaze/nahlasit?prefill=${encodeURIComponent(lastSearchedQuery)}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary transition-colors"
                        >
                          Podvedl vás tento subjekt? Nahlaste ho
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    )}

                    {searchResult.found && (
                      <ReferralCard
                        isLoggedIn={profileChecked ? profile !== null : null}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {mode === "zprava" && (
              <>
                {result && (
                  <div
                    className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-card ${riskBorderColor} p-8 sm:p-10 text-left`}
                  >
                    <div className="flex flex-col items-center text-center mb-8 gap-4">
                      <RiskGauge value={result.risk} size={200} />
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-foreground">
                        {result.verdict}
                      </h2>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-primary font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                          <Info size={14} /> Analýza
                        </h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {result.analysis}
                        </p>
                      </div>

                      {result.threats && result.threats.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-primary font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <AlertTriangle size={14} /> Identifikované hrozby
                          </h4>
                          <ul className="space-y-1">
                            {result.threats.map((threat, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-muted-foreground text-sm"
                              >
                                <span className="text-destructive mt-0.5 shrink-0">
                                  •
                                </span>{" "}
                                {threat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.tactics && result.tactics.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-primary font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <Shield size={14} /> Taktiky útočníka
                          </h4>
                          <ul className="space-y-1">
                            {result.tactics.map((tactic, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-muted-foreground text-sm"
                              >
                                <span className="text-warning mt-0.5 shrink-0">
                                  ▸
                                </span>{" "}
                                {tactic}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-secondary border border-border">
                        <p className="italic text-muted-foreground text-sm text-center">
                          &quot;{result.recommendation}&quot;
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-muted-foreground text-xs">
                          {!result.tier || result.tier === "free"
                            ? result.remainingChecks !== undefined && (
                                <span>
                                  Zbývá dnes:{" "}
                                  <span className="text-muted-foreground font-bold">
                                    {result.remainingChecks}/2
                                  </span>
                                </span>
                              )
                            : result.credits !== undefined && (
                                <span>
                                  Zbývá:{" "}
                                  <span className="text-muted-foreground font-bold">
                                    {result.credits.toLocaleString("cs-CZ")}{" "}
                                    kreditů
                                  </span>
                                </span>
                              )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 text-xs border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            <Download size={14} /> Stáhnout report
                          </button>
                          <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-xl"
                          >
                            {copied ? (
                              <>
                                <Check size={14} className="text-success" />{" "}
                                Zkopírováno!
                              </>
                            ) : (
                              <>
                                <Share2 size={14} /> Sdílet varování
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm text-center leading-relaxed pt-2 border-t border-border">
                        ⚠️ {DISCLAIMER}
                      </p>
                    </div>
                  </div>
                )}

                {result?.database_matches &&
                  result.database_matches.length > 0 && (
                    <div className="rounded-[32px] border-2 border-destructive/40 bg-destructive/10 backdrop-blur-3xl shadow-2xl p-8 sm:p-10 text-left space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-xl sm:text-2xl font-black text-destructive">
                          🚨 Nález v databázi nahlášených incidentů
                        </h3>
                        <p className="text-sm text-destructive-foreground/80">
                          V textu zprávy jsme našli identifikátory, které jsou
                          evidovány v databázi nahlášených incidentů.
                        </p>
                      </div>
                      <ul className="space-y-3">
                        {result.database_matches.map((m, i) => (
                          <li
                            key={`${m.type}-${m.value_masked}-${i}`}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
                          >
                            <div className="text-sm text-foreground">
                              <span className="font-bold">
                                {dbMatchLabel(m.type, m.value_masked)}
                              </span>{" "}
                              <span className="font-mono text-destructive">
                                {m.value_masked}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                — nahlášeno v {m.incident_count}{" "}
                                {m.incident_count === 1
                                  ? "incidentu"
                                  : m.incident_count >= 2 &&
                                      m.incident_count <= 4
                                    ? "incidentech"
                                    : "incidentech"}
                              </span>
                            </div>
                            <a
                              href={`/databaze/hledat?q=${encodeURIComponent(m.query_value)}`}
                              className="shrink-0 text-xs font-semibold text-destructive hover:text-foreground underline underline-offset-2"
                            >
                              Zobrazit v databázi →
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {result?.shareId &&
                  (() => {
                    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://neklikni.cz"}/report/${result.shareId}`;
                    const waText = encodeURIComponent(
                      `Pozor na tento podvod! Podívej se na analýzu: ${shareUrl}`,
                    );
                    return (
                      <div className="bg-warning/10 border border-warning/30 rounded-[32px] p-8 space-y-5">
                        <div className="text-center space-y-2">
                          <h3 className="text-xl font-black text-foreground">
                            ⚠️ Varujte svou rodinu a přátele
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            Sdílejte tento výsledek, aby se vaši blízcí
                            nenechali nachytat.
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                          <a
                            href={`https://wa.me/?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-success hover:brightness-110 text-foreground font-bold text-sm transition-all active:scale-95"
                          >
                            💬 WhatsApp
                          </a>
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary hover:brightness-110 text-foreground font-bold text-sm transition-all active:scale-95"
                          >
                            📘 Facebook
                          </a>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(shareUrl);
                              setCtaCopied(true);
                              setTimeout(() => setCtaCopied(false), 2000);
                            }}
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-sm transition-all active:scale-95"
                          >
                            {ctaCopied ? (
                              <>
                                <Check size={16} className="text-success" />{" "}
                                Odkaz zkopírován!
                              </>
                            ) : (
                              <>
                                <Copy size={16} /> Kopírovat odkaz
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              if (navigator.share)
                                await navigator.share({
                                  title: "NeKlikni.cz – Varování",
                                  text: "Pozor na tento podvod! Podívej se na analýzu:",
                                  url: shareUrl,
                                });
                            }}
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-sm transition-all active:scale-95 sm:hidden"
                          >
                            <Share2 size={16} /> Sdílet
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                {result && (
                  <ReferralCard
                    isLoggedIn={profileChecked ? profile !== null : null}
                  />
                )}
              </>
            )}
          </div>
        </section>

        <ErrorBoundary>
          <HomeSections />
        </ErrorBoundary>
      </main>

      <UpsellModal
        reason={upsellReason}
        tier={profile?.tier}
        onClose={() => setUpsellReason(null)}
      />
    </div>
  );
}
