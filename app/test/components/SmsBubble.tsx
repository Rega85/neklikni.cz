/**
 * Faux SMS bublina — mimikuje vzhled zprávy na telefonu (odesílatel +
 * čas nahoře, bublina), ale v barvách webu (--card/--secondary/--primary),
 * ne bílý ostrov nalepený na tmavé pozadí. Rozpoznatelné jako SMS,
 * zasazené do stejné vizuální řeči jako zbytek neklikni.cz.
 */

interface SmsBubbleProps {
  sender: string;
  time: string;
  body: string;
}

export default function SmsBubble({ sender, time, body }: SmsBubbleProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/25 p-3.5 sm:p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
          {sender.trim().charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{sender}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">{time}</span>
        </div>
      </div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-[15px] leading-snug text-foreground whitespace-pre-line break-words">
        {body}
      </div>
    </div>
  );
}
