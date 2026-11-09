# Hlídač letenek do Paříže

Každou hodinu zjistí na Google Letech ceny zpátečních letenek do Paříže
(odlet 8. 5. 2027, návrat 12. nebo 13. 5. 2027, 2 osoby, jen malý batoh)
ze 7 letišť v okolí a při **jakékoli změně ceny** pošle notifikaci do mobilu přes [ntfy](https://ntfy.sh).

Ceny ve zprávách jsou **za osobu**. Ptáme se na 2 osoby a dělíme dvěma – když v akční ceně
zbývá jen jedno místo, uvidíš skutečnou cenu pro dva.

## Jaké zprávy chodí
| Zpráva | Kdy |
|---|---|
| 🚨🚨 POD 2 000 Kč! | cena za osobu klesne pod `ALERT_PRICE_PER_PERSON` – nejvyšší priorita; znovu jen při dalším zlevnění |
| Hlídač letenek spuštěn ✈️ | první běh, přehled všech cen |
| 💰 Změna ceny · od … Kč/os. | při každé změně (souhrn všech změn v jednom běhu) |
| 🕐 Hodinová kontrola · od … Kč/os. | každou hodinu (kolem :22), když se nic nezměnilo – nejlevnější nahoře + ceny ze všech letišť |
| 📈 graf ve zprávě | jednou za 6 hodin se ke zprávě s cenami přiloží graf ve stylu telemetrie: stopy všech letišť přes sebe, bíle nejlevnější, červeně hranice poplachu, dole delta stopa (zeleně zlevnění, červeně zdražení) a nahoře řádek s trendem za 24 h |
| Ranní přehled letenek ☀️ | jednou denně, první běh po 8:00 – zároveň potvrzení, že hlídač žije |
| ⚠️ Hlídač letenek nefunguje | když neprojde žádný dotaz (jen jednou, ne každou hodinu) |
| ✅ Hlídač letenek zase funguje | po výpadku |

Všechny zprávy včetně hodinové kontroly chodí s **vysokou prioritou** (vyskočí na displeji),
poplach s nejvyšší. Nastavuje se v `nastaveni.py`.

**Když ráno nepřijde přehled, něco je špatně** – podívej se na GitHubu do záložky *Actions*.

## Soubory
| Soubor | Co dělá |
|---|---|
| `nastaveni.py` | letiště, data, počet osob, hranice poplachu, čas ranního přehledu – **změny dělej tady** |
| `ceny.py` | dotaz na Google Lety a výběr nejlevnějšího letu |
| `porovnani.py` | co se změnilo od minula |
| `zpravy.py` | texty notifikací |
| `graf.py` | historie cen, graf vývoje a trend za 24 h |
| `notifikace.py` | odeslání do ntfy |
| `stav.py` | uložení a načtení `ceny.json` |
| `hlidac.py` | jeden celý běh |
| `.github/workflows/hlidac.yml` | běh na GitHubu; každou hodinu ho spouští cron-job.org přes GitHub API |
| `ceny.json` | poslední známé ceny a historie za 30 dní pro graf (ukládá ho GitHub po každém běhu) |

## Spuštění na vlastním PC (PowerShell)
```powershell
.venv\Scripts\Activate.ps1
python -m pytest                              # testy
$env:NTFY_TOPIC = "tvuj-tajny-kanal"
python hlidac.py                              # jeden běh
$LASTEXITCODE                                 # 0 OK, 1 nešla notifikace, 2 chyba nastavení/stavu
```

## Známé limity
- Data jsou z Google Letů přes neoficiální knihovnu `fast-flights`. Když Google změní web,
  přijde varování ⚠️ a bude potřeba upravit `ceny.py`.
- Vlastní plánování GitHubu (schedule) u tohoto repozitáře běhy vůbec nespouštělo, proto
  hlídače spouští **cron-job.org** (každou hodinu, přes GitHub token s právem jen na Actions
  tohoto repozitáře). Když spuštění selže, pošle cron-job.org e-mail.
  **Token vyprší 1. 6. 2027** – do té doby stačí.
- Google může dotazy ze serverů GitHubu blokovat. Pak chodí varování ⚠️.
- GitHub vypne plánované běhy repozitáře bez aktivity po 60 dnech. Ranní přehled mění
  `ceny.json` každý den, takže by k tomu dojít nemělo.
