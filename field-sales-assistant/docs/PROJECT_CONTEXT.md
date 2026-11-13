# PROJECT_CONTEXT – AI Field Sales Assistant

Verze: 1.0 (návrh) · Datum: 13. 11. 2026 · Stav: analýza, neprogramuje se

---

## 1. Projekt v jedné větě

Mobilní digitální asistent, který terénnímu obchodníkovi **zkrátí administrativu po návštěvě z ~10 minut na
1–3 minuty**, připraví ho na další schůzku, pomůže realizovat jeho vlastní plán cesty a spolehlivě předá
informace do kanceláře – a to **nad stávajícími firemními systémy**, ne místo nich.

## 2. Problém, který řešíme

### 2.1 Současný proces (podle zadání)

| # | Činnost | Jak to probíhá dnes | Bolest |
|---|---|---|---|
| 1 | Zápis z návštěvy | Ručně, do firemní webové aplikace | Min. ~10 min na zápis; po celém dni se zápisy kumulují |
| 2 | Zpřístupnění kolegům | Informace jsou ve firemní aplikaci vidět přibližně až po 30 min | Zpoždění; příčina ❓ `[D-IT-08]` |
| 3 | Předání do kanceláře | Telefonát kolegyni, která připravuje nabídky | Informace se předávají ústně, mohou se ztratit nebo zkreslit; kolegyně se musí doptávat ❓ `[D-BO-03]` |
| 4 | Příprava na dalšího zákazníka | Hledání v poznámkách, kalendáři, vzpomínání na jména a historii | Ztráta času, riziko zapomenutých slibů |
| 5 | Navigace | Ruční zadávání adresy do Google Maps | Opakovaná zbytečná práce, riziko chybné adresy |
| 6 | Plánování cesty | 1–2 dny předem, vlastní výběr a pořadí zákazníků | Časy se počítají v hlavě; zpoždění během dne se špatně promítají do zbytku plánu |

### 2.2 Proč to stojí za řešení

Obchodník je placen za čas strávený se zákazníky, ne za psaní. Každá minuta administrativy navíc:
- snižuje počet nebo kvalitu návštěv,
- zhoršuje kvalitu dat (zápis psaný večer z paměti je horší než zápis hned po schůzce),
- zpomaluje reakci firmy na poptávku (nabídka odchází později).

**Hypotéza přínosu** (ověří pilot, čísla nejsou změřená): při 5 návštěvách denně a úspoře ~7 min na zápisu
a ~3 min na přípravě další schůzky ušetří obchodník ~50 min denně. Skutečný počet návštěv ❓ `[D-OB-01]`.

## 3. Vize produktu

Osobní digitální asistent, který pomáhá ve třech fázích pracovního dne:

| Fáze | Co asistent dělá | Moduly |
|---|---|---|
| **Před schůzkou** | Briefing o zákazníkovi, historie, plán cesty, harmonogram | C, B, D |
| **Po schůzce** | Hlasový zápis → AI strukturuje → obchodník zkontroluje → uloženo, úkoly vytvořeny, poptávka předána | A, B, H, I |
| **Během dne** | Další zákazník, navigace jedním tlačítkem, přepočet harmonogramu při zpoždění, zákazníci v okolí | F, D, E, J |

### 3.1 Co produkt JE

- Vrstva nad stávajícími systémy, která zjednodušuje každodenní práci obchodníka.
- Nástroj, kde **AI navrhuje a člověk rozhoduje a potvrzuje**.
- Mobile-first aplikace použitelná jednou rukou, s plnohodnotnou verzí pro notebook (plánování, kancelář).

### 3.2 Co produkt NENÍ (záměrně)

| Není | Proč |
|---|---|
| Náhrada firemního CRM/ERP | Firma už systém má; náhrada = drahá migrace a odpor uživatelů. Přebíráme jen to, co obchodník potřebuje vidět. |
| Autopilot, který určuje, kam jet | Obchodník zná zákazníky a vztahy lépe než algoritmus. AI pouze doporučuje. |
| Nástroj pro sledování polohy zaměstnanců | Poloha se používá jen na vyžádání (zákazníci v okolí) a neukládá se. Viz RISKS L-04. |
| Nahrávání schůzek se zákazníky | Nahrává se pouze diktát obchodníka **po** schůzce. Nahrávání jednání by vyžadovalo souhlas všech účastníků. |
| Generátor cen a nabídek (v MVP) | AI nesmí vymýšlet ceny, dostupnost, parametry ani termíny. Nabídky zůstávají na kanceláři. |

## 4. Uživatelé a role

### P1 – Terénní obchodní zástupce (primární uživatel)

První uživatel: otec autora projektu.

| Víme | Nevíme ❓ |
|---|---|
| Jezdí po celé ČR, navštěvuje stávající i nové zákazníky | Počet návštěv za den/týden `[D-OB-01]`, počet zákazníků v portfoliu `[D-OB-02]` |
| Udržuje dlouhodobé vztahy, hledá příležitosti | Typ telefonu (iOS/Android), verze OS, MDM `[D-IT-11]` |
| Používá firemní telefon, notebook, firemní webovou aplikaci, kalendář, Google Maps | Jaký kalendář `[D-IT-06]`, název firemní aplikace `[D-IT-01]` |
| Plánuje cesty 1–2 dny předem, sám volí zákazníky a pořadí | Jak přesně plánuje, kde začíná den, zda jezdí na vícedenní cesty `[D-OB-10..14]` |
| Po návštěvě volá kolegyni | Jak často návštěva vede k poptávce `[D-OB-08]` |
| | Zda mu vyhovuje diktování (hluk, auto, technické zkratky) `[D-OB-05]` |

**Kontext použití:** auto na parkovišti, rychle mezi schůzkami, často slabý mobilní signál,
někdy rukavice nebo jedna volná ruka, sluneční světlo na displeji. **Ne během řízení.**

### P2 – Kolegyně v kanceláři (back-office)

Připravuje cenové nabídky na základě informací od obchodníka. Pracuje na počítači.
Potřebuje: úplný a strukturovaný podklad poptávky, možnost doplnit a opravit, přehled stavu.
❓ Jaké údaje k nabídce minimálně potřebuje, v jakém systému nabídky tvoří `[D-BO-01..06]`.

### P3 – Vedení firmy / obchodní ředitel

Schvaluje pilot, předávání dat externím službám a případné rozšíření na další obchodníky.
Zajímá je: úspora času, kvalita dat, rychlost reakce na poptávky, bezpečnost, cena.
❓ Kdo je sponzor projektu, jaké má vedení očekávání `[D-VE-01..03]`.

### P4 – Správce (admin)

Spravuje uživatele, licence a integrace v rámci firmy. V pilotu to bude autor projektu,
později firemní IT nebo pověřená osoba.

### Budoucí uživatelé

Další obchodníci ve firmě, obchodní manažer (přehledy – s ohledem na ochranu soukromí zaměstnanců),
uživatelé dalších firem (SaaS).

## 5. Pilotní zákazník: MORAVIA ŘETĚZY

### 5.1 Co víme (ze zadání)

Firma působí v oblasti průmyslových řetězů a souvisejících komponentů. Sortiment:
válečkové řetězy; dopravní a speciální řetězy; řetězová kola; ozubená kola a hřebeny; řemenové převody;
zakázková strojírenská výroba; výrobky podle výkresové dokumentace.

Obchod zahrnuje **standardní produkty i individuální technické poptávky**.

### 5.2 Co z toho plyne pro produkt

| Specifikum | Dopad na návrh |
|---|---|
| Technické označení produktů (např. „12B-1") | Přepis řeči musí zvládat zkratky a kódy → slovník pojmů pro přepis, test v experimentu (MVP_ROADMAP, etapa 1) |
| Poptávky podle výkresů a vzorků | Přílohy k návštěvě a poptávce (foto štítku, opotřebeného dílu, výkres) |
| Individuální technické parametry | Poptávka má volné technické parametry (JSON), ne pevný formulář |
| Dlouhé obchodní cykly („modernizace příští rok") | Oddělení příležitosti od poptávky; termíny s přesností na měsíc/čtvrtletí |
| Průmysloví zákazníci s více závody | Zákazník může mít více provozoven s různými adresami |

### 5.3 Co nevíme ❓

Počet obchodníků ve firmě `[D-VE-04]`, firemní systémy `[D-IT-01..12]`, struktura zákaznických dat
`[D-DA-01..06]`, interní pravidla pro data a AI `[D-VE-05..08]`.

> V první fázi pracujeme s **fiktivními nebo anonymizovanými daty**, dokud vedení neschválí zpracování
> skutečných dat (RISKS L-01).

## 6. Funkční moduly

| Modul | Název | Účel | Priorita (návrh) |
|---|---|---|---|
| A | Hlasový asistent a zápisy | Diktát → přepis → strukturovaný zápis → kontrola | **P1** |
| B | Typy návštěv a vztahy | 5 typů návštěv, historie vztahu, upozornění na dlouho nenavštívené | **P1** (typy, historie), P3 (upozornění) |
| C | Zákazníci (CRM nadstavba) | Karta zákazníka, kontakty, briefing | **P1** |
| D | Plánovač cest | Vlastní plán, mapa, dynamický harmonogram | **P2** |
| E | Zákazníci v okolí | Dobrovolné zobrazení zákazníků poblíž | P3 |
| F | Další zákazník a navigace | Další zastávka + tlačítko Navigovat | P1 (navigace z karty), **P2** (tok dne) |
| G | Kalendář | Napojení na firemní kalendář | P3 (závisí na discovery) |
| H | Poptávky a předání do kanceláře | Strukturovaný podklad pro kolegyni | **P1-lite** (e-mail), P2 (přehled pro kancelář), Později (nabídky) |
| I | Úkoly a follow-up | Úkoly ze zápisů, přehled, připomínky | **P1** (úkoly ze zápisu), P3 (připomínky, plný přehled) |
| J | Dashboard | Dnešní plán, další zákazník, úkoly, nedokončené zápisy | **P1** (zjednodušený), P2 (s plánem cesty) |

### 6.1 Navržené úpravy priorit oproti zadání (a proč)

1. **Úkoly ze zápisu → P1.** AI je ze zápisu extrahuje tak jako tak; jejich uložení a zobrazení je levné
   a bez nich by se ztratila hlavní hodnota („ozvat se v lednu"). Připomínky a plný modul zůstávají v P3.
2. **Předání poptávky kolegyni (e-mailem) → P1-lite.** Přímo řeší telefonování a zpoždění informací.
   Je to jen formátovaný výstup ze zápisu, který už máme. Plný přehled poptávek pro kancelář je P2.
3. **Tlačítko Navigovat na kartě zákazníka → P1.** Je to pouhý odkaz do Google Maps (bez placeného API).
   Tok „další zákazník" zůstává v P2 s plánovačem.
4. **Analýza integrace → před vývojem (etapa 0).** Integrace se implementuje v P3, ale musíme dřív vědět,
   odkud v P1 vezmeme zákazníky (import exportu z firemní aplikace, nebo fiktivní data).
5. **Kalendář:** pokud discovery ukáže běžný systém (Google Workspace / Microsoft 365), může se
   **jen čtení** posunout do P2, protože do plánovače dodává pevné schůzky.

## 7. Obchodní cíle

| Horizont | Cíl | Měřítko |
|---|---|---|
| Pilot (cca 3–6 měsíců) | Ověřit, že aplikace šetří čas a obchodník ji používá denně | KPI v kap. 8; ≥ 80 % návštěv zapsaných přes aplikaci |
| Rozšíření ve firmě | Představit výsledky vedení a dalším obchodníkům | Rozhodnutí vedení o nasazení, počet licencí |
| SaaS | Nabídnout produkt dalším firmám s terénními obchodníky | Platící zákazníci, MRR (viz BUSINESS_MODEL) |

## 8. Měřítka úspěchu pilotu (KPI)

Výchozí hodnoty (baseline) změříme před pilotem (MVP_ROADMAP, etapa 0). Cílové hodnoty jsou **hypotézy**.

| KPI | Baseline | Cíl (hypotéza) | Jak měříme |
|---|---|---|---|
| Čas na jeden zápis (od konce schůzky po uložení) | ~10 min (odhad ze zadání) | ≤ 3 min | Telemetrie aplikace + baseline ručně |
| Čas na přípravu další schůzky | ❓ | ≤ 1 min | Stopky při shadowingu, dotazník |
| Čas na naplánování cesty | ❓ | −30 % | Měření při plánování |
| Počet ručních úkonů (kliknutí, přepisování adres) | ❓ | −50 % | Telemetrie, pozorování |
| Chyby v zápisech (opravené údaje při kontrole) | – | klesající trend; 0 smyšlených údajů | Log oprav při kontrole |
| Přesnost odhadu příjezdu | – | ±10 min u 80 % zastávek | Plán vs. skutečný příjezd |
| Doba od návštěvy po předání poptávky kanceláři | ❓ | ≤ 15 min | Časová razítka |
| Spokojenost (SUS dotazník, 0–100) | – | ≥ 75 | Dotazník na konci pilotu |

## 9. Principy návrhu

1. **Člověk rozhoduje.** AI navrhuje, obchodník potvrzuje. Nic se neuloží ani neodešle bez potvrzení.
2. **AI nedomýšlí.** Každý údaj má oporu v diktátu (citaci). Co nezaznělo, zůstane prázdné.
   Při nejistotě se aplikace zeptá.
3. **Pevné schůzky jsou nedotknutelné.** Systém je nikdy sám nepřesune ani nezruší.
4. **Spolehlivost před chytrostí.** Nahrávka se nesmí ztratit (ani bez signálu). Jednoduché a předvídatelné
   chování je důležitější než „chytré" funkce.
5. **Integrace místo náhrady.** Firemní systém zůstává zdrojem pravdy pro kmenová data.
6. **Minimum psaní.** Hlas, předvyplněné hodnoty, velká tlačítka, max. 3 klepnutí k hlavním úkonům.
7. **Soukromí od návrhu.** Minimum dat, oddělení firem, retence nahrávek, žádné sledování polohy.
8. **Jednoduchost architektury.** Jeden jazyk, jedna databáze, spravované služby; složitost až když je potřeba.

## 10. Předpoklady a omezení

### Předpoklady (je potřeba potvrdit)

| ID | Předpoklad | Ověření |
|---|---|---|
| A1 | Obchodník má na firemním telefonu mobilní data a smí instalovat/používat webovou aplikaci | `[D-IT-11]` |
| A2 | Vedení je ochotno pilot podpořit a schválit použití externí AI (po splnění GDPR) | `[D-VE-05]` |
| A3 | Z firemní aplikace lze získat aspoň export zákazníků (CSV/XLSX) | `[D-IT-04]` |
| A4 | Čeština s technickými termíny je přepisovatelná s přijatelnou přesností | Experiment, etapa 1 |
| A5 | Obchodník je ochoten diktovat (nikoli psát) zápisy | Experiment + rozhovor `[D-OB-05]` |
| A6 | Vývoj provádí jeden vývojář (autor) při částečném úvazku s pomocí AI nástrojů | Potvrdit kapacitu |

### Omezení

- Neobcházíme autentizaci ani bezpečnostní mechanismy firemních systémů (INTEGRATION_ANALYSIS).
- Do schválení používáme jen fiktivní/anonymizovaná data.
- Rozpočet na provoz pilotu by měl být nízký (jednotky tisíc Kč měsíčně, viz BUSINESS_MODEL).

## 11. Slovník pojmů

| Pojem | Význam |
|---|---|
| **Tenant / firma** | Zákaznická firma v SaaS (např. MORAVIA ŘETĚZY). Data tenantů jsou striktně oddělená. |
| **Zákazník** | Firma, kterou obchodník navštěvuje (odběratel). Může mít více provozoven. |
| **Provozovna** | Konkrétní adresa zákazníka (sídlo, závod, sklad). Cíl navigace. |
| **Kontakt** | Osoba u zákazníka (nákupčí, údržbář, technik…). |
| **Návštěva** | Uskutečněné setkání obchodníka se zákazníkem a jeho zápis. Má typ (obchodní, poptávková, vztahová, následná, ostatní). |
| **Hlasový zápis** | Nahrávka diktátu po návštěvě + přepis + AI návrh strukturovaného zápisu. |
| **Příležitost** | Potenciální budoucí obchod bez konkrétní specifikace („možná budou modernizovat linku"). |
| **Poptávka** | Konkrétní požadavek zákazníka s položkami (produkt, množství…), na který se připravuje nabídka. |
| **Nabídka** | Cenová nabídka připravená kanceláří (obvykle ve firemním systému). |
| **Objednávka** | Závazná objednávka zákazníka (ve firemním systému). |
| **Úkol / follow-up** | Konkrétní další krok s termínem (zavolat, poslat dokumentaci, ozvat se v lednu). |
| **Cesta** | Plán jednoho pracovního dne v terénu: výchozí bod + seřazené zastávky. |
| **Zastávka** | Bod cesty – zákazník nebo jednorázová adresa – s časovým omezením a délkou návštěvy. |
| **FIXED / FLEXIBLE / OPEN** | Typ časového omezení zastávky: pevná schůzka / preferované okno / bez omezení. |
| **Harmonogram** | Vypočtené časy příjezdu, odjezdu, přejezdů a rezerv pro všechny zastávky. |
| **Rezerva** | O kolik minut se může aktuální návštěva protáhnout, aniž by ohrozila další pevnou schůzku. |
| **Briefing** | Stručný přehled zákazníka před návštěvou (fakta + AI shrnutí s odkazy na zdroje). |
| **Back-office** | Kancelář, v pilotu kolegyně připravující nabídky. |
| **Zdroj pravdy** | Systém, jehož data mají přednost při konfliktu (pro kmenová data zákazníků firemní aplikace). |
| **RLS** | Row Level Security – pravidla v databázi, která zajistí, že uživatel vidí jen řádky své firmy. |
| **STT** | Speech-to-text, převod řeči na text (přepis). |
| **LLM** | Velký jazykový model, který z přepisu vytvoří strukturovaný zápis. |
