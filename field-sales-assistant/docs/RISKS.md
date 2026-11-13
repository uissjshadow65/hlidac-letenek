# RISKS – Rizika projektu

Verze: 1.0 · Datum: 13. 11. 2026

**Hodnocení:** P = pravděpodobnost, D = dopad (N = nízká, S = střední, V = vysoká).
**Kategorie:** T = technická · S = bezpečnostní · L = právní · B = obchodní/produktová · O = projektová.

> Tento dokument není právní rada. Právní body (L) doporučuji před ostrým provozem a před prodejem
> dalším firmám ověřit s advokátem / specialistou na GDPR.

---

## 1. Pět největších rizik

| # | Riziko | Proč je největší | Hlavní opatření |
|---|---|---|---|
| 1 | **L-01** Zpracování skutečných dat bez schválení a smluv | Může zastavit projekt a poškodit vztah otce s firmou | Fiktivní data do písemného souhlasu; DPA; seznam zpracovatelů |
| 2 | **T-01 / T-02** Nepřesný přepis nebo domýšlení AI | Ohrožuje hlavní hodnotu produktu i důvěru | Experiment E1 před vývojem; citace; povinná kontrola |
| 3 | **B-01** Obchodník aplikaci nezačne používat denně | Bez používání nejsou data ani výsledky | Spolunávrh s ním, rychlé přínosy, jednoduchost, měření |
| 4 | **B-02 / T-05** Bez integrace vznikne dvojí evidence | Úspora času se může „rozpustit" | Kopírování do firemní aplikace; měřit celkový čas; integrace v P3 |
| 5 | **O-03 / L-06** Nejasné role a vlastnictví (rodina, zaměstnavatel, autor) | Spory o software, data, odpovědnost | Písemná dohoda o pilotu; transparentnost vůči vedení |

---

## 2. Technická rizika

| ID | Riziko | P | D | Opatření |
|---|---|---|---|---|
| T-01 | Nízká přesnost přepisu češtiny u technických označení (12B-1, rozteč, moduly) | S | V | Experiment E1 s 2–3 službami; slovník pojmů; zvýraznění označení ke kontrole; ruční oprava; záložní psaní |
| T-02 | AI domýšlí údaje (halucinace) | S | V | Citace u každého údaje; kontrola citací kódem; zákaz polí pro ceny/termíny; povinná kontrola; evaluační sada |
| T-03 | Ztráta nahrávky (bez signálu, zavření aplikace, smazání úložiště iOS) | S | V | Uložení do IndexedDB před odesláním; trvalé úložiště; odesílání co nejdřív; smazání až po potvrzení serverem; test v režimu letadlo |
| T-04 | Omezení PWA na iOS (žádná synchronizace na pozadí, nahrávání při zamčení, push jen po instalaci) | S | S | Ověřit na konkrétním telefonu v E0; viditelná fronta; v krajním případě nativní aplikace (Expo) |
| T-05 | Integrace s firemní aplikací není možná nebo je drahá | S | S | Návrh funguje na úrovni L0; import exportu; kopírování zápisu |
| T-06 | Nepřesné odhady příjezdů | S | S | Predikce dopravy; rezerva na parkování/vrátnici; měření plán vs. skutečnost; kalibrace výchozích délek |
| T-07 | Nečekaně vysoké náklady na AI a mapová API | N | S | Cache; omezení frekvence přepočtů; rozpočtové limity a upozornění; sledování nákladů po firmách |
| T-08 | Závislost na dodavatelích (Supabase, Vercel, OpenAI, Google) | S | S | Vlastní AI rozhraní; standardní PostgreSQL; přenositelný Docker build |
| T-09 | Chybné přiřazení zákazníka nebo kontaktu | S | S | Přednost kontextu (zastávka/karta); potvrzení při nejistotě; nikdy nezakládat kontakt bez potvrzení |
| T-10 | Špatná kvalita importovaných dat (adresy, duplicity) | V | S | Náhled importu; ověření pinu; upozornění na duplicity; postupné čištění |
| T-11 | Poskytovatel AI změní nebo vyřadí model | S | N | Model v konfiguraci; evaluační sada před každou změnou |
| T-12 | Výkon a limity serverless funkcí (délka běhu, velikost požadavku) | N | S | Upload přímo do Storage; krátké kroky zpracování; přechod na frontu (ADR-06) |

## 3. Bezpečnostní rizika

| ID | Riziko | P | D | Opatření |
|---|---|---|---|---|
| S-01 | Únik dat mezi firmami (chyba v oprávněních) | N | V | RLS na všech tabulkách; složené cizí klíče; testy izolace v CI; revize kódu se servisní rolí |
| S-02 | Ztráta nebo krádež telefonu | S | S | Vzdálené odhlášení; minimum dat v telefonu; vymazání při odhlášení; zámek telefonu / MDM |
| S-03 | Kompromitace přístupových údajů k integracím | N | V | Vault; servisní účet s minimálními právy; rotace; okamžité zneplatnění |
| S-04 | Únik osobních údajů přes logy a monitoring | S | S | Žádné přepisy a obsah v logu; odstraňování osobních údajů v Sentry |
| S-05 | Převzetí účtu (slabé heslo, phishing) | S | S | MFA pro adminy (a volitelně všechny); omezení pokusů o přihlášení; kontrola uniklých hesel |
| S-06 | Manipulace AI obsahem diktátu (prompt injection) | N | N | AI nemá žádné nástroje ani akce, vytváří jen návrh; vše prochází kontrolou uživatele |
| S-07 | Zranitelnost v závislostech (npm balíčky) | S | S | Lockfile; automatické aktualizace; audit; minimum závislostí |

## 4. Právní rizika

| ID | Riziko | P | D | Opatření |
|---|---|---|---|---|
| L-01 | Zpracování skutečných dat a předání externí AI bez schválení firmy a bez smluv (GDPR) | S | V | Fiktivní data do písemného souhlasu; zpracovatelská smlouva (DPA) s firmou – my jako zpracovatel; seznam podzpracovatelů (Supabase, Vercel, AI, e-mail, Sentry, mapy); data v EU kde lze; u US poskytovatelů standardní smluvní doložky / EU-US Data Privacy Framework (⚠️ OVĚŘIT); záznamy o činnostech zpracování |
| L-02 | Osobní údaje kontaktních osob zákazníků | S | S | Firma je správce (typicky oprávněný zájem, informační povinnost); minimalizace (jen pracovní údaje); retence; mazání na žádost |
| L-03 | Hlasové nahrávky obchodníka | S | S | Retence 30 dní; nepoužívat k tréninku; informovat zaměstnance; nahrávky nepoužívat k identifikaci osoby (pak nejde o biometrické zpracování) |
| L-04 | Aplikace jako nástroj sledování zaměstnanců (poloha, plány cest, telemetrie) – zákoník práce chrání soukromí zaměstnance (§ 316, ⚠️ OVĚŘIT s právníkem) | S | V | Žádné průběžné sledování polohy; poloha jen na vyžádání a neukládá se; plány cest vidí výchozí jen obchodník; telemetrie jen pro vyhodnocení pilotu a se seznámením zaměstnance; žádné reporty výkonu v MVP |
| L-05 | Nahrávání jednání se zákazníky bez souhlasu | N | V | Aplikace je navržena jen pro diktát **po** schůzce; nápověda v UI; žádná funkce nahrávání schůzky |
| L-06 | Nejasné vlastnictví softwaru a odpovědnost za škody | S | V | Písemná dohoda o pilotu: software patří autorovi, data firmě, licence k užívání v pilotu, mlčenlivost, omezení odpovědnosti; později pojištění odpovědnosti |
| L-07 | Porušení licenčních podmínek třetích stran (ukládání dat z Google geokódování, licence n8n, podmínky firemní aplikace) | S | S | Ověřit podmínky před použitím; geokódování s potvrzeným pinem; n8n mimo jádro; integrace jen se souhlasem |
| L-08 | Používání telefonu za jízdy | S | S | UX bez interakcí za jízdy; upozornění v návodu; navigaci přebírá Google Maps |
| L-09 | Prodej bez vhodného právního subjektu, daňové a DPH povinnosti | S | S | Před prvním placeným pilotem zvolit formu (OSVČ / s.r.o.), poradit se s účetní |

## 5. Obchodní a produktová rizika

| ID | Riziko | P | D | Opatření |
|---|---|---|---|---|
| B-01 | Obchodník aplikaci nepřijme (návyky, důvěra k AI, složitost) | S | V | Spolunávrh, test prototypu, 1 klepnutí k hlavním akcím, rychlé reakce na zpětnou vazbu |
| B-02 | Úspora času menší než očekávaná (dvojí evidence, kontrola zabere dlouho) | S | V | Měřit celkový čas; zrychlovat kontrolu; kopírování; integrace |
| B-03 | Vedení neschválí rozšíření ani placení | S | V | Dohodnout kritéria úspěchu předem (D-VE-02); prezentovat data; nabídnout zvýhodněné podmínky pro prvního zákazníka |
| B-04 | Konkurence: CRM systémy přidávají AI zápisy, specializované nástroje pro terénní obchod | V | S | Zaměření na češtinu, hlas, nadstavbu nad stávajícími systémy, průmyslový B2B segment, osobní přístup; rychlost; ověřit funkce konkurence |
| B-05 | Produkt „ušitý" jen na jednu firmu | S | S | Odlišnosti řešit nastavením firmy, ne zakázkovým kódem; číselníky konfigurovatelné |
| B-06 | Cenová hypotéza neodpovídá ochotě platit | S | S | Rozhovory s 5–10 dalšími firmami před komercializací; testovat tarify |
| B-07 | Každá firma má jiný systém → drahé integrace | V | S | Placená implementace; CSV jako základ; konektory pro nejčastější systémy až podle poptávky |
| B-08 | Podpora a provoz jedním člověkem neudržitelné | S | S | Automatizace, monitoring, realistické SLA, cena zahrnující podporu |

## 6. Projektová rizika

| ID | Riziko | P | D | Opatření |
|---|---|---|---|---|
| O-01 | Jeden vývojář: kapacita, nemoc, ztráta know-how | V | S | Dokumentace a ADR; jednoduchá architektura; spravované služby; disciplína v rozsahu |
| O-02 | Rozšiřování rozsahu (scope creep) | V | S | Pevný seznam P1; rozhodovací body G0–G3; vše ostatní do „Později" |
| O-03 | Rodinný vztah: zpětná vazba může být zkreslená; otec je zaměstnanec firmy a zároveň tester projektu syna | S | S | Rozhodovat podle měřených dat; zapojit kolegyni a později dalšího obchodníka; vše transparentně se souhlasem vedení; otec nesmí předávat firemní data mimo schválený rámec |
| O-04 | Pomalé odpovědi IT/dodavatele, čekání na schválení | V | S | Začít discovery hned; vývoj nezávislý na integraci (L0) |
| O-05 | Podcenění času na pilot (podpora, opravy, vyhodnocení) | S | N | Rezervovat kapacitu; plán pilotu s rytmem zpětné vazby |

---

## 7. Sledování rizik

Rizika projdeme na každém rozhodovacím bodu (G0–G3) a po discovery. U každého rizika s vysokým dopadem
určíme „spouštěč" (např. T-03: první ztracená nahrávka → okamžitá analýza a oprava před dalším používáním).
