"""Porovnání minulých a současných cen – čistá logika, bez internetu a bez souborů.

Ceny jsou uložené ve slovníku: klíč = kombinace (např. "VIE 2027-05-12"),
hodnota = Offer (nejlevnější nabídka), nebo None (Google žádný let nenašel).
Kombinace, která ve slovníku úplně chybí, se zatím nekontrolovala.
"""

from dataclasses import dataclass
from enum import Enum

from ceny import Offer


class ChangeKind(Enum):
    CHEAPER = "zlevnění"
    PRICIER = "zdražení"
    NEW = "nový let"  # dřív žádný let, teď je
    GONE = "let zmizel"  # dřív byl let, teď žádný


@dataclass(frozen=True)
class Change:
    kind: ChangeKind
    key: str
    old: Offer | None
    new: Offer | None

    @property
    def difference(self) -> int:
        """O kolik Kč za osobu se cena změnila (záporné = zlevnění). U nového/zmizelého letu 0."""
        if self.old is None or self.new is None:
            return 0
        return self.new.price_per_person - self.old.price_per_person


def offer_key(origin: str, return_date: str) -> str:
    """Klíč kombinace, např. "VIE 2027-05-12"."""
    return f"{origin} {return_date}"


def compare(old: dict[str, Offer | None], new: dict[str, Offer | None]) -> list[Change]:
    """Vrátí seznam změn mezi minulým a současným během.

    Bereme jen kombinace, které se v tomto běhu podařilo zjistit (jsou v `new`).
    Když dotaz selhal, kombinace v `new` chybí – a to není "let zmizel".
    Kombinace, kterou jsme dřív nikdy nekontrolovali (chybí v `old`), se jen zapamatuje.
    Změna jen aerolinky při stejné ceně se nehlásí.
    """
    changes = []
    for key, current in new.items():
        if key not in old:
            continue
        previous = old[key]
        if previous is None and current is None:
            continue
        if previous is None:
            changes.append(Change(ChangeKind.NEW, key, None, current))
        elif current is None:
            changes.append(Change(ChangeKind.GONE, key, previous, None))
        elif current.price_per_person < previous.price_per_person:
            changes.append(Change(ChangeKind.CHEAPER, key, previous, current))
        elif current.price_per_person > previous.price_per_person:
            changes.append(Change(ChangeKind.PRICIER, key, previous, current))
    return changes
