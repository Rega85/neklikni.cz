import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { ARTICLES } from "./_data/articles";
import PageHero from "@/app/components/PageHero";

export const metadata: Metadata = {
  title: "Blog — phishing v Česku | NeKlikni.cz",
  description:
    "Praktické články o phishingu, podvodných SMS a ochraně proti útokům na bankovní účty v Česku. Konkrétní ukázky a obrana.",
  alternates: { canonical: "https://www.neklikni.cz/blog" },
};

const CATEGORY_COLOR: Record<string, string> = {
  "Phishing":             "text-primary bg-primary/10 border-primary/20",
  "Bankovní podvody":     "text-primary bg-primary/10 border-primary/20",
  "SMS podvody":          "text-warning bg-warning/10 border-warning/20",
  "Tipy":                 "text-success bg-success/10 border-success/20",
  "Marketplace podvody":  "text-warning bg-warning/10 border-warning/20",
  "Investiční podvody":   "text-destructive bg-destructive/10 border-destructive/20",
};

export default function BlogIndex() {
  return (
    <main className="min-h-screen">
      <PageHero
        tag="Blog"
        title="Phishing v Česku"
        highlight="prakticky"
        description="Konkrétní podvody, jak je rozeznat a co dělat. Žádná teorie — jen reálné případy z roku 2025/2026."
      />
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid sm:grid-cols-2 gap-5">
          {ARTICLES.map((a, i) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="surface-card p-6 sm:p-7 hover:border-primary/40 flex flex-col group animate-fade-up transition-colors"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${CATEGORY_COLOR[a.category] ?? "text-muted-foreground bg-secondary border-border"}`}>
                  {a.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock size={11} /> {a.readMinutes} min
                </span>
              </div>

              <h2 className="text-xl font-black tracking-tight mb-2 leading-snug group-hover:text-primary transition-colors">
                {a.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{a.description}</p>

              <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-primary">
                Číst dál
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
