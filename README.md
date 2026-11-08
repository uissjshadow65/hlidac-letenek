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
| Ranní přehled letenek ☀️ | jednou denně, první běh po 8:00 – zároveň potvrzení, že hlídač žije |
| ⚠️ Hlídač letenek nefunguje | když neprojde žádný dotaz (jen jednou, ne každou hodinu) |
| ✅ Hlídač letenek zase funguje | po výpadku |

**Když ráno nepřijde přehled, něco je špatně** – podívej se na GitHubu do záložky *Actions*.

## Soubory
| Soubor | Co dělá |
|---|---|
| `nastaveni.py` | letiště, data, počet osob, hranice poplachu, čas ranního přehledu – **změny dělej tady** |
| `ceny.py` | dotaz na Google Lety a výběr nejlevnějšího letu |
| `porovnani.py` | co se změnilo od minula |
| `zpravy.py` | texty notifikací |
| `notifikace.py` | odeslání do ntfy |
| `stav.py` | uložení a načtení `ceny.json` |
| `hlidac.py` | jeden celý běh |
| `.github/workflows/hlidac.yml` | spouštění každou hodinu na GitHubu |
| `ceny.json` | poslední známé ceny (ukládá ho GitHub po každém běhu) |

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
- GitHub plánované běhy občas zpozdí nebo vynechá – kontrola je „zhruba každou hodinu“.
- Google může dotazy ze serverů GitHubu blokovat. Pak chodí varování ⚠️.
- GitHub vypne plánované běhy repozitáře bez aktivity po 60 dnech. Ranní přehled mění
  `ceny.json` každý den, takže by k tomu dojít nemělo.
