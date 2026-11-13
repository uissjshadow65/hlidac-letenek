# DISCOVERY_CHECKLIST – Co potřebujeme zjistit

Verze: 1.0 · Datum: 13. 11. 2026

Seznam otázek pro obchodníka, kolegyni, vedení, IT a k datům. ID (např. `D-IT-01`) se používají
v ostatních dokumentech. Sloupec **Odpověď** vyplníme během rozhovorů.

**Priorita:** **K** = kritické (bez odpovědi nelze rozhodnout o MVP) · **D** = důležité · **V** = vhodné

---

## 1. Deset nejkritičtějších neznámých

| # | Neznámá | ID | Na co má vliv |
|---|---|---|---|
| 1 | Název, dodavatel a integrační možnosti firemní aplikace (API, export) | D-IT-01, 02, 04, 05 | Zdroj zákazníků, úroveň integrace, dvojí evidence |
| 2 | Souhlas vedení s pilotem, se skutečnými daty a s externí AI | D-VE-05, 06 | Zda a kdy smíme pracovat s reálnými daty |
| 3 | Smluvní rámec pilotu (vlastnictví softwaru, dat, odpovědnost, cena) | D-VE-08 | Právní jistota projektu a budoucí prodej |
| 4 | Telefon obchodníka (iOS/Android), správa telefonů (MDM) | D-IT-11 | Technická proveditelnost PWA, nahrávání, offline |
| 5 | Jaký kalendář firma používá | D-IT-06 | Modul G, pevné schůzky v plánovači |
| 6 | Kvalita přepisu češtiny s technickými termíny | D-OB-05, 06 + experiment | Celý modul A (hlavní hodnota produktu) |
| 7 | Minimální podklad k nabídce, který kolegyně potřebuje | D-BO-02 | Struktura poptávky, modul H |
| 8 | Struktura dnešního zápisu ve firemní aplikaci | D-OB-07 | Šablona výstupu („Kopírovat pro firemní aplikaci") |
| 9 | Objem práce: návštěvy za den, počet zákazníků, signál | D-OB-01, 02, 16 | KPI, náklady, priorita offline |
| 10 | Sdílení zákazníků mezi obchodníky, teritoria, oprávnění | D-VE-09 | Role a RLS politiky |

---

## 2. Obchodní zástupce (D-OB)

Forma: rozhovor 60–90 min + jeden den pozorování v terénu (shadowing), viz kap. 8.

| ID | Otázka | Proč | Prio | Odpověď |
|---|---|---|---|---|
| D-OB-01 | Kolik návštěv máš průměrně za den a týden? Kolik dní v týdnu jsi v terénu? | KPI, náklady, odhad úspory | K | |
| D-OB-02 | Kolik zákazníků máš v portfoliu (aktivních / celkem)? Kolik nových ročně? | Import, vyhledávání, náklady | K | |
| D-OB-03 | Mají zákazníci více provozoven? Kde schůzky probíhají? | Model provozoven, navigace | D | |
| D-OB-04 | Jak dlouho trvá typická návštěva (podle typu)? Jak často se protáhne? | Výchozí délky v plánovači | D | |
| D-OB-05 | Vyhovovalo by ti zápis nadiktovat? Kde (auto, venku)? Máš obavy (hluk, nářečí, soukromí)? | Ověření hlavního předpokladu | K | |
| D-OB-06 | Jaké technické termíny, zkratky a kódy používáš? (sepsat 30–50 nejčastějších) | Slovník pro přepis, test přesnosti | K | |
| D-OB-07 | Jak dnes vypadá zápis? Která pole ve firemní aplikaci vyplňuješ, co je povinné? (ukázka bez osobních údajů) | Šablona výstupu, mapování polí | K | |
| D-OB-08 | Jak často návštěva vede k poptávce? Jak často zákazník pošle poptávku později sám? | Modul H, atribuce | D | |
| D-OB-09 | Co před schůzkou nejčastěji hledáš? Co bys chtěl vidět v přehledu zákazníka? | Obsah briefingu | K | |
| D-OB-10 | Jak dnes plánuješ cestu (kdy, v čem, podle čeho vybíráš zákazníky)? | Modul D | D | |
| D-OB-11 | Odkud vyjíždíš a kam se vracíš (domov, firma)? | Výchozí místo | D | |
| D-OB-12 | Jezdíš na vícedenní cesty s přespáním? Jak často? | Rozsah plánovače | D | |
| D-OB-13 | Kolik schůzek je pevně domluvených a kolik „zastavím se"? Voláš předem? | Typy časových omezení | D | |
| D-OB-14 | Co děláš dnes, když se zpozdíš? | Modul D/F (rychlé volání) | V | |
| D-OB-15 | Jaký máš telefon (model, systém)? Držák a nabíjení v autě? Hands-free, Android Auto/CarPlay? | Technika, UX | K | |
| D-OB-16 | Kde bývá slabý nebo žádný signál? | Priorita offline | D | |
| D-OB-17 | Sedí 5 typů návštěv? Stává se, že jedna návštěva je víc typů najednou? | Model typů | D | |
| D-OB-18 | Jak předáváš informace kolegyni? Kolikrát týdně? Co se ztrácí nebo se musí doptávat? | Modul H | K | |
| D-OB-19 | Co by tě přimělo aplikaci přestat používat? Bez čeho nemá smysl? | Priorita, rizika adopce | K | |
| D-OB-20 | Jak se díváš na AI, nahrávání vlastního hlasu a polohu? | Důvěra, soukromí | D | |
| D-OB-21 | Změříš si týden časy zápisů a přípravy (tabulka v kap. 9)? | Baseline KPI | K | |

---

## 3. Kolegyně v kanceláři (D-BO)

Forma: rozhovor 45–60 min + ukázka přípravy jedné nabídky (s fiktivními daty).

| ID | Otázka | Proč | Prio | Odpověď |
|---|---|---|---|---|
| D-BO-01 | V jakém systému připravujete nabídky? Šablona, ceník, katalog? | Budoucí modul nabídek, integrace | D | |
| D-BO-02 | Jaké minimum informací potřebujete k nabídce podle typu produktu? (např. označení, rozteč, délka/počet článků, materiál, počet zubů, modul, výkres, množství, termín, místo dodání) | Struktura poptávky, kontrola úplnosti | K | |
| D-BO-03 | Jak často se musíte obchodníka doptávat a na co? | Měření přínosu, kontrolní seznam | K | |
| D-BO-04 | Jak přicházejí poptávky přímo od zákazníků (e-mail, telefon, web)? Jak se evidují? | Modul H, P3 | D | |
| D-BO-05 | Jak dlouho trvá příprava nabídky? Co ji nejvíc zdržuje? | Business case | D | |
| D-BO-06 | Vyhovuje vám podklad e-mailem, nebo přehled v aplikaci? Na jakém počítači/prohlížeči pracujete? | Forma předání (P1/P2) | K | |
| D-BO-07 | Zapisujete něco do firemní aplikace za obchodníka? | Duplicitní práce, integrace | D | |
| D-BO-08 | Jak se dozvíte, zda zákazník nabídku přijal? Chtěla byste to vidět u nás? | Stavy nabídek | V | |

---

## 4. Vedení firmy (D-VE)

Forma: schůzka 45–60 min. Výstup: písemný souhlas s pilotem a podmínkami (kap. 7).

| ID | Otázka | Proč | Prio | Odpověď |
|---|---|---|---|---|
| D-VE-01 | Kdo je sponzor projektu a kdo rozhoduje o nasazení a nákupu? | Řízení projektu | K | |
| D-VE-02 | Co by pro vás byl úspěšný pilot? Jaká čísla chcete vidět? | Kritéria úspěchu, KPI | K | |
| D-VE-03 | V jakém časovém rámci chcete výsledky? | Plán | D | |
| D-VE-04 | Kolik máte obchodníků? Jaké regiony? Plány růstu? | Rozšíření, licence | D | |
| D-VE-05 | Souhlasíte s pilotem a od kdy lze pracovat se skutečnými daty zákazníků? | Přechod z fiktivních dat | K | |
| D-VE-06 | Souhlasíte s předáním dat externím AI službám? Požadujete zpracování jen v EU? | Volba poskytovatele AI | K | |
| D-VE-07 | Máte interní pravidla bezpečnosti a GDPR, pověřence pro ochranu osobních údajů? Kdo podepisuje zpracovatelské smlouvy? | DPA, compliance | K | |
| D-VE-08 | Smluvní rámec pilotu: software zůstává autorovi, data firmě; mlčenlivost; odpovědnost; podmínky po pilotu | Právní jistota, komercializace | K | |
| D-VE-09 | Vidí obchodníci zákazníky a návštěvy kolegů? Existují teritoria? Kdo „vlastní" zákazníka? | Oprávnění, RLS | K | |
| D-VE-10 | Jaké přehledy by vedení chtělo? (s ohledem na soukromí zaměstnanců – žádné sledování polohy) | Rozsah reportů, rizika | D | |
| D-VE-11 | Je představitelné za aplikaci po pilotu platit? Jaký rozpočet? | Ověření obchodního modelu | D | |
| D-VE-12 | Smíme firmu uvádět jako referenci a zpracovat případovou studii? | Prodej dalším firmám | V | |

---

## 5. IT a firemní systémy (D-IT)

Forma: rozhovor se správcem / e-mail dodavateli (šablona v INTEGRATION_ANALYSIS, kap. 2.11).

| ID | Otázka | Proč | Prio | Odpověď |
|---|---|---|---|---|
| D-IT-01 | Jak se firemní webová aplikace jmenuje? Verze, adresa? | Identifikace | K | |
| D-IT-02 | Kdo je dodavatel? Krabicový produkt, nebo zakázkový vývoj? Kdo ji spravuje? | Kontakt pro integraci | K | |
| D-IT-03 | Kde jsou vedeni zákazníci a kontakty (zdroj pravdy)? Jsou i v jiném systému (ERP, účetnictví, Outlook)? | Datový tok | K | |
| D-IT-04 | Lze exportovat zákazníky/kontakty (formát, automaticky)? Lze importovat aktivity? | Integrace L1 | K | |
| D-IT-05 | Má aplikace API? Dokumentace, autentizace, servisní účet, testovací prostředí, cena? | Integrace L2/L3 | K | |
| D-IT-06 | Jaký kalendář firma používá (Google Workspace, Microsoft 365, Exchange, v aplikaci, jen v telefonu)? | Modul G | K | |
| D-IT-07 | Jaký e-mailový systém firma používá? | Předání poptávek, SSO | D | |
| D-IT-08 | Proč jsou zápisy ve firemní aplikaci vidět až po ~30 minutách? | Pochopení procesu, integrace | D | |
| D-IT-09 | Kde aplikace běží (cloud / server ve firmě)? Je dostupná z internetu, nebo přes VPN? | Architektura integrace | K | |
| D-IT-10 | Používají zaměstnanci firemní účty Google nebo Microsoft (možnost SSO)? | Přihlášení | V | |
| D-IT-11 | Firemní telefony: systém, správa (MDM), povolené aplikace, lze přidat webovou aplikaci na plochu, omezení mikrofonu/polohy? | Proveditelnost PWA | K | |
| D-IT-12 | Má firma bezpečnostní požadavky na dodavatele (dotazník, audit)? Kdo je kontaktní osoba IT? | Compliance | D | |

---

## 6. Data (D-DA)

| ID | Otázka | Proč | Prio | Odpověď |
|---|---|---|---|---|
| D-DA-01 | Kolik je zákazníků, kontaktů a historických zápisů? | Import, výkon | D | |
| D-DA-02 | Jaké identifikátory zákazníků existují (číslo zákazníka, IČO)? Jsou unikátní? | Párování, synchronizace | K | |
| D-DA-03 | Jak kvalitní jsou adresy (provozovny, souřadnice)? Duplicity? | Geokódování, navigace | D | |
| D-DA-04 | Jsou zákazníci segmentovaní (A/B/C, obrat)? Je stanovená frekvence návštěv? | Upozornění na nenavštívené | D | |
| D-DA-05 | Existuje produktový katalog v elektronické podobě? V jakém formátu? | Slovník přepisu, později nabídky | D | |
| D-DA-06 | Můžeme dostat vzorový anonymizovaný export (10–20 záznamů) a seznam polí? | Návrh importu | K | |
| D-DA-07 | Jak daleko do minulosti chceme importovat historii návštěv? | Rozsah importu | V | |

---

## 7. Právo a ochrana osobních údajů (D-PR)

| ID | Otázka | Proč | Prio | Odpověď |
|---|---|---|---|---|
| D-PR-01 | Na jakém právním základě firma zpracovává údaje kontaktních osob (typicky oprávněný zájem)? Informuje je? | GDPR | K | |
| D-PR-02 | Souhlasí firma s navrženou retencí (audio 30 dní, přepisy 12 měsíců)? | Retence | D | |
| D-PR-03 | Jak budou obchodníci informováni o zpracování jejich hlasu a pracovních údajů? | Zákoník práce, GDPR | K | |
| D-PR-04 | Pod jakým subjektem budeme pilot poskytovat (fyzická osoba, OSVČ, s.r.o.)? Kdo podepíše DPA? | Smluvní strana | K | |
| D-PR-05 | Požaduje firma uložení dat výhradně v EU / u evropského poskytovatele? | Hosting, AI | D | |

---

## 8. Aktivity discovery

| Aktivita | Kdo | Délka | Výstup |
|---|---|---|---|
| Rozhovor s obchodníkem | Autor + obchodník | 60–90 min | Odpovědi D-OB |
| **Shadowing** – jeden den v terénu | Autor jede s obchodníkem | 1 den | Pozorované časy, situace, prostředí (signál, hluk, parkování) |
| Rozhovor s kolegyní | Autor + kolegyně | 45–60 min | Odpovědi D-BO, kontrolní seznam podkladu k nabídce |
| Schůzka s vedením | Autor (+ obchodník) | 45–60 min | Souhlas s pilotem, D-VE, D-PR |
| Kontakt s IT/dodavatelem | Autor | E-mail + 30 min hovor | Odpovědi D-IT |
| Měření baseline | Obchodník | 1 týden | Tabulka v kap. 9 |
| **Sběr testovacích diktátů** | Obchodník | 1–2 h | 20–30 namluvených **fiktivních** zápisů s realistickou terminologií (pro experiment v etapě 1) |
| Test klikacího prototypu | Obchodník, kolegyně | 45 min | Úpravy UX (UX_DESIGN, kap. 8) |

Pravidla: k rozhovorům si nebrat skutečná data zákazníků; vzorky dat jen anonymizované; testovací
diktáty s vymyšlenými firmami a osobami.

---

## 9. Šablona pro měření výchozího stavu (baseline)

Obchodník vyplňuje po dobu jednoho běžného týdne (stačí papír nebo jednoduchá tabulka):

| Datum | Zákazník (zkratka) | Typ návštěvy | Čas zápisu (min) | Kdy zapsáno (hned / večer) | Příprava na další schůzku (min) | Volal kolegyni? (A/N, min) | Vznikla poptávka? (A/N) | Poznámka |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

Doplňkově za týden: čas strávený plánováním cest (min), počet ručně zadaných adres do navigace,
počet zpoždění na domluvenou schůzku.

---

## 10. Výstupy discovery (Definition of Done etapy 0)

- [ ] Zodpovězeny všechny otázky s prioritou **K**.
- [ ] Rozhodnuta úroveň integrace pro MVP (L0/L1/L2/L3).
- [ ] Písemný souhlas vedení s pilotem a smluvní rámec (D-VE-05, 06, 08).
- [ ] Známý telefon a kalendář.
- [ ] Kontrolní seznam podkladu k nabídce od kolegyně.
- [ ] Baseline změřená (min. 1 týden).
- [ ] 20–30 fiktivních testovacích diktátů.
- [ ] Aktualizované dokumenty (zejména INTEGRATION_ANALYSIS, MVP_ROADMAP, RISKS).
