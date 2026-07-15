import Link from "next/link";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import type { PostFrontmatter } from "@/lib/blog";
import { getAllPosts } from "@/lib/blog";

export default function ArticleLayout({
  article,
  children,
}: {
  article: PostFrontmatter & { slug: string };
  children: React.ReactNode;
}) {
  const dateText = new Date(article.publishedAt).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const related = getAllPosts().filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Zpět na blog
        </Link>

        <article className="space-y-6 animate-fade-up">
          <header className="space-y-4">
            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              {article.category}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-[1.1]">
              {article.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">{article.description}</p>
            <div className="flex items-center gap-5 text-xs text-muted-foreground pt-2 border-b border-border pb-5">
              <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {dateText}</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {article.readMinutes} min čtení</span>
            </div>
          </header>

          <div className="prose prose-invert max-w-none article-content">
            {children}
          </div>
        </article>

        {/* CTA box */}
        <div className="surface-card-elevated p-6 sm:p-8 mt-12 animate-fade-up">
          <h3 className="text-xl font-black tracking-tighter mb-2">
            Máš podezřelou zprávu? Nechej AI, ať ji prověří.
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Vlož text — odpověď do 3 sekund. Zdarma a bez registrace.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-5 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/30 transition-all active:scale-[0.98]"
          >
            Vyzkoušet zdarma
          </Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-black tracking-tighter mb-5">Mohlo by tě zajímat</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="surface-card p-5 hover:border-primary/40 transition-colors group"
                >
                  <span className="inline-block text-[9px] font-black uppercase tracking-widest text-primary mb-2">
                    {r.category}
                  </span>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                    {r.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
