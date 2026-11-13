# AI Field Sales Assistant

Inteligentní digitální asistent pro terénní obchodní zástupce. Pilotní nasazení: **MORAVIA ŘETĚZY**.

> **Stav projektu:** fáze analýzy a návrhu (v1, 13. 11. 2026). **Zatím se neprogramuje.**
> Implementace začne až po společném vyhodnocení návrhu a zodpovězení kritických otázek z discovery.

## Hlavní princip

Nevytváříme další CRM. Vytváříme asistenta, díky kterému obchodník stráví méně času administrativou,
lépe naplánuje cesty, má přehled o zákaznících a víc času věnuje samotnému obchodování.

## Dokumentace (doporučené pořadí čtení)

| # | Dokument | Obsah |
|---|---|---|
| 1 | [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | Účel, uživatelé, problém, moduly, obchodní cíle, slovník |
| 2 | [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Funkční a nefunkční požadavky s prioritami |
| 3 | [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Architektura, technologie, AI pipeline, multi-tenant, bezpečnost, rozhodnutí (ADR) |
| 4 | [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Datový model, entity, vztahy, stavy, oddělení dat firem |
| 5 | [INTEGRATION_ANALYSIS.md](docs/INTEGRATION_ANALYSIS.md) | Firemní aplikace, kalendář, mapy – jak zjistit možnosti a jak integrovat |
| 6 | [UX_DESIGN.md](docs/UX_DESIGN.md) | Navigace, obrazovky, uživatelské toky, drátěné modely |
| 7 | [DISCOVERY_CHECKLIST.md](docs/DISCOVERY_CHECKLIST.md) | Co potřebujeme zjistit od obchodníka, kolegyně, vedení a IT |
| 8 | [MVP_ROADMAP.md](docs/MVP_ROADMAP.md) | Etapy vývoje, rozsah MVP, pilot, měření |
| 9 | [RISKS.md](docs/RISKS.md) | Technická, bezpečnostní, právní a obchodní rizika |
| 10 | [BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) | SaaS model, tarify, licence, ekonomika |

## Konvence v dokumentech

- **❓ NEZNÁMÉ** – informace, kterou zatím nemáme. Odkaz typu `[D-IT-03]` vede na otázku v DISCOVERY_CHECKLIST.
- **⚠️ OVĚŘIT** – údaj o externí službě (cena, limit, podmínky), který se mění v čase a musí se ověřit
  v aktuální dokumentaci poskytovatele před rozhodnutím.
- **Hypotéza** – předpoklad, který chceme ověřit v pilotu; není to fakt.
- Priority: **P1 / P2 / P3** = etapy MVP, **Později** = mimo MVP.

## Poznámka k umístění

Dokumentace je dočasně v repozitáři `hlidac-letenek`, který obsahuje jiný projekt.
Před začátkem vývoje doporučuji založit pro projekt **samostatný repozitář** (viz MVP_ROADMAP, etapa 2).
