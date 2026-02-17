"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Zap, Share2, Lock, LogOut, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { risk: number | string, verdict: string }>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Při načtení stránky zkontroluj, jestli je uživatel přihlášený
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const analyzeScam = async () => {
    if (!input) return;
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      
      const data = await response.json();

      if (response.status === 429) {
        setResult({ 
          risk: "LIMIT",
          verdict: data.message || "Denní limit vyčerpán. Přejdi na PRO verzi pro neomezený přístup." 
        });
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setResult({ 
          risk: 0, 
          verdict: data.details || data.error || "Chyba: AI mozek se nepodařilo kontaktovat." 
        });
        setLoading(false);
        return;
      }
      
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ 
        risk: 0, 
        verdict: "Chyba spojení. Zkontroluj si internet." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-hidden">
      {/* Navbar */}
      <nav className="w-full px-6 py-4 flex justify-between items-center z-20">
        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          NeKlikni.cz
        </span>
        <div className="flex items-center gap-3">
          {authLoading ? null : user ? (
            <>
              <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
                <User size={16} className="text-green-400" />
                <span className="text-sm text-slate-300">{user.email}</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">PRO</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <LogOut size={16} /> Odhlásit
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Přihlásit se
            </button>
          )}
        </div>
      </nav>

      {/* Animované částice na pozadí */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute h-2 w-2 bg-blue-500 rounded-full top-1/4 left-1/4 animate-ping"></div>
        <div className="absolute h-2 w-2 bg-purple-500 rounded-full top-3/4 left-2/3 animate-pulse"></div>
        <div className="absolute h-1 w-1 bg-white rounded-full top-1/2 left-1/2 animate-bounce"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="z-10 w-full max-w-2xl space-y-8 text-center">
          <header className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              NeKlikni.cz
            </h1>
            <p className="text-slate-400 text-lg">AI bodyguard pro tvůj klidný internet.</p>
          </header>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-2 rounded-3xl shadow-2xl flex items-center focus-within:border-blue-500/50 transition-colors">
            <textarea 
              className="flex-1 bg-transparent p-4 outline-none resize-none h-24 placeholder:text-slate-600 text-lg"
              placeholder="Vlož podezřelou zprávu, SMS nebo odkaz..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              onClick={analyzeScam}
              disabled={loading || !input}
              className="mr-2 p-6 bg-gradient-to-br from-blue-500 to-purple-700 rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group"
            >
              {loading ? <Zap className="animate-spin text-white" /> : <ShieldAlert className="text-white group-hover:animate-pulse" />}
            </button>
          </div>

          {result && (
            <div className={`animate-in fade-in slide-in-from-top-4 p-8 rounded-3xl border-2 transition-all 
              ${result.risk === "LIMIT" ? 'border-amber-500/50 bg-amber-500/10' : 
                (result.risk as number) > 50 ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
              
              <div className={`text-5xl font-black mb-3 
                ${result.risk === "LIMIT" ? 'text-amber-400' : 
                  (result.risk as number) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                {result.risk === "LIMIT" ? (
                  <span className="flex items-center justify-center gap-3">
                    <Lock size={40} /> {result.risk}
                  </span>
                ) : (
                  `${result.risk}% RIZIKO`
                )}
              </div>

              <p className={`text-xl font-medium mb-6 ${result.risk === "LIMIT" ? 'opacity-100 text-amber-200' : 'opacity-80'}`}>
                {result.verdict}
              </p>

              {result.risk === "LIMIT" ? (
                <button 
                  onClick={() => router.push('/login')}
                  className="flex items-center justify-center w-full gap-2 mx-auto px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl transition-all font-bold text-white shadow-lg hover:shadow-amber-500/25"
                >
                  Odemknout PRO verzi
                </button>
              ) : (
                <button className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white font-medium">
                  <Share2 size={18} /> Sdílet varování
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}