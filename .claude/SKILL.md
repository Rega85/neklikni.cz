# Neklikni.cz — Project Skill for Claude Code

> Tento soubor čteš na začátku každého sezení. Drž se ho. Když nevíš, co dělat, ptej se, ne hádej.

## 1. KDO JSME

**Neklikni.cz** je AI služba pro ochranu před online podvody v ČR. Uživatelé sem dávají podezřelé zprávy, SMS, emaily, URL nebo profily prodejců a dostávají AI analýzu rizika.

**Hlavní moduly:**
1. `/check` — AI analýza obsahu (existuje, polished)
2. `/databaze` — Databáze nahlášených incidentů (vyvíjíme)
3. `/api/check` — B2B endpoint (budoucnost, pro Férek a další)

**Maintainer:** Pavel Kubanyi (sólo dev). Pracuje večery a víkendy, tempem 1-2 sezení Claude Code za den. **Nedrtí maraton, dělá sprinty.**

## 2. STACK (závazné)

| Vrstva | Volba | Poznámka |
|---|---|---|
| Framework | **Next.js 15 App Router** | NE Pages Router. Server Components default. |
| Jazyk | **TypeScript strict** | Žádné `any`, žádné `@ts-ignore`. |
| Styling | **Tailwind CSS 4** | + CSS proměnné v globals.css pro brand barvy |
| Databáze | **Supabase Postgres** | + RLS policies VŽDY (žádná tabulka bez RLS) |
| Auth | **Supabase Auth — magic link** | `@supabase/ssr` pro server, `@supabase/supabase-js` pro klient |
| Storage | **Supabase Storage** | Důkazy: bucket `evidence`, šifrovaný, ACL přes RLS |
| Payments | **Stripe** | Checkout + Customer Portal + webhook |
| Emaily | **Resend** | Notifikace, potvrzení, námitky |
| AI | **Anthropic SDK** | Claude Sonnet 4.5 pro analýzu (`claude-sonnet-4-5` nebo nejnovější) |
| Deploy | **Vercel** | env vars přes Vercel dashboard, live Stripe v prod |
| Browser tools | Lucide-react ikony, žádné jiné UI knihovny | Vlastní komponenty, brand vibe |

**Nepřidávej nové dependencies bez svolení.** Pokud potřebuješ něco, co stack nepokrývá, napiš to do TODO a zeptej se.

## 3. STRUKTURA REPA

```
neklikni-web/
├── .claude/              ← agentí konfigurace (private, gitignored partially)
├── app/                  ← Next.js App Router
│   ├── (public)/         ← nepřihlášené stránky
│   ├── api/              ← API endpointy
│   ├── auth/             ← auth callbacks
│   ├── billing/          ← Stripe portal
│   ├── components/       ← shared komponenty
│   └── databaze/         ← databáze nahlášení (bude)
├── docs/                 ← SPEC.md, ADRs
├── public/
├── supabase/migrations/  ← SQL migrace, postupně číslované
└── utils/supabase/       ← klient/server/middleware helper
```

**Konvence souborů:**
- ✅ `kebab-case` pro routes (`/databaze/nahlasit`)
- ✅ `PascalCase` pro komponenty (`IncidentForm.tsx`)
- ✅ `camelCase` pro utility funkce a hooky
- ❌ Žádné `_final`, `_v2`, `_new` v názvech — git history je tvoje verzování
- ❌ Žádné `.zip`, `.bak`, `_backup` v repu

## 4. JAZYKOVÁ HYGIENA — KRITICKÉ

**Tohle je projekt, kde slova mohou znamenat žalobu. Drž se striktně:**

### ❌ NIKDY nepiš (v UI textech, emailech, komentářích uživatelům):

| Zakázané | Důvod |
|---|---|
| podvodník | hodnocení charakteru, trestněprávní pojem |
| zloděj | implikuje trestný čin |
| lhář | hodnocení |
| podvedl, ukradl, spáchal | implikují vinu |
| falešný (o osobě) | implikuje úmysl |
| nepoctivý | hodnocení |
| vinen, trestaný | implikují rozsudek |
| varování před XYZ | hodnotící |
| black list | hodnotící |

### ✅ VŽDY pište takto:

| Místo... | Použij |
|---|---|
| "podvodník" | "subjekt evidovaných incidentů", "nahlašovaný subjekt" |
| "podvedl" | "byl předmětem nahlášení" |
| "spáchal podvod" | "byl spojen s incidentem typu X" |
| "podvodné jednání" | "nahlášené jednání" |
| "varování" | "evidovaná nahlášení" |
| "ukradl peníze" | "platba nebyla uživateli vrácena" |

### Magická slova (používej často):

- **"evidováno"** — pasivní, faktické
- **"nahlášeno"** — popisuje akt, ne pravdivost
- **"v souvislosti s"** — vytváří spojení bez tvrzení o vině

**Pasivní formulace.** Místo "X neposlal zboží" pište "Nahlašující uvádí, že zboží nebylo doručeno".

### Headlines & tlačítka:

- ❌ "Pozor — podvodník!" → ✅ "Záznamy v databázi"
- ❌ "Nahlásit podvodníka" → ✅ "Nahlásit incident"
- ❌ "Smazat z databáze podvodníků" → ✅ "Podat námitku proti záznamu"

**Pokud váháš nad slovem, zeptej se uživatele. Lepší jedna otázka než žaloba.**

## 5. DESIGN SYSTEM

**Brand barvy** (CSS proměnné v `globals.css`):

```css
--brand-primary: #a855f7;     /* fialová */
--brand-secondary: #ec4899;   /* růžová */
--brand-gradient: linear-gradient(135deg, #a855f7, #ec4899);
--bg-deep: #020617;            /* tmavé pozadí */
--bg-surface: rgba(15, 23, 42, 0.7);
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #64748b;
```

**Sémantické barvy pro rizika (databáze):**

```css
--risk-clean: #10b981;     /* zelená — 0 záznamů */
--risk-low: #eab308;       /* žlutá — 1-2 záznamy */
--risk-medium: #f97316;    /* oranžová — 3-5 záznamů */
--risk-high: #ef4444;      /* červená — 6+ záznamů */
```

**Typografie:**
- Headings: `Space Grotesk` (bold, tight letter-spacing)
- Body: `Inter` (regular)
- Mono / kódy / IDčka: `JetBrains Mono`

**UI vzhled:**
- Tmavý theme jako default (světlý nikdy)
- Hodně glassmorphism (`backdrop-filter: blur(10-20px)`)
- Glow efekty na CTA (`box-shadow` s brand barvami)
- Animace `fade-up`, `pulse-glow`, `scan-sweep` pro klíčové momenty
- Mobile-first, ale dobré i na desktopu

**Anti-patterns:**
- ❌ Plné jméno uživatele kdekoli v UI (maskuj: "Pa****")
- ❌ Číslo účtu plné (maskuj poslední 3 cifry: "12345**3")
- ❌ Telefon plný v public view (maskuj: "+420 7** *** *77")

## 6. SUPABASE PRAVIDLA

**RLS je povinný na každé tabulce.** Bez výjimky.

**Migrace** jsou v `supabase/migrations/` číslované timestampem (např. `20250514_120000_create_reports.sql`). Nikdy nepřepisuj existující migraci — přidej novou s `ALTER TABLE`.

**Patterny:**
- User-owned data: RLS `auth.uid() = user_id`
- Veřejné views: `RLS USING (true)` ale jen na anonymizovaná data
- Citlivá data (důkazy, plné identifikátory): pouze `service_role` může číst

**Storage bucket `evidence`:**
- Private
- Maximální velikost souboru: 10 MB
- Povolené MIME: `image/png, image/jpeg, image/webp, application/pdf`
- RLS: uploader může číst/mazat své vlastní soubory, ne cizí

## 7. PRÁVNÍ A COMPLIANCE NOTES

**Při psaní kódu, který dotýká osobních údajů:**

1. **GDPR — datová minimalizace.** Sbírej jen to, co je nezbytné.
2. **Retention** — definuj retention period v komentáři u tabulky / kolonky.
3. **Encryption-at-rest** pro důkazy a osobní údaje.
4. **Audit log** — každé citlivé čtení / zápis loguj do `audit_log` tabulky.
5. **Soft delete** preferuj nad hard delete u záznamů, které mohou být předmětem sporu.

**Při psaní textů a UI:**

1. Drž jazykovou hygienu (sekce 4).
2. Disclaimer pod každým záznamem databáze (text v SPEC.md).
3. Nikdy nepoužívej AI verdikt jako "konečné slovo" — vždy "informativní charakter".

## 8. WORKFLOW PRO CLAUDE CODE

### Když dostaneš task:

1. **Přečti si SPEC.md** v `docs/` (pokud existuje a je relevantní).
2. **Předtím než píšeš kód**: shrň, co budeš dělat, ve 2-3 větách. Počkej na "go" nebo zpětnou vazbu.
3. **Drobné věci** (jednoduchá oprava, malá komponenta) — udělej rovnou.
4. **Větší věci** (nová tabulka, nový route, nová feature) — vytvoř plán, počkej.

### Git workflow:

- **Branch:** `main` pro tebe, ostatní jen v emergencies
- **Commit messages**: konvencionální (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- **Po každém logicky uzavřeném kroku**: commit + push
- **Nikdy nedělej** force push, rebase, ani neměň historii bez svolení

### Když narazíš na problém:

1. Zkus opravit.
2. Pokud nevíš, **zeptej se konkrétně** — ne "co teď?", ale "Mám možnost A nebo B, A je rychlejší ale méně robustní, B je pomalejší ale lepší dlouhodobě. Co preferuješ?"
3. Pokud něco selže (build error, deploy fail), **vrať to** a vysvětli co se stalo.

## 9. ČEHO SE ZDRŽET

- ❌ Nepřidávej dependency bez svolení.
- ❌ Nepřepisuj existující kód, pokud o to není žádost (jen ho rozšiřuj).
- ❌ Nepřejmenovávej soubory bez svolení.
- ❌ Negeneruj 2000řádkové komponenty — rozseč na menší.
- ❌ Nepoužívej `console.log` v produkčním kódu (jen v dev, a před commitem ukliď).
- ❌ Nepoužívej `localStorage` na citlivá data — vše do Supabase nebo cookies (httpOnly).
- ❌ Neukládej tajemství (API keys) v kódu — vždy env vars.

## 10. RYCHLÝ CHECKLIST PŘED KAŽDÝM COMMITEM

- [ ] `npm run build` projde čistě?
- [ ] TypeScript errory: 0?
- [ ] Žádné `any`, `@ts-ignore`?
- [ ] Žádné zakázané slovo z jazykové hygieny (sekce 4)?
- [ ] Nové tabulky mají RLS?
- [ ] Nová route, která sbírá osobní údaje, má disclaimer?
- [ ] Commit message je popisný?

---

**Pavle, pokud čteš tohle a chceš něco změnit, řekni.** Tenhle soubor je živý — můžeme ho editovat.
