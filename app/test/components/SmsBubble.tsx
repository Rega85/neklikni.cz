/**
 * Faux SMS bublina — mimikuje nativní vzhled zprávy na telefonu
 * (odesílatel + čas nahoře, šedá bublina), ne screenshot/obrázek.
 * Světlé pozadí schválně, i v tmavém tématu webu — reálné SMS appky
 * jsou skoro vždy světlé, tak to působí autenticky.
 */

interface SmsBubbleProps {
  sender: string;
  time: string;
  body: string;
}

export default function SmsBubble({ sender, time, body }: SmsBubbleProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3.5 sm:p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
          {sender.trim().charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{sender}</span>
          <span className="text-[11px] text-gray-500 shrink-0">{time}</span>
        </div>
      </div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-gray-200 px-3.5 py-2.5 text-[15px] leading-snug text-gray-900 whitespace-pre-line break-words">
        {body}
      </div>
    </div>
  );
}
