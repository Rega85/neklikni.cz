"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Info, Shield, AlertTriangle, Share2, Check, X, Copy, Camera, Lock, Download, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import HomeSections from "./components/HomeSections";
import DatabazeGateway from "./components/DatabazeGateway";
import { HomeSchema } from "./components/StructuredData";
import { trackEvent } from "./lib/analytics";
import ErrorBoundary from "./components/ErrorBoundary";
import RiskGauge from "./components/RiskGauge";
import UpsellModal from "./components/UpsellModal";
import DecoderText from "./components/DecoderText";
import HeroParticles from "./components/HeroParticles";
import AnalysisScanner from "./components/AnalysisScanner";

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

const DB_MATCH_TYPE_LABEL: Record<DatabaseMatch["type"], string> = {
  phone: "Telefon",
  account: "Číslo účtu",
  email: "E-mail",
  facebook_url: "Facebook profil",
  var_symbol: "Variabilní symbol",
  other: "Identifikátor",
};

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
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [upsellReason, setUpsellReason] = useState<"anon_daily" | "no_credits" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Hero spotlight: track mouse and update CSS vars for radial gradient
  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    if (window.matchMedia?.("(hover: none)").matches) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, []);

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
      .catch(() => {});
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Obrázek je příliš velký. Maximum jsou 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setImage(b64);
      setImagePreview(b64);
      setInput("");
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalysis = useCallback(async () => {
    if ((!input.trim() && !image) || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    trackEvent("analyze_started", { kind: image ? "image" : "text" });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image ? { image } : { text: input }),
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
          setError(data.message || "Nedostatek kreditů.");
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
  }, [input, image, loading, profile?.tier]);

  const handleClear = () => { setInput(""); setResult(null); setError(null); setImage(null); setImagePreview(null); };

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
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Lze přetáhnout pouze obrázky."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Obrázek je příliš velký. Maximum jsou 4 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setImage(b64); setImagePreview(b64); setInput(""); setResult(null); setError(null);
    };
    reader.readAsDataURL(file);
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

  const canUploadImage = !!profile?.tier && ["basic", "pro", "oneshot", "easy"].includes(profile.tier);

  const riskBorderColor = !result ? "" : result.risk >= 70 ? "border-red-500/30" : result.risk >= 40 ? "border-yellow-500/30" : "border-green-500/30";

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <HomeSchema />
      <main className="flex-grow text-white pt-20 px-4 sm:px-6 pb-8 flex flex-col items-center relative">
        <HeroParticles />
        <div className="max-w-4xl w-full space-y-4 text-center relative z-10">

          <div ref={spotlightRef} className="spotlight space-y-2 relative z-10">
            <h1 className="flex flex-col items-center justify-center font-black uppercase tracking-normal font-mono-fallback">
              <DecoderText
                text="PROVĚŘ"
                className="text-4xl sm:text-5xl md:text-6xl text-white leading-tight"
              />
              <DecoderText
                text="NEŽ KLIKNEŠ"
                duration={1100}
                className="text-xl sm:text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700 leading-tight"
              />
            </h1>

            <p className="text-slate-400 text-sm">
              <span>✓ 100% anonymní</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>✓ Základní prověření zdarma</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>✓ Neukládáme váš obsah</span>
            </p>

          </div>

          {/* Joint umbrella heading for both gateways (AI + Database) */}
          <div className="pt-6 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dva způsoby, jak se chránit
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
              Prověř podezřelou zprávu, nebo si ověř člověka, než mu pošleš peníze.
            </p>
          </div>

          {/* AI gateway subheading */}
          <h3 className="text-lg sm:text-xl font-bold text-slate-200 pt-2">
            Máš podezřelou zprávu?
          </h3>

          <div className="flex flex-wrap justify-center gap-2.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setInput(ex.text); setResult(null); setError(null); }}
                  className="group px-4 py-2 rounded-full text-[13px] font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-gradient-to-r hover:from-purple-500/15 hover:to-blue-500/15 hover:text-white hover:border-purple-400/40 active:scale-95 transition-all duration-200"
                >
                  {ex.label}
                </button>
              ))}
            </div>

          {(!loading || result) && (
          <div
            className={`scan-border relative mx-auto max-w-3xl rounded-[32px] transition-all duration-300 ${
              isFocused
                ? "ring-2 ring-purple-500/40 shadow-[0_0_60px_-15px_rgba(168,85,247,0.45)]"
                : isDragging
                  ? "ring-2 ring-purple-500/60 shadow-[0_0_60px_-15px_rgba(168,85,247,0.55)]"
                  : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden">
            {isDragging && (
              <div className="absolute inset-0 rounded-[32px] bg-purple-500/10 border-2 border-purple-500 border-dashed z-10 flex items-center justify-center pointer-events-none">
                <p className="text-purple-300 font-bold text-lg">Přetáhněte obrázek sem</p>
              </div>
            )}

            {/* Header row with friendly prompt + clear icon button */}
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <p className="flex items-center gap-2 text-slate-200 text-sm font-semibold text-left">
                <Sparkles size={14} className="text-purple-400" />
                Vlož zprávu, AI odhalí podvod během chvilky
              </p>
              {(input || image || result || error) && (
                <button
                  onClick={handleClear}
                  aria-label="Vymazat vstup"
                  className="shrink-0 w-7 h-7 rounded-full text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="relative">
              {!input && !isFocused && (
                <div className="absolute inset-0 px-6 pt-2 pb-5 pointer-events-none text-slate-600 text-base sm:text-lg leading-normal">
                  {placeholderText}<span className="animate-pulse">|</span>
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                rows={3}
                aria-label="Vstupní pole pro analýzu zprávy"
                className="w-full bg-transparent px-6 pt-2 pb-5 focus:outline-none text-white text-base sm:text-lg resize-none placeholder:text-slate-600"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="p-4 border-t border-white/5 bg-white/[0.02] space-y-3">
              {/* Main CTA — gradient + sparkles, friendlier sentence-case */}
              <button
                onClick={handleAnalysis}
                disabled={loading || (!input.trim() && !image)}
                className="group relative w-full overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Analyzuji…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                    Prověřit zprávu
                  </>
                )}
              </button>

              {/* Screenshot upload - secondary */}
              {imagePreview ? (
                <div className="flex items-center gap-3 px-1">
                  <img src={imagePreview} alt="Náhled" className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                  <p className="flex-1 text-xs text-slate-400 truncate">Screenshot připraven k analýze</p>
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    aria-label="Odebrat screenshot"
                    className="w-7 h-7 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : canUploadImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-purple-500/40 hover:border-purple-400/70 text-purple-300 hover:text-purple-200 hover:bg-purple-500/5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  <Camera size={14} /> Přidat screenshot
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { window.location.href = "/pricing"; }}
                  className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-purple-300 text-xs transition-colors py-1.5"
                >
                  <Lock size={12} /> Přidat screenshot <span className="text-purple-400/60 ml-1">(BASIC+)</span>
                </button>
              )}

              <p className="text-slate-600 text-[10px] text-center hidden sm:block">Ctrl + Enter pro odeslání · Esc pro smazání</p>
            </div>
            </div>
          </div>
          )}

          {error && <div className="max-w-3xl mx-auto w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-300 text-sm">{error}</div>}

          {loading && !result && <AnalysisScanner />}

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
                      <span className="font-bold">{DB_MATCH_TYPE_LABEL[m.type] ?? "Identifikátor"}</span>{" "}
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
        </div>

        <DatabazeGateway />

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