/**
 * Pool otázek pro quiz "Poznáš podvod?" (/test).
 *
 * 20 otázek: 5 easy / 10 medium / 5 hard. Každá hra vybere z tohoto
 * poolu 3 easy + 5 medium + 2 hard (viz lib/quiz/build.ts) — pevný
 * poměr obtížnosti, náhodný konkrétní výběr.
 *
 * 4 otázky mají správnou odpověď "je to v pořádku" (q09, q10, q18,
 * q20) — bez nich by šlo uhodnout, že správná odpověď je vždy "podvod",
 * a hráč by přestal číst.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export const YESNO_CHOICES = ['Je to podvod', 'Je to v pořádku'] as const;

interface SmsContent {
  ui: 'sms';
  sender: string;
  time: string;
  body: string;
}

interface BrowserContent {
  ui: 'browser';
  domain: string;
  body: string;
}

interface EmailContent {
  ui: 'email';
  from: string;
  subject: string;
  body: string;
}

type Content = SmsContent | BrowserContent | EmailContent;

interface QuestionBase {
  id: string;
  difficulty: Difficulty;
  explanation: string;
}

type YesNoVariant = { type: 'yesno'; correctIndex: 0 | 1 };
type ChoiceVariant = { type: 'choice'; choices: string[]; correctIndex: number };

export type QuizQuestion = QuestionBase & Content & (YesNoVariant | ChoiceVariant);

export const QUESTION_POOL: QuizQuestion[] = [
  // ── EASY (5): q06, q07, q08, q11, q12 ───────────────────────────
  {
    id: 'q06',
    difficulty: 'easy',
    ui: 'sms',
    sender: 'Česká pošta',
    time: '8:23',
    body: 'Vaše zásilka čeká na doručení. Doplaťte celní poplatek 49 Kč: ceska-posta-doplatek.xyz',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Pošta neposílá odkazy na doplatky přes SMS na cizí domény. Skutečná doména je pošta.cz. Koncovka .xyz a "doplaťte přes odkaz" je klasický smishing. Odkaz vede na falešnou platební bránu, co ukradne údaje z karty.',
  },
  {
    id: 'q07',
    difficulty: 'easy',
    ui: 'sms',
    sender: 'Bezpečnostní oddělení banky',
    time: '15:40',
    body:
      'Dobrý den, tady bezpečnostní oddělení vaší banky. Zaznamenali jsme podezřelou transakci. Abychom vaše peníze ochránili, přesuňte je prosím na zabezpečený účet, který vám teď nadiktuji.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Banka vám NIKDY nezavolá s tím, ať někam přesunete peníze. "Zabezpečený účet" je účet podvodníka. Zavěste a zavolejte bance sami na oficiální číslo ze zadní strany karty.',
  },
  {
    id: 'q08',
    difficulty: 'easy',
    ui: 'browser',
    domain: 'investice-zisk-teď.online',
    body:
      'Známá česká celebrita prozrazuje, jak vydělala miliony na kryptu! Stačí vložit 5 000 Kč a náš systém vám GARANTUJE 30 % měsíčně. Začněte ještě dnes.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Zaručený výnos neexistuje — kdo ho slibuje, lže. Celebrita o tom nikdy neslyšela (fotka je ukradená). "Garantovaných 30 % měsíčně" je matematický nesmysl. Klasický investiční scam.',
  },
  {
    id: 'q11',
    difficulty: 'easy',
    ui: 'email',
    from: 'vyhra@euro-millions-winner.net',
    subject: 'Gratulujeme!',
    body:
      'Vážený výherce, ve zvláštním losování jste vyhrál 850 000 EUR! Vaše e-mailová adresa byla vylosována náhodně. Pro vyzvednutí výhry kontaktujte našeho agenta a uhraďte manipulační poplatek 1 900 Kč.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Nehráli jste žádnou loterii, tak jak byste mohli vyhrát? "Poplatek za vyzvednutí výhry" je klasika — skutečná výhra se nikdy nedaní platbou předem. Zaplatíte poplatek a výhra nikdy nepřijde.',
  },
  {
    id: 'q12',
    difficulty: 'easy',
    ui: 'sms',
    sender: '+420 776 xxx xxx',
    time: '9:14',
    body: '🎉 Gratulujeme! Váš telefon byl vybrán jako výherce iPhonu 16 Pro! Pro doručení zdarma zaplaťte jen poštovné 99 Kč: iphone-vyhra-cz.info',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Nikdo nerozdává iPhony náhodným číslem. "Zaplaťte jen poštovné" je návnada — cílem je vytáhnout z vás platební údaje. Doména .info s "vyhra" v názvu je červená vlajka.',
  },

  // ── MEDIUM (10): q01, q02, q03, q04, q05, q13, q14, q15, q16, q17 ─
  {
    id: 'q01',
    difficulty: 'medium',
    ui: 'sms',
    sender: 'Marek H.',
    time: '14:02',
    body:
      'Ahoj, mám víc zájemců, tak kdo dřív pošle zálohu, bere. Účet ti pošlu, zboží posílám hned po platbě.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Klasický vzorec. Cena "moc dobrá" (PS5 za 6 000 Kč místo běžných 12 000), platba předem, nesoulad jména na účtu s tím, jak se prodejce představil, tlak přes "víc zájemců". Kdyby zmizel, nemáte jak peníze vrátit. Na Marketplace používejte ochranu kupujícího, ne převod předem.',
  },
  {
    id: 'q02',
    difficulty: 'medium',
    ui: 'browser',
    domain: 'zazrak-na-klouby-akce.cz',
    body: 'Zázračný přípravek na bolavé klouby! SLEVA 70 % jen dnes. [košík] [objednat]',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Nikde na webu není uvedeno IČO, firma, adresa ani kontakt na provozovatele. Když nevíte, s kým uzavíráte smlouvu, nemáte vůči komu reklamovat ani vymáhat peníze. Tohle je nejčastější typ rizikového e-shopu podle ČOI (85 % jejich záznamů).',
  },
  {
    id: 'q03',
    difficulty: 'medium',
    ui: 'sms',
    sender: 'Petr Novák',
    time: '17:20',
    body: 'Pošli zálohu na účet, majitel je Oleksandr T. — je to účet bratra, já zrovna nemám přístup ke svému.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Nesoulad jména prodejce (Petr Novák, domlouváno přes Bazoš) a majitele účtu je velká červená vlajka. "Účet bratra/kamaráda" je klasická výmluva. Poctivý prodejce má peníze chodit na svůj vlastní účet.',
  },
  {
    id: 'q04',
    difficulty: 'medium',
    ui: 'sms',
    sender: 'Prodávající (Vinted)',
    time: '20:15',
    body: 'Ahoj, tady to Vinted strhává poplatky, napiš mi radši na WhatsApp: +420 xxx xxx xxx, domluvíme se napřímo levněji.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Přesun mimo platformu znamená ztrátu ochrany kupujícího. Na Vinted/Bazoši máte aspoň nějakou stopu a ochranu — na WhatsApp jste na to sami. Podvodníci tohle dělají skoro vždycky hned po prvním kontaktu.',
  },
  {
    id: 'q05',
    difficulty: 'medium',
    ui: 'browser',
    domain: 'facebook.com',
    body:
      'Skupina "Bazar — koncerty a festivaly": Prodám 2 lístky na vyprodaný koncert za polovic, protože nemůžu jít. Platba předem na účet, lístky pošlu e-mailem jako PDF.',
    type: 'choice',
    choices: [
      'Že prodává levně',
      'Platba předem cizímu člověku + PDF vstupenka, kterou lze zkopírovat',
      'Že to je na Facebooku',
      'Že nemůže jít na koncert',
    ],
    correctIndex: 1,
    explanation:
      'PDF vstupenka se dá poslat stokrát nebo zfalšovat. Platba předem cizímu člověku ze skupiny + vyprodaná akce + cena pod cenou = klasický vzorec. Na místě zjistíte, že stejný lístek koupilo pět lidí.',
  },
  {
    id: 'q13',
    difficulty: 'medium',
    ui: 'sms',
    sender: 'DPD-Info',
    time: '11:47',
    body: 'Nezastihli jsme vás při doručení zásilky. Pro přeplánování doručení potvrďte adresu a uhraďte celní poplatek 47 Kč: dpd-redelivery.co',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Klasický fake-kurýr smishing. Kurýrní firmy neposílají odkazy na "celní poplatky" přes SMS. Skutečná DPD má doménu dpd.cz, ne dpd-redelivery.co. Odkaz vede na falešnou platební bránu.',
  },
  {
    id: 'q14',
    difficulty: 'medium',
    ui: 'browser',
    domain: 'nike-vyprodej-cz.shop',
    body: 'Oficiální výprodej Nike — boty až −80 %! Air Max jen 890 Kč. Pouze dnes, poslední kusy! Platba pouze předem převodem.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Značkové zboží za −80 % na doméně, co s Nike nemá nic společného (nike-vyprodej-cz.shop není nike.com). Platba pouze převodem předem = žádná ochrana. Nike neprodává přes náhodné .shop domény.',
  },
  {
    id: 'q15',
    difficulty: 'medium',
    ui: 'email',
    from: 'michael.k.love89@gmail.com',
    subject: 'Potřebuji tvou pomoc, lásko',
    body:
      'Miláčku, tolik toužím tě konečně vidět. Mám koupenou letenku, ale na letišti mi zablokovali účet a nemůžu zaplatit odbavení. Můžeš mi poslat 12 000 Kč? Vrátím ti to hned, jak přiletím. Miluju tě.',
    type: 'choice',
    choices: [
      'Že píše e-mailem',
      'Nikdy jste se nepotkali osobně a už chce peníze',
      'Že má letenku',
      'Že píše "miláčku"',
    ],
    correctIndex: 1,
    explanation:
      'Romance scam. Někdo, koho jste nikdy fyzicky nepotkali, buduje vztah na dálku a pak přijde "nouzová" žádost o peníze. Vždycky je to blokovaný účet, nemoc nebo zabavená zásilka. Peníze nikdy neuvidíte a "láska" zmizí.',
  },
  {
    id: 'q16',
    difficulty: 'medium',
    ui: 'email',
    from: 'ucetni@vas-dodavatel.cz',
    subject: 'Změna bankovního spojení',
    body:
      'Dobrý den, informujeme vás o změně našeho čísla účtu. Prosíme, veškeré další platby směřujte na nový účet: 2401xxxxxx/2010. Nezaplacené faktury prosím uhraďte na tento nový účet.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Podvod se změnou účtu (BEC — business email compromise). Podvodník se vydává za dodavatele a přesměruje platby na svůj účet. Vždy ověřte změnu účtu telefonicky na známém čísle, nikdy ne podle údajů z e-mailu samotného.',
  },
  {
    id: 'q17',
    difficulty: 'medium',
    ui: 'sms',
    sender: 'Tomáš',
    time: '21:03',
    body:
      'Ahoj, promiň že obtěžuju. Došla mi baterka a musím nutně zaplatit, ale nejde mi to. Můžeš mi prosím koupit dobíjecí kupón Paysafecard za 1 000 Kč a poslat mi kód? Vrátím ti to večer, díky moc!!',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Hacknutý účet kamaráda (nebo podvržené číslo). Žádost o dobíjecí kupóny / dárkové karty a "pošli mi kód" je téměř vždy podvod — kód se dá okamžitě zpeněžit a je nevratný. Zavolejte kamarádovi, ověříte to za 10 vteřin.',
  },

  // ── HARD (5): q09, q10, q18, q19, q20 ────────────────────────────
  {
    id: 'q09',
    difficulty: 'hard',
    ui: 'sms',
    sender: 'Vaše banka',
    time: '10:47',
    body: 'Váš ověřovací kód je 847 291. Nikdy ho nikomu nesdělujte.',
    type: 'choice',
    choices: [
      'Je to podvod, smažu to',
      'Zadám kód do banky, kam se právě přihlašuji — je to legitimní',
      'Pošlu kód zpět pro ověření',
      'Zavolám na číslo z SMS',
    ],
    correctIndex: 1,
    explanation:
      'Tohle NENÍ podvod — banka vám fakt posílá ověřovací kódy. Ale pozor: kód zadáváte JEN do banky, kam se sami přihlašujete. Nikdy ho neříkejte nikomu po telefonu, ani "bankéři", co vám volá.',
  },
  {
    id: 'q10',
    difficulty: 'hard',
    ui: 'browser',
    domain: 'maly-cesky-obchod.cz',
    body:
      'Menší e-shop s obyčejným, ne moc profi designem. ALE: uvedené IČO, adresa, kontakt, obchodní podmínky. IČO sedí v ARESu na reálnou firmu. Recenze smíšené, ale reálné.',
    type: 'yesno',
    correctIndex: 1,
    explanation:
      'Ošklivý design ≠ podvod. Tenhle e-shop má všechno, co má mít: dohledatelnou firmu, kontakt, podmínky. Malý poctivý obchod může vypadat neprofesionálně a být úplně v pořádku. Podstatné je, že víte, s kým obchodujete.',
  },
  {
    id: 'q18',
    difficulty: 'hard',
    ui: 'sms',
    sender: 'Vaše banka',
    time: '16:03',
    body:
      'Zaznamenali jsme neobvyklou transakci 14 900 Kč u obchodníka v zahraničí. Pokud jste to nebyli vy, kontaktujte nás na čísle na zadní straně karty. Neodpovídejte na tuto SMS.',
    type: 'choice',
    choices: [
      'Je to podvod, ignorovat',
      'Zavolat na číslo z SMS a nahlásit',
      'Zavolat bance na číslo ze zadní strany karty — SMS může být pravá',
      'Kliknout na odkaz a ověřit transakci',
    ],
    correctIndex: 2,
    explanation:
      'Tohle může být legitimní upozornění banky — ale i podvod. Klíč: sama SMS vám dává správnou radu (zavolejte na číslo z karty), neobsahuje odkaz ani nechce údaje. Nikdy nevolejte číslo z SMS ani neklikejte na odkaz — vždy si najděte kontakt banky sami.',
  },
  {
    id: 'q19',
    difficulty: 'hard',
    ui: 'browser',
    domain: 'csob.cz.secure-login-verify.com',
    body: 'Stránka vypadá jako přesná kopie internetového bankovnictví ČSOB — správné logo, barvy, přihlašovací formulář.',
    type: 'yesno',
    correctIndex: 0,
    explanation:
      'Zákeřný phishing. Skutečná doména je to, co je těsně před koncovkou — tady secure-login-verify.com, NE csob.cz. "csob.cz" je jen poddoména, kterou si podvodník nastavil, aby vás zmátl. Skutečná ČSOB je přesně csob.cz, nic za tím. Dokonalý vzhled nic neznamená — zkopírovat stránku umí každý.',
  },
  {
    id: 'q20',
    difficulty: 'hard',
    ui: 'email',
    from: 'noreply@financnisprava.cz',
    subject: 'Přeplatek na dani',
    body:
      'Na základě vašeho daňového přiznání vám vznikl přeplatek 3 240 Kč. Přeplatek bude automaticky odeslán na účet uvedený ve vašem přiznání do 30 dnů. Pro dotazy kontaktujte svůj finanční úřad.',
    type: 'choice',
    choices: [
      'Podvod — úřady takhle nepíšou',
      'Může být legitimní — nechce údaje, neposílá odkaz, peníze jdou na známý účet',
      'Podvod — přeplatky neexistují',
      'Určitě podvod, smazat',
    ],
    correctIndex: 1,
    explanation:
      'Tohle vypadá podezřele, ale má znaky legitimní zprávy: nechce po vás žádné údaje, neobsahuje odkaz k "ověření", peníze jdou automaticky na účet z přiznání. Skutečné přeplatky existují. POZOR ale: kdyby stejný e-mail chtěl "potvrdit údaje přes odkaz" nebo "zadat číslo účtu" — to už je podvod. Rozdíl je v tom, jestli po vás něco chtějí.',
  },
];
