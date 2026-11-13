# REQUIREMENTS – Funkční a nefunkční požadavky

Verze: 1.0 (návrh) · Datum: 13. 11. 2026

**Priority:** P1 = první pilotní verze · P2 = plánovač · P3 = rozšíření pilotu · Později = mimo MVP.
Úpravy priorit oproti zadání jsou zdůvodněny v [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), kap. 6.1.

**Globální pravidla platná pro všechny moduly**

| ID | Pravidlo |
|---|---|
| G-01 | AI pouze navrhuje. Žádný AI výstup se neuloží, neodešle ani nepromítne do jiného systému bez potvrzení uživatelem. |
| G-02 | AI nesmí doplnit údaj, který nezazněl nebo není v ověřených datech. Při nejistotě se aplikace zeptá. |
| G-03 | AI nesmí vytvářet ceny, dostupnost, technické parametry, dodací termíny ani obchodní podmínky. |
| G-04 | Systém nikdy automaticky nezruší ani nepřesune pevnou schůzku (FIXED). |
| G-05 | Systém nikdy sám nerozhoduje, kterého zákazníka obchodník navštíví. Pouze doporučuje. |
| G-06 | Data každé firmy jsou striktně oddělena (viz NFR-SEC). |
| G-07 | Poloha uživatele se používá jen na vyžádání a neukládá se. |
| G-08 | Obsah generovaný AI je v UI vizuálně odlišen od faktů z databáze. |

---

## 1. Funkční požadavky

### Modul 0 – Přihlášení, firmy a role

| ID | Požadavek | Priorita |
|---|---|---|
| FR-0-01 | Přihlášení e-mailem a heslem; obnova hesla | P1 |
| FR-0-02 | Dlouhá relace na důvěryhodném telefonu (např. 30 dní), odhlášení, vzdálené odhlášení všech zařízení | P1 |
| FR-0-03 | Role: obchodník, back-office, manažer, admin (oprávnění v SYSTEM_ARCHITECTURE 7.3) | P1 |
| FR-0-04 | Admin pozve uživatele e-mailem a přidělí roli | P1 |
| FR-0-05 | Dvoufázové ověření (TOTP) povinné pro adminy, volitelné pro ostatní | P2 |
| FR-0-06 | Přihlášení přes Google / Microsoft (SSO) | Později |
| FR-0-07 | Správa licencí (počet aktivních obchodníků) | Později |

### Modul A – Hlasový asistent a zápisy z návštěv

| ID | Požadavek | Priorita |
|---|---|---|
| FR-A-01 | Spuštění nahrávání jedním klepnutím z: hlavní obrazovky, karty zastávky, karty zákazníka | P1 |
| FR-A-02 | Nahrávání s pauzou, ukazatelem času a úrovně zvuku; maximální délka 15 min (konfigurovatelné) | P1 |
| FR-A-03 | Nahrávání funguje bez signálu; nahrávka se uloží v telefonu a odešle automaticky po připojení. Nahrávka se nesmí ztratit při zavření aplikace. | P1 |
| FR-A-04 | Viditelný stav fronty: „Čeká na odeslání", „Zpracovává se", „Připraveno ke kontrole", „Chyba – opakovat" | P1 |
| FR-A-05 | Přepis češtiny včetně slovníku firemních pojmů (produkty, označení, názvy zákazníků z plánu) | P1 |
| FR-A-06 | AI vytvoří strukturovaný zápis s poli: zákazník, datum a čas, kontaktní osoba, typ návštěvy, účel, shrnutí, představené produkty, zjištěné potřeby, obchodní příležitosti, poptávky, další kroky, termín dalšího kontaktu, interní poznámky | P1 |
| FR-A-07 | Každý údaj z AI má citaci z přepisu; údaje bez doložené citace se nevyplní, jen nabídnou k ručnímu doplnění | P1 |
| FR-A-08 | Identifikace zákazníka: přednost má kontext (zastávka/karta, ze které byl zápis spuštěn); při rozporu nebo nejistotě dotaz | P1 |
| FR-A-09 | Identifikace kontaktní osoby z kontaktů zákazníka; nový kontakt jen po potvrzení a jen s údaji, které zazněly | P1 |
| FR-A-10 | Rozpoznání produktů: kategorie z číselníku + doslovné označení (např. „12B-1") | P1 |
| FR-A-11 | Relativní termíny („v lednu", „příští středu") převedeny na datum s přesností a původním výrazem | P1 |
| FR-A-12 | Kontrolní obrazovka: nejisté údaje zvýrazněné, úprava každého pole, zobrazení přepisu, potvrzení jedním tlačítkem | P1 |
| FR-A-13 | Ruční zápis bez hlasu (formulář se stejnou strukturou) jako záloha | P1 |
| FR-A-14 | Přílohy k zápisu: fotka z telefonu, soubor (výkres, PDF) | P1 |
| FR-A-15 | Interní poznámky oddělené od shrnutí (nepřenášejí se do podkladu pro zákazníka/kancelář, pokud to uživatel nezvolí) | P1 |
| FR-A-16 | Seznam nedokončených zápisů: nahrávky čekající na kontrolu + dokončené zastávky bez zápisu | P1 |
| FR-A-17 | Uložení rozdílu mezi návrhem AI a finální verzí (měření kvality) | P1 |
| FR-A-18 | Automatické smazání audia po uplynutí retence (výchozí 30 dní po potvrzení; nastavitelné firmou) | P1 |
| FR-A-19 | Zahození zápisu (smaže audio i návrh) | P1 |
| FR-A-20 | Doplnění zápisu dalším hlasovým vstupem („doplnit hlasem") | P2 |
| FR-A-21 | Push notifikace „Zápis je připraven ke kontrole" | P2 |
| FR-A-22 | Úprava zápisu po uložení s auditní stopou | P2 |

**Akceptační kritéria (výběr)**

- *FR-A-03:* Dáno: telefon v režimu letadlo. Když obchodník nahraje 2min diktát a zavře aplikaci,
  pak po zapnutí sítě a otevření aplikace se nahrávka odešle bez zásahu uživatele a v DB existuje
  právě jeden záznam (žádná duplicita ani při opakovaném odeslání).
- *FR-A-07:* Dáno: diktát nezmiňuje funkci kontaktní osoby. Pak pole „funkce" zůstane prázdné
  a nejistota je zobrazena jako otázka.
- *FR-A-08:* Dáno: zápis spuštěn ze zastávky „ABC s.r.o.", ale diktát zmiňuje „firmu XYZ".
  Pak aplikace před uložením zobrazí volbu „ABC s.r.o. / XYZ / jiný".

### Modul B – Typy návštěv a vztahy

| ID | Požadavek | Priorita |
|---|---|---|
| FR-B-01 | Typy návštěv: obchodní, poptávková, vztahová, následná, ostatní (s vlastním popisem) | P1 |
| FR-B-02 | AI navrhne typ s krátkým odůvodněním; uživatel potvrdí nebo změní | P1 |
| FR-B-03 | Historie vztahu na kartě zákazníka: časová osa návštěv (typ, kdo, shrnutí), kontakty, zájem o produkty | P1 |
| FR-B-04 | Ukazatel „poslední návštěva před X dny" u zákazníka a v seznamech | P1 |
| FR-B-05 | Doporučení: zákazníci, kteří nebyli dlouho navštíveni (pouze seznam, žádné automatické plánování) | P3 |
| FR-B-06 | Nastavitelná frekvence návštěv podle segmentu zákazníka (např. A = 60 dní) | P3 |
| FR-B-07 | Více typů u jedné návštěvy (pokud to discovery potvrdí) ❓ `[D-OB-17]` | P3 |

### Modul C – Zákazníci (nadstavba CRM)

| ID | Požadavek | Priorita |
|---|---|---|
| FR-C-01 | Seznam zákazníků s vyhledáváním (bez ohledu na diakritiku a velikost písmen) podle názvu, města, IČO, kontaktu | P1 |
| FR-C-02 | Řazení a filtry: poslední návštěva, město/region, otevřené příležitosti, otevřené úkoly | P1 |
| FR-C-03 | Karta zákazníka: název, IČO, adresa(y), kontakty, telefon, e-mail, historie návštěv, poptávek, nabídek, příležitosti, poznámky, plánované návštěvy, nedokončené úkoly | P1 |
| FR-C-04 | Více provozoven u jednoho zákazníka (sídlo, závody) s vlastní adresou a souřadnicemi | P1 |
| FR-C-05 | Správa kontaktů (přidat, upravit, deaktivovat) | P1 |
| FR-C-06 | Import zákazníků a kontaktů z CSV/XLSX s mapováním sloupců a náhledem před importem | P1 |
| FR-C-07 | Ověření adresy: geokódování + potvrzení pinu na mapě; stav „adresa ověřena" | P1 |
| FR-C-08 | Rychlé akce: zavolat, napsat e-mail, navigovat (Google Maps) | P1 |
| FR-C-09 | Briefing – fakta (poslední návštěva, co se řešilo, otevřené požadavky, poslední domluva) | P1 |
| FR-C-10 | Briefing – shrnutí AI s odkazy na zdrojové návštěvy („na co se zaměřit") | P1-lite / P2 |
| FR-C-11 | Doplnění údajů firmy podle IČO z registru ARES | P2 |
| FR-C-12 | Nový zákazník z terénu (rychlé založení: název, adresa, kontakt) | P1 |
| FR-C-13 | Upozornění na možné duplicity zákazníků | P3 |
| FR-C-14 | Synchronizace se zdrojovým firemním systémem | P3 (dle discovery) |

### Modul D – Plánovač obchodních cest

| ID | Požadavek | Priorita |
|---|---|---|
| FR-D-01 | Vytvoření cesty: datum, výchozí místo (výchozí z profilu), čas odjezdu, cílové místo | P2 |
| FR-D-02 | Přidání zastávek: zákazník/provozovna z databáze nebo jednorázová adresa | P2 |
| FR-D-03 | Ruční pořadí zastávek (přetažení), přidání, odebrání | P2 |
| FR-D-04 | Typ časového omezení zastávky: FIXED (čas), FLEXIBLE (okno, např. dopoledne), OPEN | P2 |
| FR-D-05 | Plánovaná délka návštěvy (výchozí z nastavení, případně z historie zákazníka) | P2 |
| FR-D-06 | Poznámka k zastávce | P2 |
| FR-D-07 | Harmonogram: u každé zastávky předpokládaný příjezd, odjezd, doba přejezdu, délka návštěvy, rezerva | P2 |
| FR-D-08 | Doby přejezdů zohledňují predikci dopravy pro plánovaný čas; rezerva na parkování/vrátnici (nastavitelná) | P2 |
| FR-D-09 | Automatický přepočet po změně pořadí, přidání/odebrání, změně délky, odjezdu, zpoždění, prodloužení | P2 |
| FR-D-10 | Detekce konfliktu s pevnou schůzkou; upozornění s návrhy řešení a náhledem dopadu | P2 |
| FR-D-11 | Mapa cesty: všechny zastávky, trasa, adresy, změna pořadí | P2 |
| FR-D-12 | Průběh dne: „Jsem na místě", „Dokončeno – podle plánu / +15 min / +30 min / jiné" | P2 |
| FR-D-13 | Přepočet harmonogramu i offline (s posledními známými časy přejezdů) | P2 |
| FR-D-14 | Odhad času návratu | P2 |
| FR-D-15 | Uložení plánu; přehled naplánovaných cest; kopie cesty | P2 |
| FR-D-16 | Pevné schůzky z kalendáře jako zastávky FIXED | P3 (dle G) |
| FR-D-17 | Návrh pořadí zastávek na vyžádání (obchodník rozhoduje, zda použije) | Později |
| FR-D-18 | Vícedenní cesty s noclehem | Později ❓ `[D-OB-12]` |

**Akceptační kritéria (výběr)**

- *FR-D-10:* Dáno: zastávka 3 je FIXED v 10:00 a obchodník u zastávky 2 zadá „+30 min". Když je nový
  odhad příjezdu na zastávku 3 v 10:12, pak se zobrazí konflikt „Zpoždění 12 min na schůzku v 10:00"
  s možnostmi řešení. Čas zastávky 3 zůstane 10:00.
- *FR-D-09:* Přepočet po změně proběhne v telefonu do 200 ms (bez čekání na server).

### Modul E – Zákazníci v okolí

| ID | Požadavek | Priorita |
|---|---|---|
| FR-E-01 | Zákazníci v okolí aktuální polohy (na vyžádání; volba okruhu 5/10/25/50 km) | P3 |
| FR-E-02 | Zákazníci poblíž plánované trasy (koridor X km) | P3 |
| FR-E-03 | Zákazníci v zadané lokalitě (město, adresa) | P3 |
| FR-E-04 | Filtry: poslední návštěva starší než X, otevřené příležitosti, otevřené úkoly | P3 |
| FR-E-05 | Položka: název, vzdálenost, poslední návštěva a její typ, otevřené úkoly, příležitosti, stručná historie | P3 |
| FR-E-06 | „Přidat do plánu" s náhledem dopadu na harmonogram | P3 |
| FR-E-07 | Poloha se neukládá na server ani do logů | P3 |

### Modul F – Další zákazník a navigace

| ID | Požadavek | Priorita |
|---|---|---|
| FR-F-01 | Tlačítko „Navigovat" na kartě zákazníka/provozovny → Google Maps s ověřenými souřadnicemi | P1 |
| FR-F-02 | Po dokončení zastávky se automaticky zobrazí další: firma, kontakt, adresa, plánovaný příjezd, doba přejezdu, historie, důležité poznámky | P2 |
| FR-F-03 | Velké tlačítko „NAVIGOVAT DO DALŠÍHO ZÁKAZNÍKA" | P2 |
| FR-F-04 | Upozornění u pevné schůzky („Schůzka pevně v 10:00 – rezerva 12 min") | P2 |
| FR-F-05 | Rychlé zavolání kontaktu další zastávky (např. při zpoždění) | P2 |
| FR-F-06 | Upozornění, pokud adresa není ověřena (navigace podle textové adresy) | P1 |

### Modul G – Kalendář (závisí na discovery ❓ `[D-IT-06]`)

| ID | Požadavek | Priorita |
|---|---|---|
| FR-G-01 | Připojení firemního kalendáře uživatele (jen pracovní kalendář) | P3 |
| FR-G-02 | Načítání schůzek a zobrazení denního programu | P3 |
| FR-G-03 | Propojení události se zákazníkem (automatický návrh podle názvu/místa, potvrzení uživatelem) | P3 |
| FR-G-04 | Převzetí schůzky do plánu cesty jako FIXED | P3 |
| FR-G-05 | Vytvoření události (např. follow-up) z aplikace | P3 |
| FR-G-06 | Soukromé události se nezobrazují ani neukládají (jen „obsazeno") | P3 |

### Modul H – Poptávky a předání do kanceláře

| ID | Požadavek | Priorita |
|---|---|---|
| FR-H-01 | Datový model odděluje návštěvu, příležitost, poptávku, nabídku, objednávku a následnou komunikaci | P1 |
| FR-H-02 | Ze zápisu vznikne strukturovaný podklad poptávky: zákazník, kontakt, položky (produkt/označení, množství, jednotka, parametry), požadovaný termín nabídky, technické poznámky, přílohy | P1 |
| FR-H-03 | Odeslání podkladu kolegyni e-mailem po potvrzení obchodníkem | P1-lite |
| FR-H-04 | Přehled poptávek pro back-office: seznam, detail, doplnění, stavy (nová, v řešení, chybí informace, nabídka odeslána, uzavřeno) | P2 |
| FR-H-05 | Back-office může požádat obchodníka o doplnění (úkol/notifikace) | P2 |
| FR-H-06 | Evidence poptávky, která přišla jinou cestou (e-mail, telefon), s volitelnou vazbou na předchozí návštěvu | P3 |
| FR-H-07 | Odkazy na nabídky a objednávky z firemního systému (číslo, stav) | P3 (dle integrace) |
| FR-H-08 | Vyhledání v produktovém katalogu, příprava podkladů a návrhu nabídky ke kontrole | Později |

### Modul I – Úkoly a follow-up

| ID | Požadavek | Priorita |
|---|---|---|
| FR-I-01 | Úkoly ze zápisu: AI navrhne, uživatel zaškrtne které vytvořit | P1 |
| FR-I-02 | Úkol: název, popis, zákazník, termín (s přesností), priorita, stav, zdroj vzniku (odkaz na návštěvu) | P1 |
| FR-I-03 | Ruční vytvoření úkolu | P1 |
| FR-I-04 | Přehled nedokončených úkolů: po termínu, dnes, tento týden, později | P1 |
| FR-I-05 | Termín dalšího kontaktu ze zápisu automaticky jako úkol (po potvrzení) | P1 |
| FR-I-06 | Připomínky (push/e-mail) | P3 |
| FR-I-07 | Přiřazení úkolu kolegyni (např. „připravit nabídku") | P2 |
| FR-I-08 | Odložení úkolu (snooze) | P3 |

### Modul J – Dashboard („Dnes")

| ID | Požadavek | Priorita |
|---|---|---|
| FR-J-01 | Další zákazník / nejbližší schůzka s tlačítky Navigovat, Briefing, Zápis | P1 (z dnešního seznamu) / P2 (z plánu) |
| FR-J-02 | Dnešní plán (časová osa) | P2 |
| FR-J-03 | Nedokončené zápisy (počet + odkaz) | P1 |
| FR-J-04 | Úkoly na dnes a po termínu | P1 |
| FR-J-05 | Otevřené obchodní příležitosti (počet + odkaz) | P1 |
| FR-J-06 | Stav připojení a fronty odesílání | P1 |
| FR-J-07 | Hlavní akce dosažitelné palcem jedné ruky; max. 3 klepnutí k nahrávání a navigaci | P1 |

---

## 2. Nefunkční požadavky

### Výkon

| ID | Požadavek |
|---|---|
| NFR-PERF-01 | Hlavní obrazovka se načte do 2 s na 4G (opakované otevření z cache do 1 s). |
| NFR-PERF-02 | Návrh zápisu ze 2min diktátu je připraven do 60 s (p90) od dokončení uploadu. |
| NFR-PERF-03 | Přepočet harmonogramu v telefonu do 200 ms. |
| NFR-PERF-04 | Vyhledání zákazníka do 500 ms (do 5 000 zákazníků na firmu). |

### Spolehlivost a dostupnost

| ID | Požadavek |
|---|---|
| NFR-REL-01 | Žádná ztráta nahrávky po stisku „Stop" (lokální uložení před odesláním; smazání až po potvrzení serverem). |
| NFR-REL-02 | Idempotentní upload a zpracování (žádné duplicity při opakování). |
| NFR-REL-03 | Automatické opakování neúspěšného zpracování (3×), pak viditelná chyba s možností opakovat ručně. |
| NFR-REL-04 | Dostupnost v pilotu ≥ 99 % v pracovní době (Po–Pá 6–20 h). |
| NFR-REL-05 | Zálohy denně; RPO ≤ 24 h, RTO ≤ 8 h (pilot). Před komerčním provozem zpřísnit. |
| NFR-REL-06 | Výpadek AI nebo mapové služby nesmí zablokovat nahrávání ani zobrazení dnešního plánu. |

### Offline

| ID | Požadavek |
|---|---|
| NFR-OFF-01 | Offline: nahrávání, zobrazení dnešního plánu a briefingů dnešních zákazníků, označení zastávek, přepočet harmonogramu. |
| NFR-OFF-02 | Uživatel vždy vidí, co čeká na odeslání. |

### Bezpečnost a ochrana dat

| ID | Požadavek |
|---|---|
| NFR-SEC-01 | Oddělení dat firem vynucené databází (RLS) a ověřené automatickými testy v CI. |
| NFR-SEC-02 | Veškerá komunikace přes HTTPS (TLS 1.2+). |
| NFR-SEC-03 | Přístupové údaje k integracím šifrované v trezoru, nikdy v klientu ani v logu. |
| NFR-SEC-04 | Auditní záznam důležitých operací (přihlášení, role, export, mazání, potvrzení zápisu, odeslání poptávky, integrace). |
| NFR-SEC-05 | Logy a chybová hlášení bez osobních údajů a obsahu zápisů. |
| NFR-SEC-06 | MFA pro adminy; vzdálené odhlášení zařízení. |
| NFR-SEC-07 | Data uložena v EU; externí zpracovatelé s uzavřenou smlouvou o zpracování (DPA). |
| NFR-SEC-08 | Export a smazání dat firmy a jednotlivé osoby (kontaktu) na vyžádání. |
| NFR-SEC-09 | Retence: audio max. 30 dní po potvrzení (výchozí), přepisy a AI výstupy dle nastavení firmy. |
| NFR-SEC-10 | Externí AI se použije pro skutečná data až po písemném schválení firmou. |

### Použitelnost a přístupnost

| ID | Požadavek |
|---|---|
| NFR-UX-01 | Mobile-first; plně použitelné od šířky 360 px; responzivní pro notebook. |
| NFR-UX-02 | Dotykové cíle min. 48 × 48 px, hlavní akce min. 56 px vysoké. |
| NFR-UX-03 | Kontrast dle WCAG 2.1 AA; čitelnost na slunci; tmavý režim. |
| NFR-UX-04 | Čeština, české formáty data a času (24h), Kč; připraveno na další jazyky (slovenština). |
| NFR-UX-05 | Aplikace nevyžaduje interakci během jízdy; během jízdy navigace v Google Maps. |

### Kompatibilita

| ID | Požadavek |
|---|---|
| NFR-COMP-01 | Aktuální a předchozí hlavní verze iOS Safari a Chrome pro Android ❓ (dle telefonu `[D-IT-11]`). |
| NFR-COMP-02 | Desktop: aktuální Chrome, Edge, Firefox, Safari. |

### Kvalita AI (cíle pilotu – hypotézy, ověří etapa 1)

| ID | Požadavek |
|---|---|
| NFR-AI-01 | 0 nepodložených údajů v uložených zápisech (vše s citací nebo ručně zadané). |
| NFR-AI-02 | Správný zákazník ≥ 98 % (při spuštění ze zastávky), ≥ 90 % bez kontextu (zbytek dotazem). |
| NFR-AI-03 | ≥ 90 % zápisů uložených bez opravy přepisu technických označení. |
| NFR-AI-04 | Průměrně ≤ 2 opravy polí na zápis při kontrole. |

### Udržovatelnost a provoz

| ID | Požadavek |
|---|---|
| NFR-OPS-01 | Automatické testy: výpočet harmonogramu, izolace firem, kontrola AI výstupů, hlavní E2E toky. |
| NFR-OPS-02 | Prompty a modely verzované; každý AI výsledek ví, jakou verzí vznikl. |
| NFR-OPS-03 | Monitoring chyb a dostupnosti s upozorněním. |
| NFR-OPS-04 | Sledování nákladů na AI a mapy po firmách; limity proti nečekaným nákladům. |
| NFR-OPS-05 | Dokumentace rozhodnutí (ADR) a postupů nasazení. |

---

## 3. Mimo rozsah MVP (záměrně)

- Náhrada firemního CRM/ERP, fakturace, skladová evidence.
- Automatické cenové nabídky, produktový katalog, ceníky.
- Automatická optimalizace tras bez zásahu obchodníka.
- Sledování polohy, reporty výkonu zaměstnanců.
- Nahrávání schůzek se zákazníky.
- Nativní mobilní aplikace, CarPlay / Android Auto.
- Pokročilá analytika a firemní reporty.
