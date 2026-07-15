"use client";

/**
 * Vstupní pole pro /overit — jedno textarea pro libovolný text (zpráva,
 * odkaz, telefon, účet, e-mail…).
 *
 * Placeholder rotuje mezi příklady toho, co se dá vložit (SMS, doména
 * e-shopu, telefon, číslo účtu) — čistě ambientní nápověda, žádné
 * přepínání režimu. Pole samo se chová vždycky stejně bez ohledu na
 * to, jaký příklad je zrovna vidět.
 */

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

const MIN_LEN = 2;
const MAX_LEN = 5000;

const PLACEHOLDER_EXAMPLES = [
  "Vlož podezřelou zprávu, odkaz, telefon, číslo účtu nebo e-mail…",
  "Přišla mi SMS o nedoručeném balíku…",
  "levneiphony.cz",
  "+420 777 123 456",
  "Číslo účtu z inzerátu na bazaru…",
];

const ROTATE_INTERVAL_MS = 3500;

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export default function CheckInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;
  const tooLong = value.length > MAX_LEN;
  const canSubmit = !disabled && trimmed.length >= MIN_LEN && !tooLong;

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
          disabled={disabled}
          rows={5}
          maxLength={MAX_LEN + 200}
          className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:opacity-60"
        />
        <div className="absolute bottom-3 right-4 text-[11px] text-muted-foreground tabular-nums">
          {value.length}/{MAX_LEN}
        </div>

        {/* TODO: vrátit zmínku o screenshotech (upload tlačítko) po
            dodělání image uploadu do /api/check — /api/check zatím
            obrázky vůbec nepřijímá, takže tady dřív bylo natvrdo
            disabled tlačítko slibující "Dostupné s Full nebo jednorázovou
            analýzou", což ve skutečnosti nešlo odemknout ani platícím
            uživatelům. Radši žádný náznak funkce než falešný slib. */}
      </div>

      {tooLong && (
        <p className="text-xs text-destructive">Text je příliš dlouhý. Maximum je {MAX_LEN} znaků.</p>
      )}
      {tooShort && (
        <p className="text-xs text-muted-foreground">Zadej aspoň {MIN_LEN} znaky.</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary hover:brightness-110 px-6 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <Search size={18} /> Ověřit
      </button>
    </form>
  );
}
