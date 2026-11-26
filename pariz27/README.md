# Paříž 27

Osobní centrum pro plánování cesty do Paříže. Je to instalovatelná webová aplikace (PWA) pro **iPhone, iPad i počítač**. Data se synchronizují přes Supabase a aplikace funguje i offline.

<p align="center"><img src="public/icons/icon-512.png" width="120" alt="Ikona Paříž 27"></p>

## Co aplikace umí

**Rozpočet**
- Hlavní údaj je **celkový rozpočet na osobu**. Přepočítá se po každé změně.
- Položky mají název, cenu v CZK nebo EUR, přepínač „Cena je za 2 osoby“, kategorii, stav platby a poznámku.
- U každé položky je vidět zadaná cena i částka, která se započítá do vašeho rozpočtu.
- Souhrn ukazuje počet položek, kolik je zaplaceno, kolik zbývá zaplatit a orientační cenu pro všechny cestující.
- Přehled podle kategorií s rozbalitelnými sekcemi, filtry podle kategorie a podle zaplacení.
- Úpravy, mazání s potvrzením, rychlé označení zaplacení.
- Export do **CSV** (Excel, Numbers) a do **PDF** pro tisk a sdílení.

**Nápady a poznámky**
- Nadpis, text, **fotografie z galerie**, **odkazy** (Instagram, TikTok, web, mapy…) a štítky.
- Odkazy jsou klikací a otevírají se v prohlížeči. Pokud to jde, zobrazí se náhled s názvem a obrázkem.
- Vyhledávání (i bez diakritiky), filtr štítků, připnutí důležitých poznámek.
- Poznámky se ukládají automaticky při psaní.

**Další funkce**
- Úvodní přehled: rozpočet, počty položek a nápadů, rychlé akce, odpočet do odjezdu.
- Nastavení cesty: název, termín, počet cestujících (výchozí 2) a ruční směnný kurz EUR/CZK.
- Záloha všech dat do jednoho souboru JSON (včetně fotografií) a obnova ze zálohy.
- Stav synchronizace na každé obrazovce: *Synchronizováno*, *Synchronizuji…* nebo *Offline – změny čekají na synchronizaci*.

---

## Jak aplikace funguje (architektura)

| Vrstva | Technologie |
|---|---|
| Uživatelské rozhraní | React 19, TypeScript, Tailwind CSS 4 |
| PWA | Vite + `vite-plugin-pwa` (Workbox service worker, manifest, ikony) |
| Data v zařízení | IndexedDB (Dexie), aplikace čte vždy odsud, proto je rychlá a funguje offline |
| Server | Supabase: PostgreSQL + Row Level Security, Auth (e-mail a heslo), Storage (fotky), Realtime |
| Náhledy odkazů | Serverless funkce Vercel `/api/link-preview` |
| Hosting | Vercel |

**Synchronizace (local-first).** Každá změna se nejdřív uloží do zařízení a označí k odeslání. Synchronizace ji pak pošle na server. Druhé zařízení se o změně dozví okamžitě přes Supabase Realtime a stáhne ji.

**Žádné tiché přepisování.** Každý záznam má na serveru číslo verze. Změna se uloží jen tehdy, pokud se záznam mezitím nezměnil jinde. Když dvě zařízení upraví stejnou věc současně (typicky obě offline), aplikace ukáže **konflikt** s oběma verzemi a vy vyberete, kterou ponechat.

**Přesné výpočty.** Všechny výpočty jsou na jednom místě v `src/lib/budget.ts`. Částky se ukládají jako celá čísla v haléřích nebo centech a sčítají se jako přesné zlomky. Zaokrouhluje se jen jednou, až výsledná částka. Pro každou položku platí:

```
cena na osobu = zadaná cena / počet cestujících   (když je zapnuto „Cena je za 2 osoby“)
cena na osobu = zadaná cena                       (jinak)
můj rozpočet  = součet cen na osobu (přepočteno na Kč)
```

Kurz EUR/CZK se nikdy nemění sám. Bez kurzu aplikace nezobrazí zavádějící součet, jen upozornění a součet položek v Kč.

### Struktura projektu

```
pariz27/
├── api/link-preview.ts          serverová funkce pro náhledy odkazů (Vercel)
├── e2e/                         testy celé aplikace v prohlížeči (Playwright)
├── public/                      ikony aplikace
├── scripts/generate-icons.mjs   generátor ikon
├── src/
│   ├── lib/budget.ts            ⭐ centrální výpočty rozpočtu
│   ├── lib/money.ts             čtení a formátování částek
│   ├── lib/db.ts, repo.ts       lokální databáze a změny dat
│   ├── lib/sync/                synchronizace se Supabase
│   ├── lib/export/              CSV, PDF, záloha JSON
│   ├── components/, pages/      obrazovky a komponenty
│   └── state/                   přihlášení, data, oznámení
├── supabase/migrations/         databázové schéma a bezpečnostní pravidla
├── tests/unit/                  testy výpočtů, synchronizace, exportů
└── tests/db/                    testy databáze a RLS na skutečném PostgreSQL
```

---

## 1. Spuštění na počítači

Potřebujete [Node.js](https://nodejs.org) verze 20 nebo novější.

```bash
cd pariz27
npm install
cp .env.example .env.local     # a doplňte hodnoty ze Supabase (krok 2)
npm run dev
```

Aplikace poběží na `http://localhost:5173`.

> Bez vyplněného `.env.local` aplikace nabídne režim **„Používat jen v tomto zařízení“**. Všechno v něm funguje, jen se data nesynchronizují.

---

## 2. Nastavení Supabase (jednorázově, asi 10 minut)

1. Založte si účet na [supabase.com](https://supabase.com) a vytvořte **New project**.
   - Region zvolte **Central EU (Frankfurt)**, je nejblíž.
   - Heslo k databázi si uložte, aplikace ho nepotřebuje.
2. **Vytvoření databáze.** V levém menu otevřete **SQL Editor → New query**. Vložte celý obsah souboru
   [`supabase/migrations/20261126000000_init.sql`](supabase/migrations/20261126000000_init.sql) a klikněte na **Run**.
   Vytvoří se tabulky, bezpečnostní pravidla (RLS), soukromé úložiště fotografií a zapne se Realtime.
   *(Alternativa pro pokročilé: `npx supabase link` a `npx supabase db push`.)*
3. **Přihlašování.** Otevřete **Authentication → Sign In / Providers → Email** a nechte zapnuté *Enable Email provider*.
   - *Confirm email* může zůstat zapnuté. Po registraci vám přijde e-mail s odkazem, který je potřeba otevřít.
4. **Adresy aplikace.** Otevřete **Authentication → URL Configuration**:
   - *Site URL*: adresa aplikace na Vercelu (např. `https://pariz27.vercel.app`). Do nasazení můžete dočasně nechat `http://localhost:5173`.
   - *Redirect URLs*: přidejte `https://pariz27.vercel.app/**` a `http://localhost:5173/**`.
5. **Klíče.** Otevřete **Project Settings → API Keys** (případně **Data API**) a zkopírujte:
   - **Project URL** do proměnné `VITE_SUPABASE_URL`
   - **anon public** (nebo **publishable**) klíč do proměnné `VITE_SUPABASE_ANON_KEY`

   ⚠️ Klíč **service_role / secret** do aplikace nikdy nevkládejte.
6. *(Doporučeno, až budete mít účet)*: v **Authentication → Sign In / Providers** vypněte **Allow new users to sign up**.
   Pak si na vaší adrese nikdo cizí účet nezaloží.

---

## 3. První nasazení na Vercel

1. Přihlaste se na [vercel.com](https://vercel.com) přes GitHub.
2. **Add New → Project** a vyberte repozitář `hlidac-letenek`.
3. V nastavení importu:
   - **Root Directory:** `pariz27` (důležité, aplikace je v podsložce)
   - **Framework Preset:** Vite (detekuje se sám)
   - **Environment Variables:** přidejte `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY` se stejnými hodnotami jako v `.env.local`
4. Klikněte na **Deploy**. Za minutu dostanete adresu, např. **`https://pariz27.vercel.app`**
   (přesný název uvidíte ve Vercelu; v *Settings → Domains* ho můžete změnit).
5. Tuto adresu doplňte do Supabase (krok 2.4: *Site URL* a *Redirect URLs*).
6. Otevřete adresu v prohlížeči, klikněte na **Vytvořit účet**, potvrďte e-mail a přihlaste se.

> Náhledy odkazů (`/api/link-preview`) fungují jen na Vercelu, při lokálním `npm run dev` se zobrazí jen samotný odkaz.

---

## 4. Instalace na iPhone

1. Otevřete adresu aplikace v **Safari** (instalace na plochu funguje ze Safari).
2. Přihlaste se.
3. Klepněte na tlačítko **Sdílet** (čtvereček se šipkou dole uprostřed).
4. Sjeďte níž a zvolte **Přidat na plochu**. Název „Paříž 27“ je předvyplněný, potvrďte **Přidat**.
5. Spusťte aplikaci **z ikony na ploše** a **přihlaste se v ní znovu**.
   Aplikace na ploše má na iOS vlastní úložiště oddělené od Safari, proto se přihlašujete ještě jednou.

## 5. Instalace na iPad

Postup je stejný jako na iPhonu, jen tlačítko **Sdílet** je v Safari **vpravo nahoře** vedle adresního řádku.
Na iPadu se zobrazí širší rozložení s bočním panelem.

## 6. Stejný účet a synchronizace mezi iPhonem a iPadem

- Na **obou zařízeních se přihlaste stejným e-mailem a heslem**. Účet se vytváří jen jednou.
- Změny se objeví na druhém zařízení během pár sekund, pokud jsou obě online.
- Stav synchronizace je vidět nahoře na každé obrazovce (na iPadu dole v bočním panelu) a v **Nastavení → Synchronizace**, kde je i tlačítko **Synchronizovat nyní**.
- **Offline:** můžete normálně přidávat, upravovat i mazat. Stav ukáže *„Offline – změny čekají na synchronizaci“* a po připojení se vše odešle samo.
- **Konflikt:** pokud jste stejnou položku upravili na obou zařízeních současně, objeví se červený pruh *„Změny na dvou zařízeních“*. Vyberete *Ponechat moji* nebo *Použít z druhého*.
- Změnu kurzu EUR/CZK na jednom zařízení druhé zařízení výslovně oznámí.

## 7. Aktualizace aplikace

- **Nová verze kódu:** stačí nahrát změny do GitHubu. Vercel aplikaci automaticky znovu nasadí.
  Otevřená aplikace pak sama nabídne *„Je k dispozici nová verze“*, stačí klepnout na **Aktualizovat**.
  Ikonu na ploše není potřeba přeinstalovat.
- **Změna databáze:** pokud v budoucnu přibude nový soubor v `supabase/migrations/`, spusťte ho stejně jako v kroku 2.2 (SQL Editor → Run).
- **Ikony:** po úpravě `scripts/generate-icons.mjs` spusťte `npm run icons`.

---

## Testy

```bash
npm test             # výpočty, formátování, synchronizace, exporty, náhledy odkazů (76 testů)
npm run test:db      # migrace a bezpečnost (RLS) na skutečném PostgreSQL (18 testů)
npm run test:e2e     # celá aplikace v prohlížeči: iPhone, iPad a počítač (39 testů)
npm run typecheck    # kontrola typů TypeScriptu
npm run lint         # kontrola kódu
```

- `test:db` potřebuje běžící PostgreSQL. Připojení nastavíte proměnnou `TEST_DATABASE_URL`
  (výchozí `postgres://postgres:postgres@localhost:5432/postgres`). Test si vytvoří vlastní dočasnou databázi a po sobě ji smaže.
- `test:e2e` si sám sestaví aplikaci bez Supabase a spustí ji. Poprvé je potřeba `npx playwright install chromium`.
- Na GitHubu se všechny testy spouštějí automaticky (`.github/workflows/pariz27.yml`).

Testy mimo jiné ověřují příklad ze zadání: ubytování 12 000 Kč za 2 osoby, letenky 5 000 Kč za 2 osoby a vstupné 800 Kč dávají dohromady **9 300 Kč na osobu**.

## Bezpečnost

- **Row Level Security** na všech tabulkách: každý uživatel vidí a mění jen svá data (ověřeno testy `tests/db`).
- Fotografie jsou v **soukromém** úložišti, každý uživatel jen ve své složce. Smazáním poznámky se smažou i její fotky.
- Žádné klíče v kódu. Veřejný klíč Supabase se zadává přes proměnné prostředí a je určený pro prohlížeč.
- Funkce pro náhledy odkazů funguje jen pro přihlášené uživatele a blokuje přístup do vnitřních sítí (ochrana proti SSRF).
- Na Vercelu jsou nastavené bezpečnostní hlavičky včetně Content-Security-Policy (`vercel.json`).
  *Pokud byste Supabase používali s vlastní doménou, doplňte ji do `connect-src` v `vercel.json`.*

## Řešení problémů

| Problém | Řešení |
|---|---|
| Po registraci se nejde přihlásit | Otevřete odkaz z potvrzovacího e-mailu (zkontrolujte i spam). |
| Odkaz z e-mailu vede na `localhost` | V Supabase upravte *Site URL* a *Redirect URLs* (krok 2.4). |
| Aplikace píše „Synchronizace není nastavená“ | Na Vercelu chybí proměnné `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY`. Po doplnění spusťte **Redeploy**. |
| „Chyba synchronizace“ | Nastavení → Synchronizace ukáže detail. Často pomůže odhlásit se a znovu přihlásit, nebo zkontrolovat, že proběhla migrace (krok 2.2). |
| Náhled odkazu z Instagramu se nezobrazí | Instagram náhledy často blokuje. Odkaz se přesto uloží a otevře, jen bez obrázku. |
| Celkový rozpočet ukazuje „—“ | Máte položky v eurech a není nastaven kurz. Nastavení → Směnný kurz EUR/CZK. |
