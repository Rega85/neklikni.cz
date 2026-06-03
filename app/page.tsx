"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Info, Shield, AlertTriangle, Share2, Check, X, Copy, Camera, Lock, Download, Sparkles, Search as SearchIcon, MessageSquare, UserSearch, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { detectIdentifierType } from "@/utils/databaze/identifiers";
import HomeSections from "./components/HomeSections";
import { HomeSchema } from "./components/StructuredData";
import { trackEvent } from "./lib/analytics";
import ErrorBoundary from "./components/ErrorBoundary";
import RiskGauge from "./components/RiskGauge";
import UpsellModal from "./components/UpsellModal";
import HeroParticles from "./components/HeroParticles";
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
function dbMatchLabel(type: DatabaseMatch["type"], valueMasked: string): string {
  switch (type) {
    case "phone":         return "Telefon";
    case "email":         return "E-mail";
    case "facebook_url":  return "Profil na platformě";
    case "var_symbol":    return "Variabilní symbol";
    case "account":
      return /^[A-Z]{2}\d{2}/.test(valueMasked) ? "Číslo účtu (IBAN)" : "Číslo účtu";
    case "other":
    default:              return "Neurčený identifikátor";
  }
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

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ctaCopied, setCtaCopied] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [upsellReason, setUpsellReason] = useState<"anon_daily" | "no_credits" | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState("");
  const [activeTab, setActiveTab] = useState<"zprava" | "subjekt">("zprava");
  const [subjectQuery, setSubjectQuery] = useState("");
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const router = useRouter();
  const [dbStats, setDbStats] = useState<{ subjects: number | null; incidents: number | null }>({ subjects: null, incidents: null });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const PLACEHOLDERS = [
    "Vložte podezřelou zprávu, SMS nebo odkaz...",
    "Váš balíček CZ83726 čeká na zaplacení cla 45 Kč...",
    "Gratulujeme! Váš email byl vylosován, klikněte zde...",
    "Česká spořitelna: Váš účet byl dočasně zablokován...",
    "Ahoj mami, rozbil se mi telefon, napiš mi na toto číslo...",
    "Máte nedoplatek na zdravotním pojištění, uhraďte zde...",
  ];

  useEffect(() => {
    let cancelled = false;
    let phraseIndex = 0;
    let charIndex = 0;
    let typing = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      const phrase = PLACEHOLDERS[phraseIndex];
      if (typing) {
        charIndex++;
        setPlaceholderText(phrase.slice(0, charIndex));
        if (charIndex < phrase.length) {
          timeoutId = setTimeout(tick, 50);
        } else {
          timeoutId = setTimeout(() => { typing = false; tick(); }, 2000);
        }
      } else {
        charIndex--;
        setPlaceholderText(phrase.slice(0, charIndex));
        if (charIndex > 0) {
          timeoutId = setTimeout(tick, 30);
        } else {
          phraseIndex = (phraseIndex + 1) % PLACEHOLDERS.length;
          typing = true;
          timeoutId = setTimeout(tick, 300);
        }
      }
    };

    timeoutId = setTimeout(tick, 800);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, []);

  useEffect(() => {
    // Bookmarklet handler - přečte ?q= parametr z URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) {
      setInput(query);
      window.history.replaceState({}, '', '/');
    }

    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.profile) setProfile(d.profile); })
      .catch(() => {})
      .finally(() => setProfileChecked(true));

    fetch('/api/stats', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (typeof d?.total === 'number') setTotalAnalyses(d.total); })
      .catch(() => {});

    fetch('/api/databaze/stats', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d && typeof d === 'object') {
          setDbStats({
            subjects: typeof d.subjects === 'number' ? d.subjects : null,
            incidents: typeof d.incidents === 'number' ? d.incidents : null,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Reset analysis state when user clicks logo/Home while already on "/"
  useEffect(() => {
    const reset = () => {
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
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

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
      setError(`Přijal jsem prvních ${remaining}. Limit je ${MAX_IMAGES} screenshotů.`);
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
    trackEvent("analyze_started", { kind: hasImages ? "image" : "text", image_count: images.length });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasImages ? { images } : { text: input }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server neodpověděl. Možná je přetížen, zkuste to znovu.");
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.limitReached) {
          setError(data.message || "Denní limit vyčerpán.");
          setUpsellReason("anon_daily");
          trackEvent("analyze_limit_reached", { tier: profile?.tier ?? "anon" });
        } else if (res.status === 402) {
          setError(data.message || "Nedostatek analýz.");
          setUpsellReason("no_credits");
          trackEvent("analyze_limit_reached", { tier: profile?.tier ?? "anon", reason: "no_credits" });
        } else {
          setError(data.error || "Něco se pokazilo. Zkuste to znovu.");
        }
        return;
      }

      setResult(data);
      trackEvent("analyze_completed", { risk: data.risk, tier: data.tier ?? "free" });
      window.dispatchEvent(new CustomEvent("creditsUpdated"));
    } catch (err: any) {
      setError(err.message || "Nepodařilo se připojit k serveru.");
    } finally {
      setLoading(false);
    }
  }, [input, images, loading, profile?.tier]);

  const handleClear = () => { setInput(""); setResult(null); setError(null); setImages([]); };

  const handleSubjectSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = subjectQuery.trim();
    if (!q) return;
    if (!detectIdentifierType(q)) {
      setSubjectError("Vlož telefon, e-mail nebo číslo účtu — tento formát neumíme prohledat.");
      return;
    }
    setSubjectError(null);
    router.push(`/databaze/hledat?q=${encodeURIComponent(q)}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
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
    const riskClass = result.risk >= 70 ? "high" : result.risk >= 40 ? "medium" : "low";
    const date = new Date().toLocaleDateString("cs-CZ");
    const threatsHtml = result.threats && result.threats.length > 0
      ? `<ul class="threats">${result.threats.map(t => `<li>${t}</li>`).join("")}</ul>`
      : "";
    const html = `<!DOCTYPE html>
<html><head>
  <title>NeKlikni.cz - Výsledek analýzy</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #7c3aed; }
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
    const url = result?.shareId ? `${window.location.origin}/report/${result.shareId}` : window.location.href;
    await navigator.clipboard.writeText(url);
    trackEvent("cta_share_clicked", { method: "copy" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DISCLAIMER = "Výsledky analýzy vygenerované umělou inteligencí mají informativní charakter. Technologie se může mýlit — poslední rozhodnutí je vždy na Vás.";

  const canUploadImage = !!profile?.tier && ["basic", "pro", "oneshot"].includes(profile.tier);

  const riskBorderColor = !result ? "" : result.risk >= 70 ? "border-red-500/30" : result.risk >= 40 ? "border-yellow-500/30" : "border-green-500/30";

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <HomeSchema />
      <main className="flex-grow text-white pt-20 px-4 sm:px-6 pb-8 flex flex-col items-center relative">
        <HeroParticles />

        {/* ── HERO: two-column editorial layout ────────────── */}
        <section className="max-w-7xl w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">

            {/* LEFT COLUMN — text */}
            <div className="space-y-6 text-left lg:pt-6">
              {totalAnalyses !== null && totalAnalyses > 0 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-white/10 text-xs sm:text-[13px] text-slate-300 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
                  </span>
                  <span>
                    <span className="font-semibold text-white">
                      {totalAnalyses.toLocaleString("cs-CZ")}
                    </span>{" "}
                    zpráv prověřeno
                  </span>
                </div>
              )}

              <h1 className="font-sans font-black tracking-tight text-white text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
                Prověř{" "}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
                  {activeTab === "zprava" ? "než klikneš." : "než zaplatíš."}
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg lg:text-xl leading-relaxed max-w-xl">
                {activeTab === "zprava"
                  ? "Vlož podezřelou SMS, e-mail nebo screenshot. AI ti během 10 sekund řekne, jestli jde o podvod — a podle čeho to poznat."
                  : "Kupuješ z bazaru nebo Marketplace? Zadej číslo účtu, telefon nebo profil prodejce a zjisti, jestli už někoho nepodvedl."}
              </p>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                <li className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  100% anonymní
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  Bez registrace
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  Česky, do 10 sekund
                </li>
              </ul>
            </div>

            {/* RIGHT COLUMN — product card with tabs */}
            <div className="relative">
              <div
                className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-violet-500/50 via-fuchsia-500/30 to-cyan-500/40 shadow-[0_0_80px_-20px_rgba(168,85,247,0.5)]"
                onDragOver={activeTab === "zprava" ? handleDragOver : undefined}
                onDragLeave={activeTab === "zprava" ? handleDragLeave : undefined}
                onDrop={activeTab === "zprava" ? handleDrop : undefined}
              >
                <div className="rounded-2xl bg-slate-950/90 backdrop-blur-2xl overflow-hidden">

                  {/* Card chrome: macOS dots + mono path */}
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex gap-1.5" aria-hidden="true">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="flex-1 text-center font-mono text-[11px] text-slate-400 tracking-tight">
                      neklikni://prover
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">v2.1</span>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-white/5" role="tablist">
                    <button
                      role="tab"
                      aria-selected={activeTab === "zprava"}
                      onClick={() => setActiveTab("zprava")}
                      className={`group relative flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                        activeTab === "zprava"
                          ? "text-white"
                          : "text-slate-300 hover:text-white bg-fuchsia-500/[0.07] hover:bg-fuchsia-500/[0.12]"
                      }`}
                    >
                      <MessageSquare size={15} />
                      <span>SMS / E-mail</span>
                      {activeTab !== "zprava" && (
                        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-70 animate-ping" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
                        </span>
                      )}
                      {activeTab === "zprava" && (
                        <span className="absolute inset-x-3 -bottom-px h-[2px] bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 rounded-full" />
                      )}
                    </button>
                    <button
                      role="tab"
                      aria-selected={activeTab === "subjekt"}
                      onClick={() => setActiveTab("subjekt")}
                      className={`group relative flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                        activeTab === "subjekt"
                          ? "text-white"
                          : "text-slate-300 hover:text-white bg-fuchsia-500/[0.07] hover:bg-fuchsia-500/[0.12]"
                      }`}
                    >
                      <UserSearch size={15} />
                      <span>Ověřit prodejce/účet</span>
                      {activeTab !== "subjekt" && (
                        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-70 animate-ping" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
                        </span>
                      )}
                      {activeTab === "subjekt" && (
                        <span className="absolute inset-x-3 -bottom-px h-[2px] bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* TAB 1 — Message analysis */}
                  {activeTab === "zprava" && (
                    <div className="relative">
                      {isDragging && (
                        <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-500 border-dashed z-10 flex items-center justify-center pointer-events-none">
                          <p className="text-purple-300 font-bold text-lg">Přetáhněte obrázek sem</p>
                        </div>
                      )}

                      {/* Example chips */}
                      <div className="flex flex-wrap gap-2 px-5 pt-4">
                        {EXAMPLES.map((ex) => (
                          <button
                            key={ex.label}
                            onClick={() => { setInput(ex.text); setResult(null); setError(null); }}
                            className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-gradient-to-r hover:from-purple-500/15 hover:to-blue-500/15 hover:text-white hover:border-purple-400/40 active:scale-95 transition-all duration-200"
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>

                      {/* Header row */}
                      <div className="flex items-center justify-between px-5 pt-4 pb-1">
                        <p className="flex items-center gap-2 text-slate-200 text-[13px] font-semibold">
                          <Sparkles size={13} className="text-purple-400" />
                          Vlož zprávu, AI odhalí podvod během chvilky
                        </p>
                        {(input || images.length > 0 || result || error) && (
                          <button
                            onClick={handleClear}
                            aria-label="Vymazat vstup"
                            className="shrink-0 w-7 h-7 rounded-full text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Textarea */}
                      <div className={`relative mx-3 mb-3 rounded-xl transition-all ${
                        isFocused
                          ? "ring-2 ring-purple-500/40 shadow-[0_0_40px_-15px_rgba(168,85,247,0.45)]"
                          : ""
                      }`}>
                        {!input && !isFocused && (
                          <div className="absolute inset-0 px-4 pt-3 pb-4 pointer-events-none text-slate-600 text-[15px] leading-normal">
                            {placeholderText}<span className="animate-pulse">|</span>
                          </div>
                        )}
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          rows={4}
                          aria-label="Vstupní pole pro analýzu zprávy"
                          className="w-full bg-black/30 rounded-xl px-4 pt-3 pb-4 focus:outline-none text-white text-[15px] resize-none placeholder:text-slate-600 border border-white/5"
                        />
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                      />

                      <div className="px-3 pb-3 space-y-2.5">
                        {loading ? (
                          <AnalysisScanner />
                        ) : (
                          <>
                            <button
                              onClick={handleAnalysis}
                              disabled={!input.trim() && images.length === 0}
                              className="group relative w-full overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                              <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                              Prověřit zprávu
                            </button>

                            {images.length > 0 && (
                              <div className="px-1 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <p className="text-slate-400">
                                    Screenshoty připravené k analýze · {images.length}/{MAX_IMAGES}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setImages([])}
                                    className="text-slate-500 hover:text-red-400 transition-colors"
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
                                        className="w-14 h-14 object-cover rounded-lg border border-white/10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeImageAt(idx)}
                                        aria-label={`Odebrat screenshot ${idx + 1}`}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 border border-white/20 text-slate-300 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                      >
                                        <X size={11} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {images.length < MAX_IMAGES && (
                              canUploadImage ? (
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-full flex items-center justify-center gap-2 border border-dashed border-purple-500/40 hover:border-purple-400/70 text-purple-300 hover:text-purple-200 hover:bg-purple-500/5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                                >
                                  <Camera size={14} /> {images.length === 0 ? "Přidat screenshot" : "Přidat další"} <span className="text-purple-400/60 ml-1">(až {MAX_IMAGES})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { window.location.href = "/pricing"; }}
                                  className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-purple-300 text-xs transition-colors py-1.5"
                                >
                                  <Lock size={12} /> Přidat screenshot <span className="text-purple-400/60 ml-1">(BASIC+)</span>
                                </button>
                              )
                            )}

                            <p className="text-slate-600 text-[10px] text-center hidden sm:block">
                              Ctrl + Enter pro odeslání · Esc pro smazání
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2 — Subject lookup */}
                  {activeTab === "subjekt" && (
                    <div className="p-5 space-y-4">
                      <div>
                        <p className="flex items-center gap-2 text-slate-200 text-[13px] font-semibold mb-1">
                          <UserSearch size={13} className="text-cyan-300" />
                          Ověř protistranu v databázi nahlášených incidentů
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Vlož telefon, e-mail nebo číslo účtu. Najdeš záznam, nebo doporučení, jak ověřit jinak.
                        </p>
                      </div>

                      <form
                        onSubmit={handleSubjectSearch}
                        className="space-y-2.5"
                      >
                        <label htmlFor="hero_db_q" className="sr-only">
                          Identifikátor k vyhledání
                        </label>
                        <input
                          id="hero_db_q"
                          name="q"
                          type="search"
                          required
                          value={subjectQuery}
                          onChange={(e) => { setSubjectQuery(e.target.value); setSubjectError(null); }}
                          placeholder="+420 ... | email@... | 12345/0100"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-[15px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                        {subjectError && (
                          <p className="text-amber-400 text-xs leading-relaxed">{subjectError}</p>
                        )}
                        <button
                          type="submit"
                          className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white py-3.5 font-bold text-sm sm:text-base shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all"
                        >
                          <SearchIcon size={16} />
                          Ověřit v databázi
                        </button>
                      </form>

                      {/* DB stats inline */}
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
                        <span>
                          <span className="font-semibold text-slate-200">
                            {dbStats.subjects !== null && dbStats.subjects > 0
                              ? dbStats.subjects.toLocaleString("cs-CZ")
                              : "—"}
                          </span>{" "}
                          subjektů
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>
                          <span className="font-semibold text-slate-200">
                            {dbStats.incidents !== null && dbStats.incidents > 0
                              ? dbStats.incidents.toLocaleString("cs-CZ")
                              : "—"}
                          </span>{" "}
                          nahlášení
                        </span>
                      </div>

                      {/* Secondary actions: contribute + learn more */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-white/5">
                        <Link
                          href="/databaze/nahlasit"
                          className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-200 hover:border-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          <Plus size={14} />
                          Nahlásit incident
                        </Link>
                        <Link
                          href="/databaze"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-purple-300 transition-colors"
                        >
                          Jak databáze funguje
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-5 py-2.5 border-t border-white/5 bg-white/[0.02]">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-slate-500 text-center">
                      ŠIFROVÁNO • ANONYMNÍ • OBSAH SE NEUKLÁDÁ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Results / scanner / cross-reference / viral share ──── */}
        <section className="w-full flex justify-center relative z-10 mt-10">
        <div ref={resultRef} className="w-full max-w-3xl px-4 space-y-4 text-center scroll-mt-24">

          {error && <div className="max-w-3xl mx-auto w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-300 text-sm">{error}</div>}

          {result && (
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 ${riskBorderColor} p-8 sm:p-10 text-left max-w-3xl mx-auto w-full`}>
              <div className="flex flex-col items-center text-center mb-8 gap-4">
                <RiskGauge value={result.risk} size={200} />
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">{result.verdict}</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Info size={14} /> Analýza</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
                </div>

                {result.threats && result.threats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Identifikované hrozby</h4>
                    <ul className="space-y-1">
                      {result.threats.map((threat, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm"><span className="text-red-400 mt-0.5 shrink-0">•</span> {threat}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.tactics && result.tactics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Shield size={14} /> Taktiky útočníka</h4>
                    <ul className="space-y-1">
                      {result.tactics.map((tactic, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm"><span className="text-yellow-400 mt-0.5 shrink-0">▸</span> {tactic}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="italic text-slate-300 text-sm text-center">"{result.recommendation}"</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-slate-600 text-xs">
                    {!result.tier || result.tier === "free"
                      ? result.remainingChecks !== undefined && (
                          <span>Zbývá dnes: <span className="text-slate-400 font-bold">{result.remainingChecks}/2</span></span>
                        )
                      : result.credits !== undefined && (
                          <span>Zbývá: <span className="text-slate-400 font-bold">{result.credits.toLocaleString("cs-CZ")} kreditů</span></span>
                        )
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 text-xs border border-purple-500 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-500/10 transition-colors">
                      <Download size={14} /> Stáhnout report
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl">
                      {copied ? <><Check size={14} className="text-green-400" /> Zkopírováno!</> : <><Share2 size={14} /> Sdílet varování</>}
                    </button>
                  </div>
                </div>

                <p className="text-slate-400 text-sm text-center leading-relaxed pt-2 border-t border-white/5">
                  ⚠️ {DISCLAIMER}
                </p>
              </div>
            </div>
          )}

          {result?.database_matches && result.database_matches.length > 0 && (
            <div className="max-w-3xl mx-auto w-full rounded-[32px] border-2 border-red-500/40 bg-red-950/30 backdrop-blur-3xl shadow-2xl p-8 sm:p-10 text-left space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-red-200">
                  🚨 Nález v databázi nahlášených incidentů
                </h3>
                <p className="text-sm text-red-200/80">
                  V textu zprávy jsme našli identifikátory, které jsou evidovány v databázi nahlášených incidentů.
                </p>
              </div>
              <ul className="space-y-3">
                {result.database_matches.map((m, i) => (
                  <li
                    key={`${m.type}-${m.value_masked}-${i}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4"
                  >
                    <div className="text-sm text-slate-100">
                      <span className="font-bold">{dbMatchLabel(m.type, m.value_masked)}</span>{" "}
                      <span className="font-mono text-red-200">{m.value_masked}</span>
                      <span className="text-slate-300"> — nahlášeno v {m.incident_count}{" "}
                        {m.incident_count === 1
                          ? "incidentu"
                          : m.incident_count >= 2 && m.incident_count <= 4
                          ? "incidentech"
                          : "incidentech"}
                      </span>
                    </div>
                    <a
                      href={`/databaze/hledat?q=${encodeURIComponent(m.query_value)}`}
                      className="shrink-0 text-xs font-semibold text-red-200 hover:text-white underline underline-offset-2"
                    >
                      Zobrazit v databázi →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result?.shareId && (() => {
            const shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://neklikni.cz"}/report/${result.shareId}`;
            const waText = encodeURIComponent(`Pozor na tento podvod! Podívej se na analýzu: ${shareUrl}`);
            return (
              <div className="max-w-3xl mx-auto w-full bg-amber-900/20 border border-amber-700/30 rounded-[32px] p-8 space-y-5">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-white">⚠️ Varujte svou rodinu a přátele</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">Sdílejte tento výsledek, aby se vaši blízcí nenechali nachytat.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    💬 WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    📘 Facebook
                  </a>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      setCtaCopied(true);
                      setTimeout(() => setCtaCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    {ctaCopied ? <><Check size={16} className="text-green-400" /> Odkaz zkopírován!</> : <><Copy size={16} /> Kopírovat odkaz</>}
                  </button>
                  <button
                    onClick={async () => { if (navigator.share) await navigator.share({ title: "NeKlikni.cz – Varování", text: "Pozor na tento podvod! Podívej se na analýzu:", url: shareUrl }); }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all active:scale-95 sm:hidden"
                  >
                    <Share2 size={16} /> Sdílet
                  </button>
                </div>
              </div>
            );
          })()}

          {result && (
            <ReferralCard isLoggedIn={profileChecked ? profile !== null : null} />
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