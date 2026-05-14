# SPEC.md — Databáze nahlášených incidentů (Neklikni.cz)

> **Pro Claude Code:** tento dokument je autoritativní specifikace modulu `/databaze` projektu Neklikni.cz. Před implementací jakéhokoliv tasku v tomto modulu si přečti relevantní sekci tohoto dokumentu. Pokud je něco v rozporu se SKILL.md, SKILL.md má vyšší prioritu (obecná pravidla). Pokud tady něco chybí, **zeptej se uživatele**, nedomysli.

> **Status:** v0.1, draft, schváleno k MVP implementaci. Update tohoto dokumentu vyžaduje commit `docs(spec): ...`.

---

## 1. PRODUKTOVÝ BRIEF

### Co stavíme

Veřejnou databázi **nahlášených incidentů** spojených s konkrétními identifikátory (telefon, číslo účtu, e-mail, FB profil, variabilní symbol). Uživatelé mohou:

1. **Vyhledávat** — ověřit si protistranu před transakcí
2. **Nahlašovat** — sdílet zkušenost s dalšími
3. **Reagovat** — pokud o nich někdo zveřejnil záznam, mohou se vyjádřit

### Pro koho

| Persona | Co řeší | Cena |
|---|---|---|
| **Běžný uživatel bazarů** | "Ověřím si prodejce, než pošlu peníze" | Free (limit) / Basic |
| **Aktivní obchodník na bazarech** | "Potřebuji rychlé lookupy v objemu" | Pro 290 Kč/měs |
| **Nahlášená osoba** | "Chci se vyjádřit / reagovat na záznamy" | Claim 290 Kč/měs |
| **B2B partner** (marketplace, e-shop, banka) | "Potřebuji API pro screening" | Custom 2 900+ Kč/měs |

### Proč to děláme

V ČR existuje **PodvodNaBazaru.cz** — silný incumbent, ale:
- Žádná AI vrstva, žádné scoring, žádná moderace
- Žádný proces obrany pro dotčené osoby (SafeDeal kauza s ČNB to ukázala)
- Zastaralé UX
- Žádný strukturovaný B2B produkt

Naše hrana: **AI sumarizace + trust score + claim & respond + moderní UX + API-first**.

### Co NEJSME

- ❌ Soud nebo vyšetřovací orgán
- ❌ Černá listina (pojmenování přísně zakázáno — viz SKILL.md sekce 4)
- ❌ Konečné slovo o důvěryhodnosti
- ❌ Escrow / platební úschova (lekce ze SafeDeal)

---

## 2. KLÍČOVÉ PRINCIPY

### Princip 1: Fakt, ne hodnocení

Nikde v UI, e-mailech, ani v sumarizacích **nepoužíváme hodnotící slova** ("podvodník", "lhář", "podvedl"). Vždy popisujeme **fakta** ("evidováno X nahlášení", "byl předmětem záznamu").

### Princip 2: Trust score, ne verdikt

Nepublikujeme binární "podvodník ano/ne". Publikujeme **numerický indikátor 0-100** s vysvětlením:
- **80-100** — bez záznamů nebo izolovaný starý záznam
- **50-79** — 1-2 záznamy, nízká až střední závažnost
- **20-49** — 3-5 záznamů, střední závažnost nebo recentní aktivita
- **0-19** — 6+ záznamů nebo vážné incidenty (vysoké částky, systematické)

### Princip 3: Strukturovaná data > volný text

Volný text je pomluvový vektor. **80 % nahlášení musí být strukturovaných** (typ incidentu, platforma, závažnost, datum, částka). Volný text je jen doplněk, omezený 1000 znaků.

### Princip 4: Notice před zveřejněním

Pokud máme kontakt na dotčenou osobu (z důkazů), **notifikujeme ji a dáme 14 dní** na vyjádření. Bez kontaktu publikujeme bez notifikace, ale s vyšším skóre (méně agresivně).

### Princip 5: Právo se vyjádřit

Každá dotčená osoba má vždy možnost:
- Podat **námitku** (zdarma, vede k review a možnému výmazu)
- **Claim & Respond** (290 Kč/měs, aktivní reakce na záznamy)

### Princip 6: Maskování v public view

Veřejně **vždy** maskujeme citlivé identifikátory:
- Plné jméno → "Pa**** N***"
- Číslo účtu → "12345**3/2010"
- Telefon → "+420 7** *** *77"
- E-mail → "p****@email.cz"
- FB URL → odkaz není veřejný, jen "FB profil evidován"

Plné údaje vidí jen:
- Sama dotčená osoba (po ověření identity)
- Orgány činné v trestním řízení (na vyžádání s právním podkladem)
- Admin (s audit logem)

### Princip 7: Audit log

Každé citlivé čtení nebo zápis (přístup k důkazům, plným údajům, výmaz záznamu, vyřízení námitky) se loguje do `audit_log` tabulky.

---

## 3. URL STRUKTURA

```
/databaze                    ← homepage modulu, vysvětlení + vyhledávač
/databaze/hledat?q=...       ← výsledky vyhledávání
/databaze/subjekt/[hash]     ← detail subjektu (public view)
/databaze/nahlasit           ← formulář nahlášení (auth required)
/databaze/moje               ← moje nahlášení (auth required)
/databaze/namitka/[token]    ← formulář námitky (token-based access)
/databaze/claim/[hash]       ← claim profil (auth + ověření)
/databaze/admin              ← admin moderace (admin only)

/api/databaze/search         ← POST: vyhledávání
/api/databaze/report         ← POST: vytvoření nahlášení
/api/databaze/objection      ← POST: podání námitky
/api/databaze/claim          ← POST: claim profilu
/api/databaze/precheck       ← POST: AI předkontrola (interní)
```

---

## 4. DATOVÝ MODEL (Supabase)

### Tabulka: `reporters`

Nahlašovatelé — registrovaní uživatelé, kteří podali alespoň jedno nahlášení.

```
id                  uuid PK (= auth.users.id)
email               text NOT NULL
phone               text  
phone_verified      boolean DEFAULT false
bank_id_verified    boolean DEFAULT false
trust_level         enum('anonymous','verified','premium')
reports_count       integer DEFAULT 0
false_reports_count integer DEFAULT 0  -- nahlášení, která byla vyhodnocena jako nepravdivá
banned              boolean DEFAULT false
created_at          timestamptz DEFAULT now()
```

**RLS:**
- Reporter vidí jen svůj záznam
- Admin vidí vše

### Tabulka: `subjects`

Subjekty incidentu — agregát pod kterým se shromažďují všechny identifikátory a incidenty proti jedné entitě.

```
id                  uuid PK
display_name_masked text          -- "Pa**** N***" pro public view
claimed_by          uuid FK reporters(id)  -- pokud claimnul profil
claim_paid_until    timestamptz   -- platnost claim subscription
trust_score         integer       -- 0-100, počítáno z incidentů
visibility_status   enum('active','hidden_objection','removed','pending')
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

**RLS:**
- Public: pouze `visibility_status='active'`
- Reporter: vidí subjekty, na které podal incident
- Claimed_by: vidí svůj subjekt vždy
- Admin: vše

### Tabulka: `subject_identifiers`

Identifikátory subjektu (mnoho-k-jedné). Sem ukládáme všechny telefony, účty, e-maily, FB profily atd. spojené s jedním subjektem.

```
id                  uuid PK
subject_id          uuid FK subjects(id) ON DELETE CASCADE
type                enum('phone','account','email','facebook_url','var_symbol','other')
value               text NOT NULL         -- plná hodnota, jen pro autorizovaný přístup
value_hash          text NOT NULL UNIQUE  -- SHA-256 hash, pro lookup
value_masked        text NOT NULL         -- "+420 7** *** *77"
verified            boolean DEFAULT false -- ověřeno víc nahlášeními nebo claim
created_at          timestamptz DEFAULT now()
```

**Indexy:**
- `UNIQUE INDEX ON value_hash` — jeden identifikátor patří jen jednomu subjektu (deduplikace)
- `INDEX ON subject_id`
- `INDEX ON type`

**RLS:**
- Public: pouze `value_masked` přes view (ne plný `value`)
- Reporter: vidí identifikátory subjektů, na které podal incident, ale maskované
- Claimed_by: vidí plné hodnoty svého subjektu
- Admin: vše

### Tabulka: `incidents`

Jednotlivá nahlášení.

```
id                          uuid PK
reporter_id                 uuid FK reporters(id)
subject_id                  uuid FK subjects(id)
incident_date               date NOT NULL
platform                    enum('fb_marketplace','fb_groups','sbazar','bazos','vinted','aukro','email','sms','phone','other')
platform_other              text   -- pokud platform='other'
category                    enum('non_delivery','misrepresentation','fake_courier','disappeared_listing','fake_profile','romance','investment','rental','tickets','employment','other')
category_other              text   -- pokud category='other'
severity                    enum('attempt','minor','medium','major','severe')
amount_czk                  integer  -- 0 pokud attempt
description                 text NOT NULL CHECK (length(description) BETWEEN 50 AND 1000)
ai_confidence_score         integer  -- 0-100, vrací Claude precheck
ai_summary                  text     -- AI sumarizace pro detail view
status                      enum('pending','ai_reviewed','notified','published','objected','removed')
notification_sent_at        timestamptz
notification_email          text     -- e-mail dotčené osoby, pokud lze extrahovat z důkazů
public_at                   timestamptz
objection_at                timestamptz
removed_at                  timestamptz
removed_reason              text
created_at                  timestamptz DEFAULT now()
```

**Workflow status:**
```
pending → ai_reviewed → notified (pokud máme e-mail) → published
                     →                                → objected → removed | published
                       (bez e-mailu) → published
```

**RLS:**
- Public: pouze `status='published'`
- Reporter: vidí svá nahlášení vždy
- Claimed_by: vidí všechny incidenty proti svému subjektu
- Admin: vše

### Tabulka: `evidence`

Důkazy nahrávané s nahlášením.

```
id              uuid PK
incident_id     uuid FK incidents(id) ON DELETE CASCADE
type            enum('screenshot','payment_proof','communication','other')
file_path       text NOT NULL   -- path v Supabase Storage
file_hash       text NOT NULL   -- SHA-256, pro duplicate detection
file_size_bytes integer
mime_type       text
uploaded_at     timestamptz DEFAULT now()
deleted_at      timestamptz     -- soft delete
```

**Storage bucket: `evidence`**
- Private (žádný public access)
- Max size: 10 MB
- Allowed MIME: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`
- Path konvence: `{incident_id}/{file_hash}.{ext}`
- Retention: 5 let od `incidents.created_at`, pak hard delete

**RLS na storage:**
- Reporter může číst své vlastní (přes incident_id)
- Claimed_by může číst důkazy proti svému subjektu
- Admin čte vše

**Indexy:**
- `INDEX ON incident_id`
- `INDEX ON file_hash` — pro detekci duplicit (stejný obrázek nahraný 2x = podezřelé)

### Tabulka: `objections`

Námitky od dotčených osob.

```
id                  uuid PK
incident_id         uuid FK incidents(id)
raised_by_email     text NOT NULL    -- e-mail, ze kterého přišla námitka
raised_by_phone     text             -- volitelně
identity_verified   boolean DEFAULT false  -- ověřeno přes magic link nebo Bank iD
reason              text NOT NULL CHECK (length(reason) BETWEEN 50 AND 2000)
evidence_path       text             -- volitelný protidůkaz v Storage
status              enum('pending','upheld','rejected','partial')
admin_note          text
resolved_by         uuid FK reporters(id)  -- admin, který rozhodl
resolved_at         timestamptz
created_at          timestamptz DEFAULT now()
```

**Workflow status:**
```
pending → (admin review) → upheld (incident.status='removed')
                         → rejected (incident.status='published' znovu)
                         → partial (úprava záznamu, ne výmaz)
```

**RLS:**
- Public: žádný přístup
- Raised_by_email: vidí svou námitku přes token v URL (`/databaze/namitka/[token]`)
- Admin: vše

### Tabulka: `audit_log`

Každé citlivé čtení nebo akce.

```
id              uuid PK
actor_type      enum('reporter','admin','system','public')
actor_id        uuid   -- null pro public/system
action          enum('view_evidence','view_full_identifier','create_incident','remove_incident','resolve_objection','grant_claim','process_payment','export_data')
target_type     enum('incident','subject','evidence','reporter','objection')
target_id       uuid
ip_address      inet
user_agent      text
metadata        jsonb  -- doplňující info k akci
created_at      timestamptz DEFAULT now()
```

**Indexy:**
- `INDEX ON (actor_type, actor_id)`
- `INDEX ON (target_type, target_id)`
- `INDEX ON created_at`

**Retention:** 5 let, pak hard delete.

**RLS:**
- Public: žádný přístup
- Admin: jen čtení
- System: insert přes service_role

### Tabulka: `claim_subscriptions`

Stripe subskripce pro Claim & Respond.

```
id                       uuid PK
subject_id               uuid FK subjects(id) UNIQUE
reporter_id              uuid FK reporters(id)
stripe_customer_id       text
stripe_subscription_id   text
status                   enum('active','past_due','canceled','incomplete')
current_period_end       timestamptz
created_at               timestamptz DEFAULT now()
```

**RLS:**
- Reporter: vidí jen svoji subscription
- Admin: vše

---

## 5. PROCESY (WORKFLOWS)

### 5.1 Proces nahlášení incidentu

**Vstup:** auth user (přes magic link), který vyplnil formulář na `/databaze/nahlasit`.

```
Krok 1: Validace klientská
  ├─ Všechna povinná pole vyplněna
  ├─ Min 1 identifikátor protistrany
  ├─ Min 2 soubory v evidence (a max 5)
  ├─ Popis 50-1000 znaků
  └─ Checkbox "Údaje jsou pravdivé, beru na vědomí § 184 TZ"

Krok 2: Validace serverová (API /api/databaze/report)
  ├─ Rate limit: max 3 nahlášení / 24h / reporter
  ├─ Duplicate detection: file_hash uploadovaných souborů 
  │  proti existujícím — pokud stejný obrázek v jiném incidentu
  │  od jiného reportera → flag pro admin review
  ├─ Identity check: má reporter ověřený alespoň telefon?
  │  Pokud ne → požadovat SMS OTP před uložením
  └─ Upload důkazů do Storage (path: tmp/{user_id}/{hash}.ext)

Krok 3: AI předkontrola (interní /api/databaze/precheck)
  ├─ Claude dostane: kategorie, popis, závažnost, ai_summary z důkazů
  ├─ Vrátí: ai_confidence_score (0-100), ai_summary (text), red_flags[]
  ├─ Pokud score ≥ 60 → status='ai_reviewed', pokračuje
  └─ Pokud score < 60 → status='pending', fronta pro admin

Krok 4: Subject matching
  ├─ Pro každý identifikátor: spočítej value_hash
  ├─ Hledej v subject_identifiers
  ├─ Pokud match → použij existující subject_id
  └─ Pokud no match → vytvoř nový subject
     (display_name_masked se generuje z prvního identifikátoru)

Krok 5: Notifikace dotčené osobě (pokud lze)
  ├─ Pokud incident.notification_email != null
  │  → Resend pošle e-mail s odkazem na /databaze/subjekt/[hash]
  │     + možnost námitky s tokenem
  │  → incident.status='notified', notification_sent_at=now()
  │  → odpočet 14 dní
  └─ Pokud bez e-mailu → incident.status='published' rovnou

Krok 6: Po 14 dnech (cron / pg_cron job)
  ├─ Všechny incidents WHERE status='notified' 
  │  AND notification_sent_at < now() - interval '14 days'
  │  AND nemají objections.status='pending'
  └─ → status='published', public_at=now()

Krok 7: Přepočet trust_score
  ├─ Trigger po INSERT/UPDATE/DELETE v incidents
  └─ subjects.trust_score = funkce(počet, závažnost, recency)
```

**Acceptance:**
- ✅ Nahlašovatel dostane potvrzení e-mailem ("Vaše nahlášení bylo přijato a prochází kontrolou")
- ✅ Dotčená osoba (pokud máme e-mail) dostane neutrální notifikaci s 14denní lhůtou
- ✅ Po 14 dnech bez námitky je incident veřejný v anonymizované podobě
- ✅ Vše je v audit_log

### 5.2 Proces námitky

**Vstup:** dotčená osoba klikne na link v notifikačním e-mailu nebo "Toto je o mně" na detailu subjektu.

```
Krok 1: Identity verification
  ├─ Volba A: Magic link na e-mail z incidentu/identifiers
  │  → potvrzuje, že má přístup k té schránce
  ├─ Volba B: SMS OTP na telefon z identifiers
  │  → potvrzuje, že vlastní telefon
  └─ Volba C: Bank iD (v2, ne MVP)

Krok 2: Formulář námitky /databaze/namitka/[token]
  ├─ Reason: text 50-2000 znaků
  ├─ Volitelně: protidůkaz (soubor max 10 MB)
  └─ Submit → vytvoří objections row

Krok 3: Okamžitý dočasný status
  ├─ incident.status='objected'
  ├─ subject.visibility_status='hidden_objection'
  └─ Subject MIZÍ z public vyhledávání po dobu řešení

Krok 4: Admin notifikace
  ├─ E-mail adminovi: "Nová námitka na incident #XXX"
  └─ Admin UI v /databaze/admin

Krok 5: Admin review (do 7 dní)
  ├─ Vidí: incident, důkazy nahlašovatele, námitku, protidůkaz
  ├─ Rozhodnutí:
  │  ├─ upheld: incident.status='removed', subject.visibility back to 'active'
  │  ├─ rejected: incident.status='published', subject.visibility='active'
  │  └─ partial: úprava záznamu (např. anonymizace dalších údajů)
  └─ Admin_note se uloží

Krok 6: Notifikace obou stran
  ├─ Resend pošle e-mail nahlašovateli i namítajícímu
  └─ Výsledek + důvod
```

**Acceptance:**
- ✅ Sporný záznam je SKRYT během řešení (princip presumpce neviny)
- ✅ Obě strany jsou informovány o rozhodnutí
- ✅ Vše v audit_log s admin_id

### 5.3 Proces Claim & Respond

**Vstup:** dotčená osoba chce aktivně reagovat na záznamy (ne výmaz, ale reakce).

```
Krok 1: Identity verification (stejně jako u námitky)

Krok 2: Stripe Checkout
  ├─ Subscription 290 Kč/měs
  ├─ Po platbě webhook → claim_subscriptions row
  └─ subject.claimed_by = reporter_id, subject.claim_paid_until = period_end

Krok 3: Aktivní funkce
  ├─ Reaguje pod každým incidentem (text, max 500 znaků)
  ├─ Vidí plné údaje subjektu (audit_log → 'view_full_identifier')
  ├─ Dostává notifikaci o nových incidentech proti sobě
  └─ Badge "Aktivně řeší" v public view

Krok 4: Cancelace
  ├─ Subscription přestane platit → badge zmizí, reakce zůstávají
  └─ Plné údaje opět skryté
```

**Acceptance:**
- ✅ Claim badge je viditelný v public view
- ✅ Reakce dotčené osoby se zobrazují pod incidenty (s indikací "od dotčené osoby")
- ✅ Stripe webhook spravuje subscription lifecycle

### 5.4 Proces vyhledávání

**Vstup:** uživatel zadá identifikátor do `/databaze/hledat`.

```
Krok 1: Klientská validace
  ├─ Detekce typu (regex: phone, account, email, FB url, var symbol)
  └─ Normalizace (telefon: +420..., účet: 12345/6789)

Krok 2: API /api/databaze/search
  ├─ Rate limit: free 2x denně / IP, basic 50x denně, pro neomezeno
  ├─ Spočítej value_hash
  ├─ Hledej v subject_identifiers WHERE value_hash = ?
  ├─ Pokud match → fetch subject + COUNT incidents + trust_score
  └─ Pokud no match → "Žádné záznamy"

Krok 3: Response
  ├─ Free user vidí:
  │  ├─ "X nahlášení proti tomuto subjektu"
  │  ├─ Trust score (barva)
  │  ├─ Kategorie (top 3)
  │  ├─ Časový rozsah (od-do)
  │  └─ CTA "Více detailů (Basic plán)"
  └─ Basic/Pro user vidí navíc:
     ├─ Strukturovaný popis incidentů (bez identifikace nahlašovatelů)
     ├─ AI sumarizace (modus operandi)
     ├─ Časová osa
     └─ Tlačítko "Toto je o mně"
```

**Acceptance:**
- ✅ Free user dostane signal, ale ne plný detail
- ✅ Maskované údaje vždy v public view
- ✅ Žádné jméno nahlašovatele není veřejné

### 5.5 AI předkontrola (Claude)

**Vstup:** incident data + lista důkazů (text popis souborů, ne binární obsah).

**System prompt (zjednodušená verze, doladíme později):**

```
Jsi expert na detekci pomstychtivých, manipulativních a nepravdivých nahlášení.
Hodnotíš nahlášení podvodu na bazaru.

Vstup:
- Kategorie: {category}
- Závažnost: {severity}
- Datum: {incident_date}
- Částka: {amount_czk} Kč
- Platforma: {platform}
- Popis (od nahlašovatele): {description}
- Počet a typ důkazů: {evidence_summary}

Posuď:
1. Konzistence — odpovídá popis kategorii a závažnosti?
2. Tón — působí věcně, nebo pomstychtivě/emocionálně?
3. Specifičnost — obsahuje konkrétní detaily (datum, částka, modus), 
   nebo jen obecné nadávky?
4. Důkazy — počet a typ odpovídá popisu?
5. Red flags — jazyk pomsty, vágní obvinění, nesedící časové údaje?

Vrať JSON:
{
  "confidence_score": <0-100>,    // 100 = vypadá zcela autenticky
  "ai_summary": "<2-3 věty - faktický popis incidentu BEZ hodnocení charakteru>",
  "red_flags": ["...", "..."],     // prázdné pokud žádné
  "recommendation": "<auto_publish | manual_review | reject>"
}

DŮLEŽITÉ:
- V ai_summary NIKDY nepiš "podvodník", "lhář", "podvedl". 
  Piš "byl evidován", "nahlašuje", "uvádí, že nebylo doručeno".
- Drž faktický, neutrální tón.
- Pokud popis obsahuje urážky nebo nadávky → automaticky red_flag.
```

**Acceptance:**
- ✅ Score < 60 → manual review, ne auto publish
- ✅ Score 60-79 → auto publish, ale s vyšší prioritou v admin queue pro spot-check
- ✅ Score 80+ → auto publish bez intervence

---

## 6. UI OBRAZOVKY (popis, ne kód)

### 6.1 `/databaze` — homepage modulu

**Hero:**
- H1: "Databáze nahlášených incidentů"
- Sub: "Ověř si protistranu před transakcí. Nahlas zkušenost. Pomoz varovat ostatní."
- Vyhledávací input (telefon / účet / e-mail / FB profil)
- Tlačítko "Hledat"

**Stats section:**
- "Evidováno X nahlášení"
- "Y subjektů v databázi"
- "Z výmazů na základě námitky" (transparentnost!)

**How it works:**
- 3 sloupce: Nahlaš → AI předkontrola → 14 dní pauza → Zveřejnění
- Důraz na "Dotčené osobě dáváme vždy možnost se vyjádřit"

**CTA cards:**
- "Nahlásit incident" (přihlášení)
- "Někdo nahlásil mě?" (claim flow)
- "Jsem firma, chci API" (kontakt)

### 6.2 `/databaze/hledat` — výsledky

**Pokud match:**
- Subject card s trust score (barevný gauge)
- "Subjekt evidován v databázi"
- "Identifikátor X je spojen s N nahlášenými incidenty"
- Top 3 kategorie
- Časový rozsah
- (Free) CTA "Více detailů s Basic plánem"
- (Paid) Tlačítko "Otevřít detail"
- Tlačítko "Toto je o mně" (vždy viditelné)

**Pokud no match:**
- Zelený badge "Žádné záznamy"
- "Subjekt není v databázi evidován"
- Disclaimer: "Absence záznamů neznamená důvěryhodnost. Vždy ověř další způsoby (osobní vyzvednutí, escrow služba apod.)"

### 6.3 `/databaze/subjekt/[hash]` — detail subjektu

**Hlavička:**
- Display name masked
- Trust score (velký, barevný)
- Counter incidentů
- Badge "Aktivně řeší" (pokud claimed)
- Tlačítko "Toto je o mně"

**Lista incidentů:**
- Pro každý: datum, kategorie, závažnost, platforma, anonymizovaný popis
- AI summary (sumarizace vzorce)
- Maskované identifikátory
- (Paid) plný popis incidentu
- Reakce dotčené osoby (pokud claimed a reagovala)

**Disclaimer panel:**
```
ℹ️ INFORMATIVNÍ ZÁZNAM

Informace zde uvedené pocházejí výhradně z nahlášení 
podaných uživateli naší služby. Provozovatel:
• neověřuje pravdivost jednotlivých nahlášení nad rámec 
  formální kontroly důkazů
• netvrdí, že nahlášené jednání bylo posouzeno soudem nebo 
  jiným orgánem jako protiprávní
• neoznačuje subjekt za pachatele jakéhokoli trestného činu

Konečné rozhodnutí o důvěryhodnosti druhé strany je vždy 
na uživateli.
```

### 6.4 `/databaze/nahlasit` — formulář

**5 kroků (stepper):**
1. Co se stalo? (kategorie, závažnost, datum, platforma)
2. O kom? (identifikátory protistrany)
3. Detaily (popis textem, částka)
4. Důkazy (drag&drop, min 2 max 5 souborů)
5. Potvrzení (checkbox + souhrn)

**Po submitu:** "Děkujeme. Vaše nahlášení prochází AI kontrolou. Výsledek vám pošleme e-mailem do 24 hodin."

### 6.5 `/databaze/admin` — moderace

**Tabs:**
- Fronta předkontroly (status='pending')
- Fronta námitek (objections.status='pending')
- Spot-check (recent published with score 60-79)
- Audit log search
- Statistiky

**Pro každý záznam ve frontě:**
- Plné údaje incidentu (admin má přístup)
- AI score + summary + red_flags
- Důkazy (zobrazitelné inline)
- Akce: ✅ Schválit / ❌ Odmítnout / ❓ Vyžádat doplnění

---

## 7. ACCEPTANCE CRITERIA PRO MVP

MVP databáze je hotové, když:

**Funkčně:**
- [ ] Uživatel se přihlásí magic linkem a nahlásí incident
- [ ] AI předkontrola běží a vrací score
- [ ] Po 14 dnech bez námitky je incident publikován
- [ ] Veřejné vyhledávání funguje (free 2x denně, basic neomezeno)
- [ ] Detail subjektu zobrazuje incidenty maskovaně
- [ ] Notifikační e-maily fungují (přijetí, notice dotčenému, výsledek námitky)
- [ ] Dotčená osoba může podat námitku přes token-link
- [ ] Admin UI moderuje pending a objected fronty
- [ ] Claim & Respond funguje včetně Stripe subscription
- [ ] Audit log se plní

**Právně:**
- [ ] VOP obsahují klauzule k databázi (✋ vyžaduje advokáta)
- [ ] GDPR má "oprávněný zájem" jako právní základ (✋ vyžaduje advokáta)
- [ ] Disclaimer pod každým záznamem
- [ ] Žádné zakázané slovo v UI textech (viz SKILL.md sekce 4)
- [ ] DPIA dokument je vypracovaný (✋ vyžaduje advokáta)

**Technicky:**
- [ ] Build prochází bez warningů
- [ ] Všechny tabulky mají RLS
- [ ] Storage bucket `evidence` je private
- [ ] Audit log se plní u všech citlivých akcí
- [ ] Stripe webhook spolehlivě procesuje subscription events
- [ ] Rate limiting na search a report endpointech

**UX:**
- [ ] Vše responzivní (mobile-first)
- [ ] Brand barvy (fialová/růžová) konzistentní
- [ ] Sémantické barvy (zelená/žlutá/oranžová/červená) jen pro trust scores
- [ ] Loading states a error states pro všechny async operace

---

## 8. NE-CÍLE PRO MVP (až později)

Tyto věci **NEDĚLÁME** v MVP. Sepíšeme do v2 backlogu:

- ❌ Bank iD identity verification (zatím SMS OTP)
- ❌ Browser extension
- ❌ Mobilní aplikace
- ❌ Automatický scraping FB skupin
- ❌ Vymáhání pohledávek / trestní oznámení (jako u PodvodNaBazaru)
- ❌ Integrace s policejními databázemi
- ❌ B2B API s webhooks (zatím jen ruční API klíče)
- ❌ Public API for Férek (přidá se až Férek bude blíže)
- ❌ Bulk import nahlášení z PodvodNaBazaru
- ❌ Pokročilá analytika a trendy
- ❌ Multi-language (jen čeština)

---

## 9. OTEVŘENÉ OTÁZKY K DISKUZI

Tyto věci ještě nevíme jistě, řešíme s uživatelem před implementací:

1. **Subject merging** — pokud nahlašovatel přidá identifikátor, který už existuje pod jiným subjektem, ale jiné identifikátory ne — jak rozhodnout, jestli je to stejný subjekt nebo cizí?
2. **Notification e-mail extraction** — jak spolehlivě extrahovat e-mail dotčené osoby z důkazů? (OCR? Manuálně od nahlašovatele?)
3. **Trust score formula** — přesný vzorec. Návrh:  
   `score = 100 - min(100, (count_active * 10) + (severity_weighted * 5) + (recency_bonus * 2))`
4. **Admin tooling** — jeden admin (Pavel) na začátku stačí, ale jak to bude vypadat při růstu?
5. **Cena Claim & Respond** — 290 Kč/měs je odhad. Test pricing později.

---

## 10. RIZIKA A MITIGACE

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|---|---|---|---|
| Falešná nahlášení masově | Střední | Vysoký | AI předkontrola, rate limit, manual review prvních nahlášení |
| Žaloba za pomluvu | Střední | Vysoký | Jazyková hygiena, notice před zveřejněním, námitka proces, advokát |
| GDPR pokuta | Nízká | Vysoký | DPIA, advokát, oprávněný zájem, minimalizace dat |
| AI false negatives (propustí špatné) | Vysoká | Střední | Spot-check admin, manual review při score 60-79 |
| AI false positives (blokuje legitimní) | Střední | Střední | Admin override, feedback loop |
| Stripe v live módu — chargeback | Nízká | Střední | Jasné T&C, refund policy |
| Storage cost growth | Střední | Nízký | Retention policy 5 let, automatický prune |

---

## 11. ZDROJE A REFERENCE

- **SKILL.md** — obecná pravidla projektu (musí znát)
- **PodvodNaBazaru.cz** — hlavní konkurent (co nedělat: vizuál, právní rámec)
- **VašeStížnosti.cz** — vzor pro notice & response workflow
- **Atmoskop.cz** — vzor pro strukturovaná data a claim profil
- **GDPR čl. 6 odst. 1 písm. f)** — oprávněný zájem
- **§ 184 trestního zákoníku** — pomluva (pro disclaimer nahlašovatele)
- **§ 81 občanského zákoníku** — ochrana osobnosti

---

**Konec SPEC.md v0.1**

Změny tohoto dokumentu jen přes commit `docs(spec): ...` s vysvětlením v PR/commit message.
