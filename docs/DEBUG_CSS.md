# Debug: CSS proč je surface-card-elevated v DOM ale neviditelný

## Definice .surface-card-elevated (app/globals.css ř. 142-148)

```css
.surface-card-elevated {
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
  border: 1px solid var(--border-strong);
  border-radius: 24px;
  backdrop-filter: blur(28px);
  box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.5);
}
```

Žádné `display: none`, `visibility: hidden`, ani `opacity: 0`. Třída sama o sobě NENÍ příčinou neviditelnosti.

## Definice .animate-fade-up (app/globals.css ř. 87-108)

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up   { animation: fade-up 0.5s ease-out both; }
```

`both` fill-mode → element zůstane na `to` state (opacity: 1) po animaci. Animace by tedy NEMĚLA dělat neviditelnost. Plus reduced-motion override:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up, ... { animation: none !important; }
}
```

Pod reduced-motion → animation: none → element má base opacity (1). **Animace tedy NENÍ příčinou.**

## Identifikovaný problém — `.bg-blobs` zneužitá jako content wrapper

**app/globals.css ř. 53-59:**

```css
.bg-blobs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}
```

`.bg-blobs` je **dekorativní fixed-positioned container pro purple/blue blob pseudo-elementy**. Layout.tsx ho používá správně:

```tsx
// app/layout.tsx ř. 67
<div className="bg-blobs" aria-hidden="true" />
```

Prázdný dekorativní div, sibling Headeru. To je v pořádku.

**Ale `app/databaze/nahlasit/page.tsx` ho používá jako content wrapper:**

```tsx
<main className="min-h-screen bg-[#020617] text-slate-100">
  <div className="bg-blobs">                          ← BUG
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <header>...</header>
      <IncidentReportForm />
    </div>
  </div>
</main>
```

**Důsledek:**

- `position: fixed; inset: 0` → vytrhne celý vnitřek z normal flow a přilepí ho na viewport
- `z-index: -1` → pošle to **za** parent `<main>` (který má opaque `bg-[#020617]`)
- `pointer-events: none` → formulář by stejně nešel kliknout, i kdyby byl vidět
- `overflow: hidden` → clipuje cokoli mimo viewport

**Proč Header funguje:** Header je v `app/layout.tsx`, **sibling** k `<div className="bg-blobs">` (NE uvnitř něj). Headeru se ten z-index tedy netýká.

**Proč curl HTML obsahuje surface-card-elevated:** React server-renderuje plný DOM, jen je vizuálně skrytý za main background. To přesně odpovídá Pavlovu nálezu (view-source ANO, browser NIC).

## Aplikovaný fix

V `app/databaze/nahlasit/page.tsx` odstranit dekorativní wrapper `<div className="bg-blobs">`. Layout už blobs renderuje, page.tsx ho duplikoval kvůli mé chybě při scaffoldování.
