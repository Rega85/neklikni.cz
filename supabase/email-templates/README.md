# Supabase Auth — české e-mailové šablony

České HTML šablony pro Supabase Auth s brandingem NeKlikni.cz.
Šablony jsou v repu pro verzování — **musí se ale ručně nasadit**
v Supabase Dashboardu (nelze přes migraci).

## Proč na tom záleží

Default Supabase šablony jsou anglické (`Confirm your signup`), bez loga
a často padají do spamu. Cílovka NeKlikni.cz jsou netechničtí čeští uživatelé →
6 z 6 lidí, kteří se dostali na `/login`, registraci nedokončilo.

## Šablony

| Soubor                  | Šablona v dashboardu | Předmět e-mailu                          |
| ----------------------- | -------------------- | ---------------------------------------- |
| `confirm-signup.html`   | Confirm signup       | `Potvrď svůj účet na NeKlikni.cz`        |
| `magic-link.html`       | Magic Link           | `Tvůj přihlašovací odkaz na NeKlikni.cz` |
| `reset-password.html`   | Reset Password       | `Obnova hesla na NeKlikni.cz`            |

## Důležité: `{{ .TokenHash }}` flow (ne `{{ .ConfirmationURL }}`)

Šablony **záměrně nepoužívají** `{{ .ConfirmationURL }}`. Důvod:

- `{{ .ConfirmationURL }}` jede PKCE flow → vyžaduje `code_verifier`
  v `localStorage` **stejného prohlížeče**, který registraci spustil.
- Reálně lidi otevírají potvrzovací e-mail na **telefonu** (registrace
  proběhla na desktopu) → PKCE selže → uživatel skončí na `/login`
  místo přihlášení. To je `PROBLÉM 3` z taskového briefu.

Šablony místo toho používají `{{ .TokenHash }}`, který naše
`app/auth/callback/route.ts` ověří přes `verifyOtp()` — funguje
cross-device, uživatel po kliknutí přistane rovnou přihlášen.

URL ve všech šablonách:
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=<TYPE>&next=<PATH>
```

kde `<TYPE>` je `signup` / `magiclink` / `recovery`.

## Nasazení šablon (Supabase Dashboard)

1. Otevři **Dashboard → Authentication → Email Templates**.
2. Pro každou ze 3 šablon:
   - Subject: viz tabulka výše.
   - Message body: zkopíruj obsah příslušného `.html` souboru.
3. Ověř že **Site URL** (Authentication → URL Configuration) je
   `https://www.neklikni.cz` (ne localhost).
4. Ověř že **Redirect URLs** obsahují minimálně:
   - `https://www.neklikni.cz/auth/callback`
   - `https://www.neklikni.cz/**` (volitelné, kvůli `next=`)

## Doručitelnost: napojit Resend jako SMTP (silně doporučeno)

Default Supabase SMTP má **velmi nízký rate limit** (~3 e-maily/h
zdarma) a posílá z generické domény → vysoká šance na spam.

Resend už máme nakonfigurovaný (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
pro kontaktní formulář a `databaze` mailery. Stačí ho připnout
i k Supabase Auth:

1. **Resend → Domains** → ověř že `neklikni.cz` (nebo subdoména
   `mail.neklikni.cz`) má zelený DKIM/SPF.
2. **Resend → API Keys** → vytvoř nový klíč `supabase-smtp`
   (Sending access only).
3. **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**:
   - Enable Custom SMTP: **ON**
   - Sender email: `noreply@neklikni.cz` (stejná doména jako ověřená v Resend)
   - Sender name: `NeKlikni.cz`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `<API klíč z kroku 2>`
4. **Save** → pošli si testovací registraci na vlastní e-mail.

Po napojení Resend:
- E-maily chodí z `noreply@neklikni.cz` (vlastní doména, lepší reputace).
- Rate limit je dostatečný (3 000 e-mailů/den na free planu).
- Logy doručitelnosti vidíš v Resend dashboardu.

## Update workflow

Pokud upravíš šablonu v repu, **nezapomeň ji zkopírovat
i do Supabase Dashboardu** — repo verze je jen zdroj pravdy
pro reviewy, neaplikuje se automaticky.
