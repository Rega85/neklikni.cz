"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { LogOut, Zap, ChevronDown, User, KeyRound, Home, Receipt, Sparkles, Gift, BookOpen, Menu, X, Tag, Database, Flag, Users, ArrowRight, Gamepad2 } from "lucide-react";
import BrandLogo from "./BrandLogo";
import SocialLinks from "./SocialLinks";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free:  { label: "FREE",  color: "text-muted-foreground",  bg: "bg-secondary"  },
  easy:  { label: "EASY",  color: "text-primary",   bg: "bg-primary/10"   },
  basic: { label: "BASIC", color: "text-primary", bg: "bg-primary/10" },
  pro:   { label: "PRO",   color: "text-warning", bg: "bg-warning/10" },
};

const navItems = [
  { href: "/", label: "Domů", icon: Home },
  { href: "/databaze", label: "Databáze", icon: Database },
  { href: "/databaze/nahlasit", label: "Nahlásit podvod", icon: Flag, accent: true },
  { href: "/test", label: "Otestuj se", icon: Gamepad2, accent: true },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/pricing", label: "Ceník", icon: Tag },
];

export default function Header() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setUser(data.user);
          setProfile(data.profile);
          setIsAdmin(data.is_admin === true);
        }
      } else {
        if (mountedRef.current) { setUser(null); setProfile(null); setIsAdmin(false); }
      }
    } catch {
      if (mountedRef.current) { setUser(null); setProfile(null); setIsAdmin(false); }
    } finally {
      if (mountedRef.current) setInitialLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchMe();
    const handleUpdate = () => fetchMe();
    window.addEventListener("creditsUpdated", handleUpdate);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("creditsUpdated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setMobileNavOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile drawer when route changes (Link click)
  const closeMobile = () => setMobileNavOpen(false);

  // When user clicks a "home" link and is already on /, no navigation happens
  // (Next.js doesn't re-mount). Reset homepage state via custom event so the
  // analysis result/text clears and the page returns to its initial state.
  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("homeReset"));
      window.scrollTo({ top: 0, behavior: "smooth" });
      setMobileNavOpen(false);
      setMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/databaze") return pathname.startsWith("/databaze") && !pathname.startsWith("/databaze/nahlasit");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isAdminModerace = pathname.startsWith("/admin/moderace");
  const isAdminUzivatele = pathname.startsWith("/admin/uzivatele");

  const navBase = "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors";
  const navActive = "bg-secondary text-foreground";
  const navInactive = "text-muted-foreground hover:text-foreground";

  const mobileBase = "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-semibold";
  const mobileInactive = "hover:bg-secondary text-muted-foreground hover:text-foreground";
  const mobileActive = "bg-secondary text-foreground";

  const tier = profile?.tier || "free";
  const tc = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const credits = profile?.credits_remaining ?? 0;
  const maxCredits = tier === "pro" ? 200 : tier === "basic" ? 50 : tier === "easy" ? 10 : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">

        <div className="flex items-center gap-6">
          <Link href="/" onClick={handleHomeClick} className="flex items-center gap-2 shrink-0 group">
            <BrandLogo size={32} className="group-hover:scale-105 transition-transform" />
            <span className="font-bold text-lg text-foreground tracking-tight">
              NEKLIKNI<span className="brand-gradient-text">.CZ</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.filter((item) => !item.accent).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.href === "/" ? handleHomeClick : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 ${navBase} ${active ? navActive : navInactive}`}
                >
                  <Icon size={14} /> {item.label}
                </Link>
              );
            })}

            {/* "Nahlásit podvod" — akce, ne navigace: oddělená, zvýrazněná */}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            {navItems.filter((item) => item.accent).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  <Icon size={14} className="text-primary" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Upgrade CTA: prominent for free users — desktop only */}
          {!initialLoading && user && tier === "free" && (
            <Link
              href="/pricing"
              className="hidden lg:inline-flex items-center gap-1.5 brand-gradient text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-lg shadow-lg shadow-primary/25 hover:brightness-110 transition-all active:scale-95"
            >
              <Sparkles size={13} fill="currentColor" />
              <span>Upgradovat</span>
            </Link>
          )}

          {/* Mobile hamburger — visible only on small screens */}
          <div className="lg:hidden relative" ref={mobileNavRef}>
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={mobileNavOpen ? "Zavřít menu" : "Otevřít menu"}
              aria-expanded={mobileNavOpen}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {mobileNavOpen && (
              <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-up">
                <div className="p-2 space-y-0.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={(e) => { if (item.href === "/") handleHomeClick(e); closeMobile(); }}
                        aria-current={active ? "page" : undefined}
                        className={`${mobileBase} ${active ? mobileActive : mobileInactive}`}
                      >
                        <Icon size={16} className={`shrink-0 ${item.accent && !active ? "text-primary" : ""}`} /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                  {user && (
                    <Link href="/referral" onClick={closeMobile} className={`${mobileBase} ${mobileInactive}`}>
                      <Gift size={16} className="text-success shrink-0" /><span>Pozvi přátele <span className="text-success text-[10px] font-bold uppercase tracking-wider ml-1">+5</span></span>
                    </Link>
                  )}
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin/moderace"
                        onClick={closeMobile}
                        aria-current={isAdminModerace ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl border border-primary/30 transition-colors text-sm font-semibold ${isAdminModerace ? "bg-primary/20 text-foreground" : "bg-primary/10 hover:bg-primary/20 text-foreground"}`}
                      >
                        <Flag size={16} className="text-primary shrink-0" />
                        <span>Moderace</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/30 text-foreground px-1.5 py-0.5 rounded">ADMIN</span>
                      </Link>
                      <Link
                        href="/admin/uzivatele"
                        onClick={closeMobile}
                        aria-current={isAdminUzivatele ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl border border-primary/30 transition-colors text-sm font-semibold ${isAdminUzivatele ? "bg-primary/20 text-foreground" : "bg-primary/10 hover:bg-primary/20 text-foreground"}`}
                      >
                        <Users size={16} className="text-primary shrink-0" />
                        <span>Uživatelé</span>
                      </Link>
                    </>
                  )}
                </div>

                {!initialLoading && user && tier === "free" && (
                  <div className="p-2 border-t border-border">
                    <Link
                      href="/pricing"
                      onClick={closeMobile}
                      className="flex items-center justify-center gap-2 brand-gradient text-primary-foreground text-xs font-semibold px-3 py-2.5 rounded-xl shadow-lg shadow-primary/25 transition-all"
                    >
                      <Sparkles size={12} fill="currentColor" /> Upgradovat
                    </Link>
                  </div>
                )}

                {!initialLoading && !user && (
                  <div className="p-2 border-t border-border space-y-1.5">
                    <Link
                      href="/login"
                      onClick={closeMobile}
                      className="flex items-center justify-center px-3 py-2.5 rounded-xl font-semibold text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      Přihlásit
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMobile}
                      className="flex items-center justify-center gap-2 brand-gradient text-primary-foreground px-3 py-2.5 rounded-xl font-semibold text-sm transition-all"
                    >
                      Registrovat zdarma <ArrowRight size={14} />
                    </Link>
                  </div>
                )}

                <div className="px-3 py-3 border-t border-border flex items-center justify-center">
                  <SocialLinks size={22} />
                </div>
              </div>
            )}
          </div>

          {initialLoading ? (
            <div className="w-28 h-9 bg-secondary rounded-full animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Otevřít menu účtu" aria-expanded={menuOpen} className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-full border border-border transition-colors">
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-bold text-primary-foreground shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex flex-col leading-none text-left hidden sm:flex">
                  <span className={`text-[9px] font-bold uppercase ${tc.color}`}>{tc.label}</span>
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{profile !== null ? `${credits.toLocaleString("cs-CZ")} kreditů` : "načítám..."}</span>
                </div>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-border bg-secondary/40">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center text-base font-bold text-primary-foreground shrink-0">{user.email?.[0]?.toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-semibold truncate">{user.email}</p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tc.color} ${tc.bg}`}>{tc.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Zbývající kredity</span>
                      <span className="text-foreground font-bold text-xl">{credits.toLocaleString("cs-CZ")}</span>
                    </div>
                    {maxCredits > 0 && (
                      <div className="w-full bg-secondary rounded-full h-1.5 mb-3">
                        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (credits / maxCredits) * 100)}%` }} />
                      </div>
                    )}
                    <Link href="/pricing" onClick={() => setMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-primary hover:brightness-110 text-primary-foreground text-xs font-bold uppercase py-2.5 rounded-xl transition-colors">
                      <Zap size={12} fill="currentColor" /> {tier === "free" ? "Koupit kredity" : "Dobít kredity"}
                    </Link>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <Link
                      href="/"
                      onClick={(e) => { handleHomeClick(e); setMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      <Home size={16} className="shrink-0" /><span>Hlavní stránka</span>
                    </Link>
                    <Link href="/databaze/nahlasit" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm">
                      <Flag size={16} className="shrink-0" /><span>Nahlásit podvod</span>
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm">
                      <User size={16} className="shrink-0" /><span>Můj profil</span>
                    </Link>
                    <Link href="/billing" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm">
                      <Receipt size={16} className="shrink-0" /><span>Fakturace & předplatné</span>
                    </Link>
                    <Link href="/referral" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm">
                      <Gift size={16} className="text-success shrink-0" /><span>Pozvi přátele <span className="text-success text-[10px] font-bold uppercase tracking-wider ml-1">+5 analýz</span></span>
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          href="/admin/moderace"
                          onClick={() => setMenuOpen(false)}
                          aria-current={isAdminModerace ? "page" : undefined}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary/30 transition-colors text-sm ${isAdminModerace ? "bg-primary/20 text-foreground" : "bg-primary/10 hover:bg-primary/20 text-foreground"}`}
                        >
                          <Flag size={16} className="text-primary shrink-0" />
                          <span>Moderace</span>
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/30 text-foreground px-1.5 py-0.5 rounded">ADMIN</span>
                        </Link>
                        <Link
                          href="/admin/uzivatele"
                          onClick={() => setMenuOpen(false)}
                          aria-current={isAdminUzivatele ? "page" : undefined}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary/30 transition-colors text-sm ${isAdminUzivatele ? "bg-primary/20 text-foreground" : "bg-primary/10 hover:bg-primary/20 text-foreground"}`}
                        >
                          <Users size={16} className="text-primary shrink-0" />
                          <span>Uživatelé</span>
                        </Link>
                      </>
                    )}
                    <Link href="/update-password" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm">
                      <KeyRound size={16} className="shrink-0" /><span>Změna hesla</span>
                    </Link>
                  </div>

                  <div className="p-2 border-t border-border">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-sm">
                      <LogOut size={16} className="shrink-0" /><span>Odhlásit se</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Přihlásit
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 brand-gradient text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg shadow-lg shadow-primary/25 hover:brightness-110 transition-all active:scale-95"
              >
                Registrovat zdarma
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
