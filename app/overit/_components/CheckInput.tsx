"use client";

/**
 * Vstupní pole pro /overit — jedno textarea pro libovolný text (zpráva,
 * odkaz, telefon, účet, e-mail…) + 3 dlaždice jako lehká nápověda.
 *
 * Dlaždice jsou ČISTĚ kosmetické — jen zaostří textarea a upraví
 * placeholder na konkrétnější formulaci. NEMĚNÍ odesílaný text ani
 * neposílají žádný "kontext" — lib/inputParser.ts žádný takový parametr
 * nezná, parser si poradí sám z holého textu.
 */

import { useRef, useState } from "react";
import { MessageSquareWarning, ShoppingBag, Link2, Search, Lock, ImagePlus } from "lucide-react";

const MIN_LEN = 2;
const MAX_LEN = 5000;

const DEFAULT_PLACEHOLDER =
  "Vlož podezřelou zprávu, odkaz, telefon, číslo účtu nebo e-mail…";

const HINTS = [
  {
    key: "sms" as const,
    label: "Přišla mi zpráva/SMS",
    icon: MessageSquareWarning,
    placeholder: "Vlož zprávu, kterou jsi dostal/a (SMS, e-mail, chat)…",
  },
  {
    key: "prodejce" as const,
    label: "Kupuju od prodejce",
    icon: ShoppingBag,
    placeholder: "Vlož telefon, e-mail nebo odkaz na profil prodejce…",
  },
  {
    key: "eshop" as const,
    label: "Ověřuju e-shop/odkaz",
    icon: Link2,
    placeholder: "Vlož adresu e-shopu nebo odkaz, který chceš ověřit…",
  },
];

type HintKey = (typeof HINTS)[number]["key"];

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export default function CheckInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [activeHint, setActiveHint] = useState<HintKey | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;
  const tooLong = value.length > MAX_LEN;
  const canSubmit = !disabled && trimmed.length >= MIN_LEN && !tooLong;

  const placeholder =
    HINTS.find((h) => h.key === activeHint)?.placeholder ?? DEFAULT_PLACEHOLDER;

  function handleHintClick(key: HintKey) {
    setActiveHint((prev) => (prev === key ? null : key));
    textareaRef.current?.focus();
  }

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
          placeholder={placeholder}
          disabled={disabled}
          rows={5}
          maxLength={MAX_LEN + 200}
          className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:opacity-60"
        />
        <div className="absolute bottom-3 right-4 text-[11px] text-muted-foreground tabular-nums">
          {value.length}/{MAX_LEN}
        </div>

        {/* Screenshoty jsou dnes vždy placená funkce (stejně jako u
            /api/analyze) — tohle je jen pasivní vizuální upsell.
            TODO: /api/check zatím obrázky vůbec nepodporuje (na rozdíl
            od /api/analyze), takže tlačítko není funkční ani pro
            platící uživatele — až vznikne podpora, nahradit skutečným
            uploadem s tier-check (free → zámek, oneshot/full → upload). */}
        <button
          type="button"
          disabled
          title="Dostupné s Full nebo jednorázovou analýzou"
          aria-label="Nahrát screenshot — dostupné s Full nebo jednorázovou analýzou"
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card/80 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground cursor-not-allowed"
        >
          <ImagePlus size={13} />
          <Lock size={11} />
        </button>
      </div>

      {tooLong && (
        <p className="text-xs text-destructive">Text je příliš dlouhý. Maximum je {MAX_LEN} znaků.</p>
      )}
      {tooShort && (
        <p className="text-xs text-muted-foreground">Zadej aspoň {MIN_LEN} znaky.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {HINTS.map((hint) => {
          const Icon = hint.icon;
          const isActive = activeHint === hint.key;
          return (
            <button
              key={hint.key}
              type="button"
              onClick={() => handleHintClick(hint.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon size={13} /> {hint.label}
            </button>
          );
        })}
      </div>

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
