# write-all.ps1 - Zapise soubory pres Python (UTF-8 bezpecne)

# Zkontroluj Python
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
if (-not $py) { Write-Host "CHYBA: Python nenalezen"; exit 1 }

Write-Host "Pisu soubory pres Python..."

python -c "
import os

header = '''\"use client\";

import { useEffect, useState, useRef } from \"react\";
import Link from \"next/link\";
import { createClient } from \"@/utils/supabase/client\";
import { Shield, LogOut, Zap, ChevronDown, User, KeyRound, Home, Receipt } from \"lucide-react\";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free:  { label: \"FREE\",  color: \"text-slate-400\",  bg: \"bg-slate-500/10\"  },
  easy:  { label: \"EASY\",  color: \"text-blue-400\",   bg: \"bg-blue-500/10\"   },
  basic: { label: \"BASIC\", color: \"text-purple-400\", bg: \"bg-purple-500/10\" },
  pro:   { label: \"PRO\",   color: \"text-yellow-400\", bg: \"bg-yellow-500/10\" },
};

export default function Header() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(\`/api/me?t=\${Date.now()}\`, { cache: \"no-store\" });
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) { setUser(data.user); setProfile(data.profile); }
      } else {
        if (mountedRef.current) { setUser(null); setProfile(null); }
      }
    } catch {
      if (mountedRef.current) { setUser(null); setProfile(null); }
    } finally {
      if (mountedRef.current) setInitialLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchMe();
    const handleUpdate = () => fetchMe();
    window.addEventListener(\"creditsUpdated\", handleUpdate);
    return () => {
      mountedRef.current = false;
      window.removeEventListener(\"creditsUpdated\", handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener(\"mousedown\", handler);
    return () => document.removeEventListener(\"mousedown\", handler);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = \"/\";
  };

  const tier = profile?.tier || \"free\";
  const tc = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const credits = profile?.credits_remaining ?? 0;
  const maxCredits = tier === \"pro\" ? 200 : tier === \"basic\" ? 50 : tier === \"easy\" ? 10 : 0;

  return (
    <header className=\"fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16\">
      <div className=\"max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between\">
        <div className=\"flex items-center gap-6\">
          <Link href=\"/\" className=\"flex items-center gap-2 shrink-0\">
            <div className=\"bg-purple-600 p-1.5 rounded-lg\">
              <Shield size={18} className=\"text-white\" fill=\"currentColor\" />
            </div>
            <span className=\"font-black text-lg text-white uppercase tracking-tighter\">NEKLIKNI.CZ</span>
          </Link>
          <nav className=\"hidden sm:flex items-center gap-4\">
            <Link href=\"/\" className=\"flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors\">
              <Home size={13} /> Dom\u016f
            </Link>
          </nav>
        </div>
        <div className=\"flex items-center gap-3\">
          <Link href=\"/pricing\" className=\"text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors hidden sm:block\">Cen\u00edk</Link>
          {initialLoading ? (
            <div className=\"w-28 h-9 bg-white/5 rounded-full animate-pulse\" />
          ) : user ? (
            <div className=\"relative\" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className=\"flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 transition-colors\">
                <div className=\"w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0\">
                  {user.email?.[0]?.toUpperCase() ?? \"U\"}
                </div>
                <div className=\"flex flex-col leading-none text-left hidden sm:flex\">
                  <span className={\`text-[9px] font-black uppercase \${tc.color}\`}>{tc.label}</span>
                  <span className=\"text-[10px] font-bold text-slate-400 mt-0.5\">{profile !== null ? \`\${credits.toLocaleString(\"cs-CZ\")} kredit\u016f\` : \"na\u010d\u00edt\u00e1m...\"}</span>
                </div>
                <ChevronDown size={14} className={\`text-slate-500 transition-transform \${menuOpen ? \"rotate-180\" : \"\"}\`} />
              </button>
              {menuOpen && (
                <div className=\"absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50\">
                  <div className=\"p-4 border-b border-white/5 bg-white/[0.02]\">
                    <div className=\"flex items-center gap-3\">
                      <div className=\"w-11 h-11 bg-purple-600 rounded-full flex items-center justify-center text-base font-black text-white shrink-0\">{user.email?.[0]?.toUpperCase()}</div>
                      <div className=\"min-w-0\">
                        <p className=\"text-white text-sm font-bold truncate\">{user.email}</p>
                        <span className={\`text-[10px] font-black uppercase px-2 py-0.5 rounded-full \${tc.color} \${tc.bg}\`}>{tc.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className=\"p-4 border-b border-white/5\">
                    <div className=\"flex items-center justify-between mb-1\">
                      <span className=\"text-slate-400 text-[10px] font-black uppercase tracking-widest\">Zb\u00fdvaj\u00edc\u00ed kredity</span>
                      <span className=\"text-white font-black text-xl\">{credits.toLocaleString(\"cs-CZ\")}</span>
                    </div>
                    {maxCredits > 0 && (
                      <div className=\"w-full bg-slate-800 rounded-full h-1.5 mb-3\">
                        <div className=\"bg-purple-500 h-1.5 rounded-full transition-all\" style={{ width: \`\${Math.min(100, (credits / maxCredits) * 100)}%\` }} />
                      </div>
                    )}
                    <Link href=\"/pricing\" onClick={() => setMenuOpen(false)} className=\"w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase py-2.5 rounded-xl transition-colors\">
                      <Zap size={12} fill=\"currentColor\" /> {tier === \"free\" ? \"Koupit kredity\" : \"Dob\u00edt kredity\"}
                    </Link>
                  </div>
                  <div className=\"p-2 space-y-0.5\">
                    <Link href=\"/\" onClick={() => setMenuOpen(false)} className=\"flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm\">
                      <Home size={16} className=\"text-slate-500 shrink-0\" /><span>Hlavn\u00ed str\u00e1nka</span>
                    </Link>
                    <Link href=\"/profile\" onClick={() => setMenuOpen(false)} className=\"flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm\">
                      <User size={16} className=\"text-slate-500 shrink-0\" /><span>M\u016fj profil</span>
                    </Link>
                    <Link href=\"/billing\" onClick={() => setMenuOpen(false)} className=\"flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm\">
                      <Receipt size={16} className=\"text-slate-500 shrink-0\" /><span>Fakturace &amp; p\u0159edplatn\u00e9</span>
                    </Link>
                    <Link href=\"/update-password\" onClick={() => setMenuOpen(false)} className=\"flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm\">
                      <KeyRound size={16} className=\"text-slate-500 shrink-0\" /><span>Zm\u011bna hesla</span>
                    </Link>
                  </div>
                  <div className=\"p-2 border-t border-white/5\">
                    <button onClick={handleSignOut} className=\"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors text-sm\">
                      <LogOut size={16} className=\"shrink-0\" /><span>Odhl\u00e1sit se</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href=\"/login\" className=\"bg-white text-black px-5 py-2 rounded-lg font-black text-xs hover:bg-slate-200 transition-colors\">P\u0158IHL\u00c1SIT</Link>
          )}
        </div>
      </div>
    </header>
  );
}
'''

page = '''\"use client\";

import { useState, useEffect, useCallback } from \"react\";
import Link from \"next/link\";
import { Loader2, Zap, Info, Shield, AlertTriangle, CheckCircle, Share2, Check, X } from \"lucide-react\";
import { createClient } from \"@/utils/supabase/client\";

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
};

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [input, setInput] = useState(\"\");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(\"neklikni_total\");
      if (cached) setTotalAnalyses(parseInt(cached, 10));
    } catch {}
    fetch(\`/api/stats?t=\${Date.now()}\`, { cache: \"no-store\" })
      .then((r) => r.json())
      .then((d) => {
        const total = d.total ?? null;
        if (total !== null) {
          setTotalAnalyses(total);
          try { localStorage.setItem(\"neklikni_total\", String(total)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(\"/api/analyze\", {
        method: \"POST\",
        credentials: \"include\",
        headers: { \"Content-Type\": \"application/json\" },
        body: JSON.stringify({ text: input }),
      });
      const contentType = res.headers.get(\"content-type\");
      if (!contentType?.includes(\"application/json\")) {
        throw new Error(\"Server neodpov\u011bd\u011bl. Mo\u017en\u00e1 je p\u0159et\u00ed\u017een, zkuste to znovu.\");
      }
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.limitReached) setError(data.message || \"Denn\u00ed limit vy\u010derp\u00e1n.\");
        else if (res.status === 402) setError(data.message || \"Nedostatek kredit\u016f.\");
        else setError(data.error || \"N\u011bco se pokazilo. Zkuste to znovu.\");
        return;
      }
      setResult(data);
      window.dispatchEvent(new CustomEvent(\"creditsUpdated\"));
      setTotalAnalyses((prev) => {
        const next = prev !== null ? prev + 1 : null;
        if (next !== null) { try { localStorage.setItem(\"neklikni_total\", String(next)); } catch {} }
        return next;
      });
    } catch (err: any) {
      setError(err.message || \"Nepoda\u0159ilo se p\u0159ipojit k serveru.\");
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleClear = () => { setInput(\"\"); setResult(null); setError(null); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === \"Enter\") handleAnalysis();
    if (e.key === \"Escape\") handleClear();
  };
  const handleShare = async () => {
    const url = result?.shareId ? \`\${window.location.origin}/result/\${result.shareId}\` : window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskColor = !result ? \"\" : result.risk >= 70 ? \"text-red-400\" : result.risk >= 40 ? \"text-yellow-400\" : \"text-green-400\";
  const riskBorderColor = !result ? \"\" : result.risk >= 70 ? \"border-red-500/30\" : result.risk >= 40 ? \"border-yellow-500/30\" : \"border-green-500/30\";
  const RiskIcon = !result ? Shield : result.risk >= 40 ? AlertTriangle : CheckCircle;

  return (
    <div className=\"flex flex-col min-h-screen bg-[#020617]\">
      <main className=\"flex-grow text-white pt-28 px-4 sm:px-6 pb-20 flex flex-col items-center\">
        <div className=\"max-w-4xl w-full space-y-10 text-center\">
          <div className=\"space-y-6\">
            <div className=\"inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest\">
              <Zap size={10} fill=\"currentColor\" /> AI Security v4.6
            </div>
            <h1 className=\"flex flex-col items-center justify-center font-black italic uppercase tracking-tighter\">
              <span className=\"text-5xl sm:text-6xl md:text-7xl text-white leading-tight\">PROV\u011e\u0158</span>
              <span className=\"text-5xl sm:text-6xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700 leading-tight\">
                NE\u017d KLIKNE\u0160
              </span>
            </h1>
            <p className=\"text-slate-500 text-xs font-bold uppercase tracking-widest mt-2\">
              Komunitn\u00ed \u0161t\u00edt:{\" \"}
              {totalAnalyses !== null ? (
                <span className=\"text-white text-lg font-black\">{totalAnalyses.toLocaleString(\"cs-CZ\")}</span>
              ) : (
                <span className=\"inline-block w-16 h-5 bg-slate-800 rounded animate-pulse align-middle\" />
              )}{\" \"}
              hrozeb odhaleno
            </p>
          </div>

          <div className=\"bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl mx-auto max-w-3xl flex flex-col\">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=\"Vlo\u017ete podez\u0159el\u00fd text, SMS, email nebo URL...\"
              className=\"w-full bg-transparent p-6 outline-none text-white text-base sm:text-lg min-h-[160px] resize-none placeholder:text-slate-600 rounded-t-[32px]\"
            />
            <div className=\"flex items-center justify-between p-4 border-t border-white/5 bg-white/[0.02] rounded-b-[32px]\">
              <span className=\"text-slate-600 text-[10px] hidden sm:block\">Ctrl+Enter \u00b7 Esc pro smaz\u00e1n\u00ed</span>
              <div className=\"flex items-center gap-2 ml-auto\">
                {(input || result || error) && (
                  <button onClick={handleClear} className=\"flex items-center gap-1.5 px-4 py-3 rounded-2xl font-black text-xs text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 transition-all\">
                    <X size={13} /> Vymazat
                  </button>
                )}
                <button onClick={handleAnalysis} disabled={loading || !input.trim()} className=\"bg-white text-black px-12 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed\">
                  {loading ? <Loader2 className=\"animate-spin\" size={18} /> : \"PROV\u011e\u0158IT\"}
                </button>
              </div>
            </div>
          </div>

          {error && <div className=\"max-w-3xl mx-auto w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-300 text-sm\">{error}</div>}

          {result && (
            <div className={\`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 \${riskBorderColor} p-8 sm:p-10 text-left max-w-3xl mx-auto w-full\`}>
              <div className=\"text-center mb-8\">
                <div className={\`text-7xl font-black mb-2 \${riskColor}\`}>{result.risk}%</div>
                <div className={\`inline-flex items-center gap-2 mb-3 \${riskColor}\`}>
                  <RiskIcon size={20} />
                  <span className=\"font-black uppercase text-sm tracking-widest\">{result.risk >= 70 ? \"Vysok\u00e9 riziko\" : result.risk >= 40 ? \"St\u0159edn\u00ed riziko\" : \"N\u00edzk\u00e9 riziko\"}</span>
                </div>
                <h2 className=\"text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-white\">{result.verdict}</h2>
              </div>
              <div className=\"space-y-6\">
                <div className=\"space-y-2\">
                  <h4 className=\"text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2\"><Info size={14} /> Anal\u00fdza</h4>
                  <p className=\"text-slate-300 text-sm leading-relaxed\">{result.analysis}</p>
                </div>
                {result.threats && result.threats.length > 0 && (
                  <div className=\"space-y-2\">
                    <h4 className=\"text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2\"><AlertTriangle size={14} /> Identifikovan\u00e9 hrozby</h4>
                    <ul className=\"space-y-1\">{result.threats.map((threat, i) => (<li key={i} className=\"flex items-start gap-2 text-slate-300 text-sm\"><span className=\"text-red-400 mt-0.5 shrink-0\">\u2022</span> {threat}</li>))}</ul>
                  </div>
                )}
                {result.tactics && result.tactics.length > 0 && (
                  <div className=\"space-y-2\">
                    <h4 className=\"text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2\"><Shield size={14} /> Taktiky \u00fato\u010dn\u00edka</h4>
                    <ul className=\"space-y-1\">{result.tactics.map((tactic, i) => (<li key={i} className=\"flex items-start gap-2 text-slate-300 text-sm\"><span className=\"text-yellow-400 mt-0.5 shrink-0\">\u25b8</span> {tactic}</li>))}</ul>
                  </div>
                )}
                <div className=\"p-4 rounded-2xl bg-white/5 border border-white/5\"><p className=\"italic text-slate-300 text-sm text-center\">\"{result.recommendation}\"</p></div>
                <div className=\"flex items-center justify-between pt-2\">
                  <div className=\"text-slate-600 text-xs\">{result.remainingChecks !== undefined && (<span>Zb\u00fdv\u00e1 dnes: <span className=\"text-slate-400 font-bold\">{result.remainingChecks}/3</span></span>)}</div>
                  <button onClick={handleShare} className=\"flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl\">
                    {copied ? <><Check size={14} className=\"text-green-400\" /> Zkopirov\u00e1no!</> : <><Share2 size={14} /> Sd\u00edlet varov\u00e1n\u00ed</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className=\"w-full bg-[#020617] mt-auto border-t border-white/5 pt-8 pb-4\">
        <div className=\"max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8 text-xs text-slate-500\">
          <div className=\"space-y-3\">
            <div className=\"flex items-center gap-2\">
              <Shield size={16} className=\"text-purple-500\" />
              <span className=\"font-black text-white uppercase tracking-tighter text-sm\">Neklikni.cz</span>
            </div>
            <p>\u00a9 {new Date().getFullYear()} V\u0161echna pr\u00e1va vyhrazena.</p>
          </div>
          <div className=\"flex flex-col md:flex-row gap-8 md:gap-16\">
            <div className=\"space-y-1 leading-relaxed\">
              <p className=\"text-slate-300 font-bold mb-2 uppercase text-[10px] tracking-widest\">Provozovatel</p>
              <p>PK Virgine, s.r.o.</p>
              <p>I\u010cO: 21448507, DI\u010c: CZ21448507</p>
              <p>Korunn\u00ed 2569/108, Vinohrady, 101 00 Praha</p>
              <p>Datov\u00e1 schr\u00e1nka: bty8mey</p>
              <p>Spisov\u00e1 zna\u010dka: C 401405/MSPH M\u011bstsk\u00fd soud v Praze</p>
            </div>
            <div className=\"space-y-2 flex flex-col\">
              <p className=\"text-slate-300 font-bold mb-1 uppercase text-[10px] tracking-widest\">Informace</p>
              <Link href=\"/privacy\" prefetch={false} className=\"hover:text-white transition-colors\">Ochrana osobn\u00edch \u00fadaj\u016f</Link>
              <Link href=\"/terms\" prefetch={false} className=\"hover:text-white transition-colors\">Obchodn\u00ed podm\u00ednky</Link>
              <Link href=\"/contact\" prefetch={false} className=\"hover:text-white transition-colors\">Kontakt</Link>
            </div>
          </div>
        </div>
        <div className=\"max-w-7xl mx-auto px-6 mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-600 text-center leading-relaxed\">
          V\u00fdsledky anal\u00fdzy vygenerovan\u00e9 um\u011blou inteligenc\u00ed maj\u00ed informativn\u00ed charakter. Technologie se m\u016f\u017ee m\u00fdlit \u2014 posledn\u00ed rozhodnut\u00ed je v\u017edy na V\u00e1s.
        </div>
      </footer>
    </div>
  );
}
'''

billing = '''\"use client\";

import { useEffect, useState } from \"react\";
import { Loader2, CreditCard, Zap, ExternalLink } from \"lucide-react\";
import Link from \"next/link\";

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [data, setData] = useState<{user: any, profile: any} | null>(null);

  useEffect(() => {
    fetch(\`/api/me?t=\${Date.now()}\`, { cache: \"no-store\" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(\"/api/portal\", { method: \"POST\" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error(\"Chyba port\u00e1lu\", e);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return (
    <div className=\"min-h-screen bg-[#020617] flex items-center justify-center\">
      <Loader2 className=\"animate-spin text-purple-500\" size={32} />
    </div>
  );

  if (!data?.profile) return (
    <div className=\"min-h-screen bg-[#020617] flex items-center justify-center text-white\">
      <div className=\"text-center space-y-4\">
        <p className=\"text-slate-400\">Nejste p\u0159ihl\u00e1\u0161eni.</p>
        <Link href=\"/login\" className=\"bg-white text-black px-6 py-2 rounded-lg font-black text-xs\">P\u0158IHLASIT SE</Link>
      </div>
    </div>
  );

  const tier = data.profile.tier || \"free\";

  return (
    <main className=\"min-h-screen bg-[#020617] text-white pt-28 px-4 sm:px-6 pb-20\">
      <div className=\"max-w-2xl mx-auto space-y-6\">
        <h1 className=\"text-3xl font-black uppercase italic tracking-tighter\">Fakturace &amp; P\u0159edplatn\u00e9</h1>
        <div className=\"bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-4\">
          <div className=\"flex items-center justify-between\">
            <div>
              <p className=\"text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1\">Aktu\u00e1ln\u00ed tarif</p>
              <p className=\"text-white font-black text-2xl\">{tier.toUpperCase()}</p>
            </div>
            <CreditCard size={32} className=\"text-purple-500\" />
          </div>
          <div>
            <p className=\"text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1\">Zb\u00fdvaj\u00edc\u00ed kredity</p>
            <p className=\"text-white font-black text-2xl\">{(data.profile.credits_remaining ?? 0).toLocaleString(\"cs-CZ\")}</p>
          </div>
        </div>
        <Link href=\"/pricing\" className=\"w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black uppercase py-4 rounded-2xl transition-colors\">
          <Zap size={16} fill=\"currentColor\" /> Zm\u011bnit tarif nebo dob\u00edt
        </Link>
        <div className=\"bg-slate-900/40 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center space-y-4\">
          <p className=\"text-slate-400 text-sm leading-relaxed\">Faktury, historii plateb a nastaven\u00ed platebn\u00ed karty spravujeme bezpe\u010dn\u011b p\u0159es slu\u017ebu Stripe.</p>
          <button onClick={handlePortal} disabled={portalLoading} className=\"flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-sm transition-colors disabled:opacity-50\">
            {portalLoading ? <Loader2 size={16} className=\"animate-spin\" /> : <ExternalLink size={16} />}
            Spravovat platby ve Stripe
          </button>
        </div>
      </div>
    </main>
  );
}
'''

os.makedirs('app/components', exist_ok=True)
os.makedirs('app/billing', exist_ok=True)

with open('app/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(header)
print('OK: Header.tsx')

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(page)
print('OK: page.tsx')

with open('app/billing/page.tsx', 'w', encoding='utf-8') as f:
    f.write(billing)
print('OK: billing/page.tsx')
"

Write-Host "Hotovo! Spust: git add . && git commit -m fix-utf8 && git push"
