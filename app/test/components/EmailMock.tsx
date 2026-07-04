/**
 * Faux e-mail — hlavička (od/předmět) + tělo, v barvách webu. Labely
 * "Od"/"Předmět" stylizované stejně jako sekční labely v AI verdikt
 * panelu (text-primary font-black uppercase tracking-widest), aby to
 * neslo stejný vizuální podpis jako zbytek webu.
 */

interface EmailMockProps {
  from: string;
  subject: string;
  body: string;
}

export default function EmailMock({ from, subject, body }: EmailMockProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/15 p-4 sm:p-5">
      <div className="space-y-1.5 pb-3 border-b border-border/60">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-primary font-black uppercase text-[10px] tracking-widest shrink-0">Od</span>
          <span className="font-medium text-foreground truncate">{from}</span>
        </div>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-primary font-black uppercase text-[10px] tracking-widest shrink-0">Předmět</span>
          <span className="font-semibold text-foreground">{subject}</span>
        </div>
      </div>
      <div className="pt-3 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line break-words">
        {body}
      </div>
    </div>
  );
}
