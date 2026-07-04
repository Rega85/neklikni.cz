/**
 * Faux e-mail — hlavička (od/předmět) + tělo, jako reálný e-mailový
 * klient. Světlé pozadí schválně (viz SmsBubble/BrowserMock).
 */

interface EmailMockProps {
  from: string;
  subject: string;
  body: string;
}

export default function EmailMock({ from, subject, body }: EmailMockProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="space-y-1 pb-3 border-b border-gray-200">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-gray-500 shrink-0">Od:</span>
          <span className="font-medium text-gray-900 truncate">{from}</span>
        </div>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-gray-500 shrink-0">Předmět:</span>
          <span className="font-semibold text-gray-900">{subject}</span>
        </div>
      </div>
      <div className="pt-3 text-[15px] leading-relaxed text-gray-800 whitespace-pre-line break-words">
        {body}
      </div>
    </div>
  );
}
