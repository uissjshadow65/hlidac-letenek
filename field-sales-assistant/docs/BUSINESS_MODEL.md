# BUSINESS_MODEL – Komerční model

Verze: 1.0 (návrh) · Datum: 13. 11. 2026

> Všechny ceny, náklady a počty v tomto dokumentu jsou **hypotézy k ověření**, ne zjištěná fakta.
> Ceny jsou uvedeny bez DPH. Náklady na služby třetích stran ⚠️ OVĚŘIT v aktuálních ceníkových podmínkách.

---

## 1. Hodnotová nabídka

| Pro koho | Co získá | Jak to doložíme |
|---|---|---|
| **Obchodník** | Méně psaní (zápis za 1–3 min), připravenost na schůzku, plán dne, který se sám přepočítá | Čas zápisu, spokojenost |
| **Kancelář** | Úplné a strukturované podklady k poptávkám bez telefonování | Méně doptávání, rychlejší nabídky |
| **Vedení** | Kvalitnější data o zákaznících, rychlejší reakce na poptávky, víc času obchodníků u zákazníků – bez výměny stávajícího systému | KPI z pilotu |

**Jednou větou pro zákazníka:** „Vaši obchodníci nadiktují zápis za minutu, kancelář dostane hotový
podklad k nabídce a nic nemusíte měnit ve svém současném systému."

## 2. Cílový segment

**Ideální zákazník (hypotéza):**
- B2B firma v ČR/SR (výroba, distribuce, technický velkoobchod), technické nebo konfigurovatelné produkty.
- 3–50 terénních obchodníků, kteří osobně navštěvují zákazníky.
- Má stávající CRM/ERP, který nechce měnit, ale obchodníci ho v terénu používají nerady.
- Nabídky připravuje kancelář na základě informací od obchodníků.

**Velikost trhu:** zatím neznámá. Odhadneme ji z veřejných statistik (počet firem v relevantních oborech
podle velikosti), z profesních sítí (počet osob s pozicí obchodní zástupce v B2B) a z rozhovorů.
Nebudeme ji odhadovat bez dat.

## 3. Model licencování

| Prvek | Návrh | Proč |
|---|---|---|
| Jednotka | **Aktivní obchodník / měsíc** | Platí se za toho, kdo má přínos; srozumitelné |
| „Aktivní" | Uživatel s rolí obchodník, který se v daném měsíci přihlásil | Firma neplatí za neaktivní účty |
| Kancelář a vedení | Zahrnuto několik míst zdarma dle tarifu, další za nízkou cenu | Nebránit zapojení kanceláře – zvyšuje hodnotu |
| Fakturace | Měsíčně, nebo ročně předem se slevou (~2 měsíce zdarma) | Roční platba zlepšuje cash-flow |
| Minimální odběr | Např. 3 licence nebo minimální měsíční částka | Pokrytí nákladů na podporu malých firem |
| Spravedlivé použití AI | Limit minut diktátu na uživatele/měsíc (např. 300 min) | Ochrana proti nečekaným nákladům |
| Data | Každá firma má oddělená data, export kdykoli, smazání po ukončení | Důvěra, GDPR |

## 4. Tarify (hypotéza)

| Funkce | **Standard** 990 Kč | **Pro** 1 490 Kč | **Enterprise** individuálně |
|---|---|---|---|
| Hlasové zápisy s AI a kontrolou | ✓ | ✓ | ✓ |
| Zákazníci, kontakty, historie, briefing (fakta) | ✓ | ✓ | ✓ |
| Úkoly a follow-upy | ✓ | ✓ | ✓ |
| Plánovač cest, harmonogram, navigace | ✓ | ✓ | ✓ |
| Import/export CSV, kopírování do firemního systému | ✓ | ✓ | ✓ |
| Předání poptávky e-mailem | ✓ | ✓ | ✓ |
| AI shrnutí zákazníka („na co se zaměřit") | – | ✓ | ✓ |
| Přehled poptávek pro kancelář | – | ✓ | ✓ |
| Zákazníci v okolí, doporučení nenavštívených | – | ✓ | ✓ |
| Napojení kalendáře (Google / Microsoft) | – | ✓ | ✓ |
| Standardní konektor na firemní systém (pokud existuje) | – | ✓ | ✓ |
| Místa pro kancelář/vedení zdarma | 1 | 3 | dle dohody |
| Zakázkové integrace, konektor do interní sítě | – | – | ✓ |
| SSO, samostatná instance, smlouva a SLA na míru | – | – | ✓ |
| Podpora | E-mail | Prioritní | Dle SLA |

**Jednorázové služby (hypotéza):**

| Služba | Orientační cena |
|---|---|
| Onboarding (import dat, nastavení, zaškolení) | 5 000–15 000 Kč |
| Napojení přes existující API firemního systému | dle rozsahu, řádově desítky tisíc Kč |
| Zakázkový vývoj, konzultace | hodinová sazba (stanovit) |

## 5. Ekonomika na jednoho uživatele

### 5.1 Variabilní náklady (orientačně, ⚠️ OVĚŘIT)

Předpoklady: 5 návštěv denně × 21 dní = ~105 zápisů měsíčně, průměrně 2 min diktátu (~210 min).

| Položka | Odhad / uživatel / měsíc | Poznámka |
|---|---|---|
| Přepis řeči | ~1–2 USD | Ceny přepisu řádově tisíciny USD za minutu |
| Strukturování zápisů (LLM) | ~1–3 USD | Řádově jednotky tisíc tokenů na zápis |
| AI shrnutí zákazníků | ~1–3 USD | Generuje se jen při změně |
| Mapová API (trasy, mapa) | ~0–8 USD | Při malém objemu v rámci bezplatných limitů; s růstem roste |
| Úložiště, databáze, e-mail | < 1 USD | |
| **Celkem** | **~3–15 USD ≈ 70–350 Kč** | Přepočet ~23 Kč/USD (orientačně) |

**Hrubá marže** při 990 Kč: ~65–93 %. Hlavní nákladovou položkou však bude **čas na podporu a integrace**,
ne infrastruktura.

### 5.2 Fixní náklady (orientačně)

| Položka | Měsíčně |
|---|---|
| Hosting a databáze (produkce + staging) | ~1 500–3 000 Kč |
| Monitoring, e-mail, doména, nástroje | ~0–1 000 Kč |
| Účetní, pojištění odpovědnosti (po komercializaci) | ~1 000–3 000 Kč |

### 5.3 Kolik uživatelů je potřeba

| Cíl | Potřebný počet platících obchodníků (při průměru ~1 150 Kč a ~80 % marži) |
|---|---|
| Pokrýt provozní náklady | ~5–8 |
| Hodnota 50 000 Kč měsíčně (např. částečný příjem autora) | ~55–65 |
| Hodnota 150 000 Kč měsíčně (malý tým) | ~165–190 |

## 6. Scénáře (ilustrace, ne předpověď)

| Scénář | Firmy | Obchodníci | MRR | ARR |
|---|---|---|---|---|
| Pilotní firma po rozšíření (12 obchodníků, Standard) | 1 | 12 | ~11 900 Kč | ~143 000 Kč |
| Malý start | 5 | 40 | ~46 000 Kč | ~550 000 Kč |
| Růst | 20 | 200 | ~230 000 Kč | ~2,8 mil. Kč |

Při obratu nad hranicí pro povinnou registraci k DPH (⚠️ OVĚŘIT aktuální limit s účetní) je nutné
se registrovat – u B2B zákazníků to obvykle nevadí.

## 7. Cena podle hodnoty (argument pro zákazníka)

Ilustrační výpočet (všechny vstupy jsou hypotézy, ověří pilot):
- Úspora ~50 min denně × 21 dní ≈ **17 hodin měsíčně** na obchodníka.
- Pokud plné náklady hodiny obchodníka (mzda, odvody, auto, režie) činí např. 500 Kč,
  uvolněný čas má hodnotu ~8 500 Kč měsíčně.
- Cena 990 Kč je tak cca **desetina hodnoty** uvolněného času – a to bez započtení rychlejších nabídek
  a lepších dat.

Po pilotu nahradíme ilustrační čísla změřenými.

## 8. Pilotní model pro prvního zákazníka

| Fáze | Podmínky (návrh) |
|---|---|
| Pilot (cca 3 měsíce, 1 obchodník) | Zdarma; firma poskytne součinnost, data a zpětnou vazbu |
| Rozšíření po úspěšném pilotu | „Zakládající zákazník": např. 50 % sleva na 12 měsíců nebo garantovaná cena na 24 měsíců |
| Na oplátku | Reference, případová studie s čísly, účast na vývoji dalších funkcí |

Doporučení: i po zvýhodněném období mít **nenulovou cenu** – placení potvrzuje hodnotu a nastavuje
očekávání pro další zákazníky. Podmínky pilotu sepsat písemně (RISKS L-06).

## 9. Co je potřeba před prodejem dalším firmám

1. **Právní subjekt** (OSVČ nebo s.r.o.) a účetní.
2. **Smluvní dokumenty:** obchodní podmínky (SaaS), zpracovatelská smlouva (DPA) se seznamem
   podzpracovatelů, zásady ochrany osobních údajů, SLA (pro Pro/Enterprise).
3. **Bezpečnost:** revize, jednoduchý penetrační test, popis bezpečnostních opatření (firmy se budou ptát).
4. **Provoz:** fakturace předplatného, onboarding nové firmy bez zásahu do kódu, podpora.
5. **Prodej:** případová studie, demo s fiktivními daty, prezentační web.

## 10. Go-to-market (po pilotu)

1. **Případová studie** z pilotu s konkrétními čísly.
2. **Doporučení a síť kontaktů** v oboru (s ohledem na mlčenlivost vůči pilotní firmě).
3. **Přímé oslovení** obchodních ředitelů B2B firem (profesní sítě), ukázka 20 minut.
4. **Veletrhy a oborová sdružení** (strojírenství, průmysl).
5. **Partneři:** implementátoři ERP/CRM systémů – mají zákazníky i znalost integrací.
6. **Zkušební verze** 30 dní s importem CSV.

## 11. Konkurence a odlišení

| Typ konkurence | Příklady (⚠️ OVĚŘIT aktuální funkce) | Naše odlišení |
|---|---|---|
| CRM systémy s mobilní aplikací | Raynet CRM, eWay-CRM, Pipedrive, HubSpot, Salesforce, Microsoft Dynamics 365 | Nenahrazujeme CRM, ale doplňujeme ho; hlas-first v češtině; minimum zadávání |
| Plánovače tras pro terénní obchod | Badger Maps a podobné | Harmonogram s pevnými schůzkami a průběžným přepočtem + zápisy a předání kanceláři v jednom |
| AI nástroje na zápisy ze schůzek | Nástroje pro online schůzky | Navrženo pro terén a diktát po schůzce, ne pro nahrávání jednání; strukturovaný obchodní výstup |
| Moduly ERP | Mobilní moduly dodavatelů ERP | Jednoduchost, rychlost nasazení, nezávislost na dodavateli ERP |

Riziko: velcí hráči přidávají AI funkce rychle (RISKS B-04). Obranou je zaměření na konkrétní segment,
češtinu, integraci nad stávajícími systémy a osobní přístup.

## 12. Plán ověření obchodního modelu

| Co ověřujeme | Jak | Kdy |
|---|---|---|
| Ochota pilotní firmy platit | Rozhovor s vedením (D-VE-11) + výsledky pilotu | E8 |
| Problém existuje i jinde | 5–10 rozhovorů s obchodními řediteli jiných firem | Během pilotu |
| Cenová úroveň | Ukázka tarifů v rozhovorech; reakce na 990 vs. 1 490 Kč | Během pilotu |
| Náklady na uživatele | Skutečné náklady z pilotu (AI, mapy) | E5–E8 |
| Náročnost integrací | Zjistit, jaké systémy používají oslovené firmy | Během rozhovorů |

## 13. Otevřené otázky

- Bude produkt nabízen pod vlastní značkou autora, nebo ve spolupráci s pilotní firmou?
- Jaká forma podnikání a kdy ji založit?
- Bude autor poskytovat implementace a podporu sám, nebo s partnerem?
- Jak řešit cenu pro velmi malé firmy (1–2 obchodníci)?
