import SectionTag from "./SectionTag";

export default function PageHero({
  tag,
  title,
  highlight,
  description,
}: {
  tag: string;
  title: string;
  highlight?: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, var(--primary), transparent 55%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
        <SectionTag>{tag}</SectionTag>
        <h1 className="mt-6 text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-5xl md:text-6xl">
          {title}{" "}
          {highlight && <span className="text-primary">{highlight}</span>}
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
