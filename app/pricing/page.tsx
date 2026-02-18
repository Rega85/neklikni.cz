"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Shield, Crown } from "lucide-react";

type Plan = "easy" | "basic" | "pro";

export default function PricingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const router = useRouter();

  const handleCheckout = async (plan: Plan) => {
    setLoading(plan);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }), // ✅ POSÍLÁME PLAN
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        alert("Chyba: " + (data?.error ?? `HTTP ${res.status}`));
        return;
      }

      if (data?.url) {
        window.location.href = data.url; // ✅ přesměrování na Stripe
        return;
      }

      alert("Chyba: server nevrátil checkout URL.");
    } catch (err) {
      console.error(err);
      alert("Něco se pokazilo. Zkus to prosím znovu.");
    } finally {
      setLoading(null);
    }
  };

  const disabled = loading !== null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-20 px-6">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Vyber si svou ochranu
        </h1>
        <p className="text-slate-400 text-lg">
          Zabezpeč svůj digitální život dřív, než bude pozdě.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full">
        {/* EASY */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-blue-400" />
            <h2 className="text-2xl font-bold">EASY</h2>
          </div>
          <div className="text-4xl font-black mb-2">29 Kč</div>
          <p className="text-slate-400 text-sm mb-8">Jednorázová platba</p>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3">
              <Check className="text-green-400 shrink-0" /> 10 AI analýz
            </li>
            <li className="flex gap-3">
              <Check className="text-green-400 shrink-0" /> Rychlý model (Haiku)
            </li>
            <li className="flex gap-3">
              <Check className="text-green-400 shrink-0" /> Neomezená platnost kreditů
            </li>
          </ul>

          <button
            onClick={() => handleCheckout("easy")}
            disabled={disabled}
            className="w-full py-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {loading === "easy" ? "Načítám pokladnu..." : "Koupit balíček"}
          </button>
        </div>

        {/* BASIC */}
        <div className="bg-gradient-to-b from-blue-900/40 to-slate-900 border border-blue-500/50 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-blue-900/20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
            NEJOBLÍBENĚJŠÍ
          </div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <Shield className="text-blue-400" />
            <h2 className="text-2xl font-bold">BASIC</h2>
          </div>

          <div className="text-4xl font-black mb-2">
            99 Kč<span className="text-lg text-slate-400 font-normal"> / měs.</span>
          </div>

          <p className="text-blue-300/80 text-sm mb-8">Klid na celý měsíc</p>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3">
              <Check className="text-blue-400 shrink-0" /> 50 analýz měsíčně
            </li>
            <li className="flex gap-3">
              <Check className="text-blue-400 shrink-0" /> Rychlý model (Haiku)
            </li>
            <li className="flex gap-3">
              <Check className="text-blue-400 shrink-0" /> Automatická obnova
            </li>
          </ul>

          <button
            onClick={() => handleCheckout("basic")}
            disabled={disabled}
            className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-60"
          >
            {loading === "basic" ? "Načítám pokladnu..." : "Získat BASIC"}
          </button>
        </div>

        {/* PRO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="text-purple-400" />
            <h2 className="text-2xl font-bold">PRO</h2>
          </div>

          <div className="text-4xl font-black mb-2">
            199 Kč<span className="text-lg text-slate-400 font-normal"> / měs.</span>
          </div>

          <p className="text-slate-400 text-sm mb-8">Pro náročné uživatele</p>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3">
              <Check className="text-purple-400 shrink-0" /> 200 analýz měsíčně
            </li>
            <li className="flex gap-3">
              <Check className="text-purple-400 shrink-0" /> <b>Elitní model</b>
            </li>
            <li className="flex gap-3">
              <Check className="text-purple-400 shrink-0" /> Hloubkový rozbor podvodu
            </li>
            <li className="flex gap-3">
              <Check className="text-purple-400 shrink-0" /> Až 12 000 znaků na zprávu
            </li>
          </ul>

          <button
            onClick={() => handleCheckout("pro")}
            disabled={disabled}
            className="w-full py-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {loading === "pro" ? "Načítám pokladnu..." : "Získat PRO"}
          </button>
        </div>
      </div>
    </div>
  );
}
