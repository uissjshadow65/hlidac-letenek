# MVP_ROADMAP – Plán vývoje po etapách

Verze: 1.0 (návrh) · Datum: 13. 11. 2026

---

## 1. Přehled

| Etapa | Cíl | Odhad* | Výstup / milník |
|---|---|---|---|
| **E0** Discovery a schválení | Zodpovědět kritické otázky, získat souhlasy | 2–3 týdny | Vyplněný DISCOVERY_CHECKLIST, souhlas vedení |
| **E1** Experiment „hlas → zápis" | Ověřit nejrizikovější předpoklad (přepis + AI) | 1–2 týdny (souběžně s E0) | Zpráva o přesnosti, nákladech, latenci |
| 🚦 **G0** | Rozhodnutí: pokračovat s hlasovým přístupem a pilotem? | | |
| **E2** Základ aplikace | Kostra, přihlášení, firmy, RLS, CI/CD | 2–3 týdny | Nasazená prázdná aplikace s testy izolace |
| **E3** Zákazníci | Karty, kontakty, import, historie, navigace | 2 týdny | Použitelný přehled zákazníků |
| **E4** Hlasový zápis + AI | Nahrávání, zpracování, kontrola, úkoly, předání poptávky | 3–4 týdny | **M1 – start pilotu P1** |
| **E5** Pilot P1 | Ostré používání, měření, úpravy | 3–4 týdny (souběžně s E6) | 🚦 **G1** |
| **E6** Plánovač cest (P2) | Cesty, harmonogram, mapa, průběh dne, přehled poptávek | 3–4 týdny | **M2 – pilot P2** |
| **E7** Rozšíření (P3) | V okolí, kalendář, připomínky, integrace | 4–6 týdnů | Kompletní pilotní rozsah |
| **E8** Vyhodnocení a prezentace | Výsledky vs. baseline, prezentace vedení | 1–2 týdny | 🚦 **G3** – rozhodnutí o rozšíření |
| **E9** Příprava komercializace | Smlouvy, fakturace, druhá firma | průběžně po pilotu | První platící zákazník |

\* **Předpoklady odhadu:** jeden vývojář, ~15–20 hodin týdně, s využitím AI nástrojů pro programování.
Odhady jsou rozpětí, ne závazky. Mimo naši kontrolu jsou: rychlost odpovědí IT/dodavatele, schválení
vedením, dostupnost obchodníka. **Orientačně: start pilotu P1 za ~3–4 měsíce, P2 za ~4–6 měsíců.**

---

## 2. Etapy podrobně

### E0 – Discovery a schválení (2–3 týdny)

- Rozhovory: obchodník, kolegyně, vedení, IT/dodavatel (DISCOVERY_CHECKLIST, kap. 8).
- Jeden den shadowingu v terénu.
- Týden měření baseline.
- Sběr 20–30 fiktivních testovacích diktátů.
- Smluvní rámec pilotu a souhlas se zpracováním dat (D-VE-05/06/08, D-PR-*).
- Test klikacího prototypu (UX_DESIGN, kap. 8) – lze až ke konci E0.

**Hotovo, když:** splněn kontrolní seznam DISCOVERY_CHECKLIST, kap. 10.

### E1 – Experiment „hlas → zápis" (1–2 týdny)

Bez aplikace – jen jednoduchý skript, který:
1. pošle 20–30 **fiktivních** nahrávek do 2–3 služeb přepisu (se slovníkem pojmů i bez něj),
2. přepisy pošle do 1–2 jazykových modelů se schématem zápisu,
3. porovná výstupy s ručně připraveným očekávaným výsledkem.

| Měříme | Orientační cíl (hypotéza) |
|---|---|
| Správně přepsaná technická označení (12B-1, rozteč, počty zubů…) | ≥ 90 % |
| Úplnost extrakce (úkoly, termíny, příležitosti, poptávky) | ≥ 90 % |
| Nepodložené údaje po kontrole citací | 0 |
| Doba zpracování 2min diktátu | ≤ 60 s |
| Náklady na zápis | jednotky Kč |

Výstup: krátká zpráva a doporučení poskytovatele. Sada se stane základem evaluace (`eval/`).

### 🚦 G0 – rozhodovací bod

Pokračujeme, pokud: (a) experiment splní cíle nebo je jasná cesta k jejich splnění, (b) vedení souhlasí
s pilotem a zpracováním dat, (c) telefon technicky vyhovuje. Jinak upravíme rozsah (např. hlas jen jako
diktát do textu bez extrakce) nebo pozastavíme.

### E2 – Základ aplikace (2–3 týdny)

- Nový samostatný repozitář, struktura dle SYSTEM_ARCHITECTURE, kap. 14.
- Next.js PWA kostra, navigace (spodní lišta / levý panel), design tokeny, tmavý režim.
- Supabase EU: staging a produkce; migrace v gitu; seed s fiktivními daty.
- Přihlášení, firmy, členství, role; RLS na všech tabulkách; **automatické testy izolace firem**.
- Auditní log (základ), telemetrie `usage_events`.
- CI/CD (testy, náhledová nasazení), Sentry, monitoring dostupnosti, rozpočtové limity u API.
- Výběr e-mailové služby.

### E3 – Zákazníci (2 týdny)

- Seznam s vyhledáváním bez diakritiky, filtry, řazení podle poslední návštěvy.
- Karta zákazníka (záložky), provozovny, kontakty.
- Import CSV/XLSX s mapováním sloupců (podle vzorového exportu D-DA-06).
- Geokódování a potvrzení pinu na mapě; tlačítko **Navigovat**.
- Ruční zápis návštěvy (formulář) a časová osa historie.
- Rychlé založení nového zákazníka.

### E4 – Hlasový zápis + AI (3–4 týdny)

- Nahrávání (pauza, limit), lokální uložení, fronta, idempotentní upload přes podepsanou URL.
- Zpracování: stavový automat, přepis, extrakce, kontrola citací, párování entit, převod termínů,
  opakování, cron úklid.
- Obrazovka kontroly; potvrzení jednou transakcí (návštěva, kontakty, produkty, příležitosti, poptávka,
  úkoly); ukládání oprav (`extraction_feedback`).
- Typy návštěv s návrhem AI.
- Úkoly ze zápisu + přehled úkolů (základ).
- Předání poptávky e-mailem (P1-lite) + tlačítko „Kopírovat pro firemní aplikaci" (podle D-OB-07).
- Dashboard „Dnes" v1 (bez plánu cesty: nedokončené zápisy, úkoly, příležitosti, poslední zákazníci).
- Briefing: fakta + jednoduché AI shrnutí.
- Retence audia, přílohy (foto).
- Jednostránkový návod pro obchodníka.

**M1 – start pilotu P1**, pokud je splněna Definition of Done (kap. 4).

### E5 – Pilot P1 (3–4 týdny, souběžně s vývojem E6)

Viz kap. 5.

### E6 – Plánovač cest (3–4 týdny)

- Cesty a zastávky, typy omezení, výchozí délky, rezerva na parkování.
- **Výpočet harmonogramu** jako čistá funkce s rozsáhlými testy (FIXED/FLEXIBLE/OPEN, zpoždění,
  prodloužení, konflikty, rezervy).
- Google Routes API s predikcí dopravy + cache úseků.
- Mapa cesty, přetahování pořadí (mobil i notebook).
- Průběh dne: zahájení, příjezd, dokončení (+15/+30/jiné), přepočet i offline.
- Obrazovka konfliktu s návrhy a náhledem.
- „Další zákazník" + NAVIGOVAT; Dnes v2 s programem dne.
- Offline cache dnešního dne (plán, briefingy, kontakty).
- Přehled poptávek pro kancelář (P2).

**M2 – pilot P2.**

### E7 – Rozšíření P3 (4–6 týdnů)

Pořadí podle výsledků pilotu a discovery:
- Zákazníci v okolí (poloha, trasa, lokalita, filtry, přidání do plánu).
- Kalendář (jen čtení pevných schůzek; podle D-IT-06).
- Připomínky úkolů, odložení, úkoly pro kolegyni.
- Doporučení dlouho nenavštívených zákazníků.
- Integrace s firemní aplikací (úroveň dle INTEGRATION_ANALYSIS).
- Evidence poptávek přijatých mimo návštěvu.

### E8 – Vyhodnocení a prezentace (1–2 týdny)

- Porovnání KPI s baseline (PROJECT_CONTEXT, kap. 8), dotazník SUS, rozhovory s obchodníkem a kolegyní.
- Přehled nákladů provozu.
- Prezentace vedení: výsledky, doporučení, návrh podmínek pro rozšíření na další obchodníky.

### E9 – Příprava komercializace (po pilotu)

Právní subjekt, obchodní podmínky, zpracovatelská smlouva (DPA), SLA, fakturace, onboarding druhé
firmy, bezpečnostní revize, prezentační web. Podrobněji v BUSINESS_MODEL, kap. 9.

---

## 3. Rozsah první verze (P1) – co přesně dostane obchodník

**Obrazovky:** S01 Přihlášení · S02 Dnes (v1) · S03 Nahrávání · S04 Fronta · S05 Kontrola zápisu ·
S06 Zákazníci · S07 Karta zákazníka · S08 Detail návštěvy · S15 Úkoly · S18 Nastavení (základ).

**Funkce:** přihlášení, zákazníci a kontakty (import), historie, hlasový zápis s AI a kontrolou,
5 typů návštěv, příležitosti, úkoly ze zápisu, předání poptávky e-mailem, kopírování zápisu pro firemní
aplikaci, navigace z karty, briefing, přílohy, offline nahrávání.

**Záměrně ne v P1:** plánovač a harmonogram, V okolí, kalendář, integrace API, připomínky, katalog,
nabídky, nativní aplikace.

---

## 4. Definition of Done pro start pilotu (M1)

- [ ] Všechny požadavky P1 z REQUIREMENTS implementovány a otestovány.
- [ ] Testy izolace firem zelené v CI.
- [ ] Ověřeno na telefonu obchodníka: instalace na plochu, nahrávání, offline fronta (režim letadlo).
- [ ] Zálohy nastavené, obnova jednou vyzkoušená.
- [ ] Retence audia běží.
- [ ] Monitoring chyb a dostupnosti, rozpočtové limity AI a map.
- [ ] Podepsaný smluvní rámec pilotu a DPA; informace o zpracování pro obchodníka.
- [ ] Data zákazníků naimportována (nebo dohodnut postup postupného zadávání).
- [ ] Jednostránkový návod; 30min zaškolení.

---

## 5. Plán pilotu

| Týden | Co se děje |
|---|---|
| 0 | Instalace, zaškolení (30 min), import zákazníků, kontrola adres nejčastějších zákazníků |
| 1 | Používání naplno; denní krátká zpětná vazba (zpráva, 2 min); rychlé opravy |
| 2–4 | Týdenní 15min rozhovor; týdenní vydání úprav; sledování metrik |
| Konec | Dotazník SUS, rozhovor s obchodníkem a kolegyní, vyhodnocení (E8) |

**Paralelní evidence:** dokud není integrace, obchodník přenáší zápis do firemní aplikace tlačítkem
„Kopírovat" (L0). Měříme celkový čas včetně vložení.

**Co měříme (telemetrie + rozhovory):**

| Metrika | Zdroj |
|---|---|
| Čas od konce nahrávky po potvrzení zápisu | `usage_events` |
| Délka diktátu | `voice_notes.duration_sec` |
| Počet a typ oprav při kontrole | `extraction_feedback` |
| Podíl návštěv zapsaných přes aplikaci | Návštěvy vs. plán/odhad obchodníka |
| Doba od návštěvy po předání poptávky | `inquiries` časová razítka |
| Přesnost odhadu příjezdu (P2) | `trip_stops` plán vs. skutečnost |
| Spokojenost | SUS + rozhovor |

### 🚦 G1 – po 3–4 týdnech pilotu P1

| Signál | Pokračovat | Upravit | Zastavit / přehodnotit |
|---|---|---|---|
| Medián času zápisu | ≤ 3 min | 3–6 min | > 6 min |
| Podíl návštěv přes aplikaci | ≥ 80 % | 50–80 % | < 50 % |
| Nepodložené údaje v uložených zápisech | 0 | ojediněle | opakovaně |
| Obchodník chce aplikaci dál používat | ano | s výhradami | ne |

---

## 6. Rozhodnutí, která potřebuji od tebe teď

1. **Souhlasíš s doporučeným stackem** (TypeScript, Next.js PWA, Supabase EU, Vercel, OpenAI za
   vyměnitelnou vrstvou)?
2. **Souhlasíš s úpravou priorit** (úkoly ze zápisu a předání poptávky e-mailem do P1, navigace z karty
   do P1)?
3. **Kdo udělá discovery rozhovory** a kdy může proběhnout shadowing?
4. **Pod jakým subjektem** bude projekt poskytován firmě (fyzická osoba / OSVČ / s.r.o.)?
5. **Kapacita:** kolik hodin týdně můžeš vývoji věnovat? (upřesní časový plán)

## 7. Co udělat hned (nejbližší 2 týdny)

1. Projít tyto dokumenty a označit, s čím nesouhlasíš.
2. **Tři rychlé otázky obchodníkovi** (5 minut, odemknou největší neznámé): jak se jmenuje firemní
   aplikace, jaký kalendář používá, jaký má telefon.
3. Domluvit rozhovor s obchodníkem (D-OB) a požádat ho o 20–30 fiktivních diktátů.
4. Připravit jednostránkový návrh pilotu pro vedení (účel, rozsah, data, bezpečnost, co od firmy potřebujeme).
5. Po G0 založit samostatný repozitář a začít E2.
