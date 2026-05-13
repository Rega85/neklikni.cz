# Audit repo neklikni-web

Provedeno: 2026-05-13. Stav main: po commitu `1c0d16a`.

## 1. Soubory v rootu, které nepatří do Next.js projektu

| Soubor | Velikost | Datum | Stav v gitu |
|---|---:|---|---|
| `Header_final.tsx` | 9 KB | 2026-02-23 | tracked |
| `page_final.tsx` | 13 KB | 2026-02-23 | tracked |
| `billing_final.tsx` | 4 KB | 2026-02-23 | tracked |
| `app.zip` | 53 KB | 2026-02-21 | tracked |
| `neklikni.zip` | 53 KB | 2026-02-21 | tracked |
| `write-all.ps1` | 26 KB | 2026-02-23 | tracked |
| `write-files.ps1` | 9 KB | 2026-02-23 | tracked |
| `write_files.mjs` | 654 B | 2026-02-23 | tracked |
| `write_files.py` | 696 B | 2026-02-23 | tracked |
| `tsconfig.tsbuildinfo` | 1 MB | 2026-05-13 | untracked (správně, je v .gitignore) |

`write_files.*` skripty kopírují `Header_final.tsx → app/components/Header.tsx`,
`page_final.tsx → app/page.tsx`, `billing_final.tsx → app/billing/page.tsx`.
Jednorázové migrační skripty z února 2026, dnes nepoužívané.

## 2. Srovnání `_final.tsx` vs `app/`

Všechny tři dvojice se liší. `_final` soubory jsou starší snapshoty:

| Pár | `_final` (Feb 2026) | Aktuální v `app/` | Verdikt |
|---|---:|---:|---|
| `Header_final.tsx` ↔ `app/components/Header.tsx` | 163 řádků | 259 řádků | _final je starší snapshot (chybí hamburger menu, AI logo, upgrade CTA, referral link). |
| `billing_final.tsx` ↔ `app/billing/page.tsx` | 87 řádků | 86 řádků | Téměř stejné velikostně, ale obsah se liší. Aktuální je novější. |
| `page_final.tsx` ↔ `app/page.tsx` | 260 řádků | 586 řádků | _final je silně zastaralý (chybí HomeSections, RiskGauge, UpsellModal, HeroParticles, DecoderText, error boundary, tracking, drag&drop, screenshot, share). |

Žádný `_final` soubor neobsahuje funkce, které by chyběly v `app/`.

## 3. Doporučení

### Smazat — jednorázové migrace, mrtvý kód

```
Header_final.tsx
page_final.tsx
billing_final.tsx
write-all.ps1
write-files.ps1
write_files.mjs
write_files.py
```

Žádné riziko ztráty — vše je v git history pokud bys je někdy potřeboval zpět.

### Smazat — binární snapshoty

```
app.zip
neklikni.zip
```

Dva ~53 KB ZIPy z února 2026 (manuální zálohy). Zbytečně bobtná repo.

### Přidat do .gitignore

`tsconfig.tsbuildinfo` — už je tam (`*.tsbuildinfo`), soubor není v gitu. Stav OK.

### Zachovat — ale později řešit

- `middleware.ts` (root) — funkční, ale Next 16.2 hlásí deprecation warning: má se přejmenovat na `proxy.ts`. Nehoří.
- `.vscode/settings.json` — obsahuje jediný innocuous nastavení (`explorer.compactFolders: false`).

### V pořádku

Vše ostatní v rootu (`app/`, `public/`, `supabase/`, `utils/`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `middleware.ts`, `.env.example`, `README.md`).

## 4. TypeScript build

```bash
npm run build
```

- Compiled successfully in 4.1s
- Finished TypeScript in 4.1s
- Generating static pages using 15 workers (25/25)

`npx tsc --noEmit` → 0 errors, 0 warnings.

### Build-time warningy (ne errory)

1. **Multiple lockfiles** — Next detekoval `package-lock.json` v `c:\Users\menff\` i v `c:\Users\menff\neklikni-web\`. Vybírá rodičovský jako workspace root (špatně). Fix: smazat `c:\Users\menff\package-lock.json` (mimo repo) nebo přidat `turbopack.root` do `next.config.ts`.
2. **middleware deprecation** — Next 16.2 doporučuje `middleware.ts` → `proxy.ts`. Funkčně to teď funguje, ale do budoucna refactor.

## 5. Package.json — unused dependencies

Všech 9 production dependencies se používá:

| Balíček | Počet importů |
|---|---:|
| `@anthropic-ai/sdk` | 1 (analyze route) |
| `@supabase/ssr` | 3 |
| `@supabase/supabase-js` | 6 |
| `lucide-react` | 18 |
| `next` | core |
| `react`, `react-dom` | core |
| `resend` | 3 (webhook, contact, lead) |
| `stripe` | 3 (checkout, portal, webhook) |

Všechny devDependencies (`eslint`, `eslint-config-next`, `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `@types/*`) jsou standardní tooling.

**Žádné unused dependencies.**
