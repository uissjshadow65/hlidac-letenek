"""Hlídač letenek do Paříže – jeden běh: zjistí ceny, porovná, pošle notifikace, uloží stav.

Spouští se každou hodinu (GitHub Actions). Ručně (PowerShell):
    $env:NTFY_TOPIC = "tvuj-tajny-kanal"
    .venv\\Scripts\\python.exe hlidac.py

Návratový kód: 0 = v pořádku, 1 = nepodařilo se odeslat notifikaci, 2 = chyba nastavení/stavu.
"""

import logging
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import ceny
import nastaveni
import notifikace
import zpravy
from ceny import Offer
from porovnani import compare, offer_key
from stav import StateError, load_state, save_state

STATE_PATH = Path(__file__).parent / "ceny.json"

log = logging.getLogger("hlidac")


def check_all(get_offer, sleep) -> tuple[dict[str, Offer | None], int]:
    """Zjistí ceny všech kombinací. Vrátí (zjištěné ceny, počet selhaných dotazů).

    Selhaná kombinace ve výsledku chybí – porovnání ji pak přeskočí.
    """
    results: dict[str, Offer | None] = {}
    failed = 0
    combinations = [(o, d) for o in nastaveni.ORIGINS for d in nastaveni.RETURN_DATES]
    for index, (origin, return_date) in enumerate(combinations):
        if index > 0:
            sleep(random.uniform(*nastaveni.PAUSE_SECONDS))  # ať Google nezahltíme
        key = offer_key(origin, return_date)
        try:
            results[key] = get_offer(origin, return_date)
            offer = results[key]
            log.info("%s: %s", key, f"{offer.price_per_person} Kč/os." if offer else "žádný let")
        except Exception as error:  # i neočekávaná chyba jen u jedné kombinace nesmí shodit celý běh
            failed += 1
            log.warning("%s: dotaz selhal – %s", key, error)
    return results, failed


def check_alert(state) -> zpravy.Message | None:
    """🚨 Poplach, když je nejlevnější cena pod hranicí.

    Aby poplach nechodil každou hodinu: pošle se, když cena pod hranici spadne,
    a pak znovu jen při dalším zlevnění. Když cena vyskočí nad hranici, vše se vynuluje.
    """
    limit = nastaveni.ALERT_PRICE_PER_PERSON
    best = zpravy.cheapest(state.offers)
    if best is None or best.price_per_person >= limit:
        state.alert_price = None
        return None
    if state.alert_price is not None and best.price_per_person >= state.alert_price:
        return None  # o téhle (nebo nižší) ceně už víš
    state.alert_price = best.price_per_person
    return zpravy.alert_message(state.offers, limit)


def run(state_path: Path, topic: str, now: datetime, get_offer=ceny.get_offer, notify=None, sleep=time.sleep) -> int:
    """Jeden běh hlídače. Internet, notifikace i čekání jdou v testech nahradit."""
    notify = notify or notifikace.send_notification
    state = load_state(state_path)
    first_run = not state.offers
    messages: list[zpravy.Message] = []

    new_offers, failed = check_all(get_offer, sleep)
    log.info("Zjištěno %d kombinací, selhalo %d.", len(new_offers), failed)

    if not new_offers:
        # Neprošel ani jeden dotaz → varování, ale jen poprvé (ne každou hodinu).
        if state.failing_since is None:
            state.failing_since = now.isoformat(timespec="minutes")
            messages.append(zpravy.failure_message(failed))
    else:
        if state.failing_since is not None:
            state.failing_since = None
            messages.append(zpravy.recovery_message())
        changes = compare(state.offers, new_offers)
        state.offers.update(new_offers)  # selhané kombinace si nechají minulou cenu
        if first_run:
            messages.append(zpravy.overview_message("✈️ Hlídač spuštěn", state.offers))
        elif changes:
            messages.append(zpravy.changes_message(changes, state.offers))
        alert = check_alert(state)
        if alert:
            messages.append(alert)  # poslední = v mobilu nahoře

    today = now.date().isoformat()
    if now.hour >= nastaveni.DAILY_REPORT_HOUR and state.last_daily_report != today:
        if not first_run:  # při prvním spuštění už přehled odešel
            warning = None
            if state.failing_since:
                since = datetime.fromisoformat(state.failing_since)
                warning = f"⚠️ Ceny se nedaří zjistit od {since:%d. %m. %H:%M} – údaje můžou být staré."
            messages.append(zpravy.overview_message("☀️ Ranní přehled", state.offers, warning))
        state.last_daily_report = today

    for message in messages:
        try:
            notify(topic, message.title, message.body, priority=message.priority)
            log.info("Odeslána notifikace: %s", message.title)
        except Exception as error:
            # Stav neukládáme – příští běh změnu najde znovu a zkusí ji poslat.
            log.error("Notifikaci se nepodařilo odeslat: %s", error)
            return 1

    save_state(state_path, state)
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("primp").setLevel(logging.WARNING)  # knihovna jinak loguje každý dotaz
    topic = os.environ.get("NTFY_TOPIC", "")
    if not topic:
        log.error("Chybí proměnná prostředí NTFY_TOPIC (název kanálu ntfy).")
        return 2
    now = datetime.now(ZoneInfo(nastaveni.TIMEZONE))
    try:
        return run(STATE_PATH, topic, now)
    except StateError as error:
        log.error("%s", error)
        return 2


if __name__ == "__main__":
    sys.exit(main())
