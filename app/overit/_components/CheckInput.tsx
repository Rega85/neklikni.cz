"use client";

/**
 * Vstupní pole pro /overit — jedno textarea pro libovolný text (zpráva,
 * odkaz, telefon, účet, e-mail…) + volitelný upload screenshotů.
 *
 * Placeholder rotuje mezi příklady toho, co se dá vložit — čistě
 * ambientní nápověda, žádné přepínání režimu.
 *
 * Upload screenshotů (Full/Jednorázová):
 *  - Žádný `capture` atribut na file inputu — cílovka nahrává
 *    typicky existující screenshot z galerie, ne novou fotku. `capture`
 *    na některých mobilních prohlížečích upřednostní/omezí na
 *    fotoaparát a mohl by tak schovat "vybrat z galerie" — pro jistotu
 *    radši obyčejný <input type="file"> se širokým nativním pickerem
 *    (Fotky/Galerie/Soubory/Fotoaparát), který funguje spolehlivě
 *    napříč iOS i Android.
 *  - Obrázky se před odesláním komprimují na klientovi (canvas resize
 *    na max ~1600px + JPEG) — jednak kvůli limitu velikosti requestu
 *    u serverless funkce, jednak to Claude stejně zmenší interně na
 *    ~1568px, takže se nic neztrácí.
 *  - free/anonymní uživatel nevidí mrtvé tlačítko — klik ukáže inline
 *    nabídku s odkazem na ceník, text v poli zůstává zachovaný.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, ImagePlus, X, Loader2, Lock } from "lucide-react";

const MIN_LEN = 2;
const MAX_LEN = 5000;
const MAX_IMAGES = 2;
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024; // sanity strop před kompresí
const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_JPEG_QUALITY = 0.8;

const PLACEHOLDER_EXAMPLES = [
  "Vlož podezřelou zprávu, odkaz, telefon, číslo účtu nebo e-mail…",
  "Přišla mi SMS o nedoručeném balíku…",
  "levneiphony.cz",
  "+420 777 123 456",
  "Číslo účtu z inzerátu na bazaru…",
];

const ROTATE_INTERVAL_MS = 3500;

interface UploadedImage {
  id: string;
  previewUrl: string;
}

interface Props {
  onSubmit: (text: string, images?: string[]) => void;
  disabled?: boolean;
  /** true = oneshot/full, obrázky reálně fungují. false/null (anon) = zamčeno. */
  canUploadImages: boolean;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height / width) * COMPRESS_MAX_DIMENSION);
            width = COMPRESS_MAX_DIMENSION;
          } else {
            width = Math.round((width / height) * COMPRESS_MAX_DIMENSION);
            height = COMPRESS_MAX_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Zpracování obrázku není v tomhle prohlížeči podporováno."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", COMPRESS_JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error("Obrázek se nepodařilo načíst."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Soubor se nepodařilo přečíst."));
    reader.readAsDataURL(file);
  });
}

export default function CheckInput({ onSubmit, disabled, canUploadImages }: Props) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showUploadUpsell, setShowUploadUpsell] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextIdRef = useRef(0);

  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;
  const tooLong = value.length > MAX_LEN;
  const canSubmit =
    !disabled && !tooLong && processingCount === 0 && (trimmed.length >= MIN_LEN || images.length > 0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  async function addFiles(files: File[]) {
    setImageError(null);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setImageError(`Maximum ${MAX_IMAGES} screenshoty na jednu kontrolu.`);
      return;
    }
    const toProcess = files.slice(0, room);
    if (files.length > room) {
      setImageError(`Přijal/a jsem první ${room === 1 ? "1 obrázek" : `${room} obrázky`}. Limit je ${MAX_IMAGES}.`);
    }

    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) {
        setImageError("Lze nahrávat pouze obrázky (screenshoty).");
        continue;
      }
      if (file.size > MAX_RAW_FILE_BYTES) {
        setImageError(`Soubor "${file.name}" je příliš velký.`);
        continue;
      }
      const id = String(nextIdRef.current++);
      setProcessingCount((n) => n + 1);
      try {
        const dataUrl = await compressImage(file);
        setImages((prev) => [...prev, { id, previewUrl: dataUrl }]);
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Obrázek se nepodařilo zpracovat.");
      } finally {
        setProcessingCount((n) => n - 1);
      }
    }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  function handleUploadButtonClick() {
    if (!canUploadImages) {
      setShowUploadUpsell((v) => !v);
      return;
    }
    fileInputRef.current?.click();
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) void addFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!canUploadImages) return;
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (!canUploadImages) {
      setShowUploadUpsell(true);
      return;
    }
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) void addFiles(files);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed, images.length > 0 ? images.map((img) => img.previewUrl) : undefined);
  }

  const placeholder = images.length > 0
    ? "Chceš k obrázku připsat i pár slov? (nepovinné)"
    : PLACEHOLDER_EXAMPLES[placeholderIndex];

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center pointer-events-none">
            <p className="text-primary font-bold text-sm">Přetáhni screenshot sem</p>
          </div>
        )}
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {tooLong && (
        <p className="text-xs text-destructive">Text je příliš dlouhý. Maximum je {MAX_LEN} znaků.</p>
      )}
      {tooShort && (
        <p className="text-xs text-muted-foreground">Zadej aspoň {MIN_LEN} znaky.</p>
      )}
      {imageError && <p className="text-xs text-destructive">{imageError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUploadButtonClick}
          disabled={disabled || (canUploadImages && images.length >= MAX_IMAGES)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canUploadImages ? <ImagePlus size={14} /> : <Lock size={12} />}
          {images.length === 0 ? "Přidat screenshot" : "Přidat další"}
        </button>

        {processingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Zpracovávám…
          </span>
        )}

        {images.map((img) => (
          <div key={img.id} className="relative group/thumb">
            <img
              src={img.previewUrl}
              alt="Náhled nahraného screenshotu"
              className="w-11 h-11 object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => removeImage(img.id)}
              aria-label="Odebrat screenshot"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {showUploadUpsell && !canUploadImages && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex items-start gap-2.5">
          <Lock size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            Nahrávání screenshotů je součástí tarifu Full nebo Jednorázová.{" "}
            <Link href="/pricing" className="font-semibold text-primary hover:underline underline-offset-2">
              Zobrazit ceník →
            </Link>
          </p>
        </div>
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
