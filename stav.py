"""Uložení a načtení stavu hlídače (ceny.json) mezi jednotlivými běhy.

Na GitHubu každý běh začíná "s čistou hlavou" – jediná paměť je tento soubor,
který se po běhu uloží zpět do repozitáře.
"""

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path

from ceny import Offer


class StateError(Exception):
    """Soubor se stavem je poškozený nebo nečitelný."""


@dataclass
class State:
    offers: dict[str, Offer | None] = field(default_factory=dict)
    failing_since: str | None = None  # čas, od kdy selhávají všechny dotazy (None = vše v pořádku)
    last_daily_report: str | None = None  # datum posledního ranního hlášení, např. "2026-11-09"


def load_state(path: Path) -> State:
    """Načte stav. Když soubor neexistuje (první běh), vrátí prázdný stav."""
    if not path.exists():
        return State()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        offers = {
            key: None if value is None else Offer(**{**value, "airlines": tuple(value["airlines"])})
            for key, value in data["offers"].items()
        }
        return State(
            offers=offers,
            failing_since=data.get("failing_since"),
            last_daily_report=data.get("last_daily_report"),
        )
    except (ValueError, KeyError, TypeError) as error:
        raise StateError(f"Soubor {path.name} je poškozený: {error!r}") from error


def save_state(path: Path, state: State) -> None:
    """Uloží stav atomicky: nejdřív do dočasného souboru, pak ho přejmenuje.

    Kdyby běh spadl uprostřed zápisu, původní soubor zůstane celý.
    """
    data = {
        "offers": {key: None if offer is None else asdict(offer) for key, offer in sorted(state.offers.items())},
        "failing_since": state.failing_since,
        "last_daily_report": state.last_daily_report,
    }
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
