import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight, Sparkles } from "lucide-react";
import { ARTICLES } from "./_data/articles";

export const metadata: Metadata = {
  title: "Blog — phishing v Česku | NeKlikni.cz",
  description:
    "Praktické články o phishingu, podvodných SMS a ochraně proti útokům na bankovní účty v Česku. Konkrétní ukázky a obrana.",
  alternates: { canonical: "https://www.neklikni.cz/blog" },
};

const CATEGORY_COLOR: Record<string, string> = {
  "Phishing":             "text-purple-300 bg-purple-500/10 border-purple-400/20",
  "Bankovní podvody":     "text-blue-300 bg-blue-500/10 border-blue-400/20",
  "SMS podvody":          "text-amber-300 bg-amber-500/10 border-amber-400/20",
  "Tipy":                 "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  "Marketplace podvody":  "text-orange-300 bg-orange-500/10 border-orange-400/20",
  "Investiční podvody":   "text-red-300 bg-red-500/10 border-red-400/20",
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        <header className="text-center space-y-4 mb-12 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Blog
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter">
            Phishing v Česku{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              prakticky
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Konkrétní podvody, jak je rozeznat a co dělat. Žádná teorie — jen reálné případy z roku 2025/2026.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-5">
          {ARTICLES.map((a, i) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="surface-card p-6 sm:p-7 hover:bg-white/[0.04] flex flex-col group animate-fade-up transition-colors"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${CATEGORY_COLOR[a.category] ?? "text-slate-300 bg-white/5 border-white/10"}`}>
                  {a.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock size={11} /> {a.readMinutes} min
                </span>
              </div>

              <h2 className="text-xl font-black tracking-tight mb-2 leading-snug group-hover:text-purple-200 transition-colors">
                {a.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed flex-1">{a.description}</p>

              <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-purple-300 group-hover:text-purple-200">
                Číst dál
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
