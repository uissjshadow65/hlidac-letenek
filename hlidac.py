"""Hlídač letenek do Paříže – jeden běh: zjistí ceny, porovná, pošle notifikace, uloží stav.

Spouští se každou hodinu (GitHub Actions). Ručně (PowerShell):
    $env:NTFY_TOPIC = "tvuj-tajny-kanal"
    .venv\\Scripts\\python.exe hlidac.py

Návratový kód: 0 = v pořádku, 1 = nepodařilo se odeslat notifikaci, 2 = chyba nastavení/stavu,
3 = Google zablokoval všechny dotazy a toto NENÍ poslední pokus (HLIDAC_FINAL_ATTEMPT=0) –
    nic se neposlalo ani neuložilo, workflow to zkusí znovu na jiném serveru (jiná IP adresa).
"""

import logging
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dataclasses import replace

import ceny
import graf
import nastaveni
import notifikace
import zpravy
from ceny import Offer
from porovnani import compare, offer_key
from stav import StateError, load_state, save_state

STATE_PATH = Path(__file__).parent / "ceny.json"
EXIT_BLOCKED = 3

log = logging.getLogger("hlidac")


def check_all(get_offer, sleep) -> tuple[dict[str, Offer | None], int, str | None]:
    """Zjistí ceny všech kombinací.

    Vrátí (zjištěné ceny, počet selhaných dotazů, důvod první chyby nebo None).
    Selhaná kombinace ve výsledku chybí – porovnání ji pak přeskočí.
    """
    results: dict[str, Offer | None] = {}
    failed = 0
    first_error: str | None = None
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
            first_error = first_error or str(error)
            log.warning("%s: dotaz selhal – %s", key, error)
    return results, failed, first_error


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


def make_chart(history: list[dict]) -> bytes | None:
    """Graf nesmí shodit běh – když se nepovede nakreslit, zpráva odejde bez něj."""
    try:
        return graf.chart_png(history)
    except Exception as error:
        log.warning("Graf se nepodařilo nakreslit: %s", error)
        return None


def run(
    state_path: Path,
    topic: str,
    now: datetime,
    get_offer=ceny.get_offer,
    notify=None,
    sleep=time.sleep,
    final_attempt: bool = True,
) -> int:
    """Jeden běh hlídače. Internet, notifikace i čekání jdou v testech nahradit.

    `final_attempt=False`: když neprojde ani jeden dotaz, nic neposílej ani neukládej
    a vrať EXIT_BLOCKED – workflow to zkusí znovu na jiném serveru.
    """
    notify = notify or notifikace.send_notification
    state = load_state(state_path)
    first_run = not state.offers
    messages: list[zpravy.Message] = []

    new_offers, failed, first_error = check_all(get_offer, sleep)
    log.info("Zjištěno %d kombinací, selhalo %d.", len(new_offers), failed)

    if not new_offers and not final_attempt:
        log.warning("Google zablokoval všechny dotazy (%s). Zkusí se další pokus na jiném serveru.", first_error)
        return EXIT_BLOCKED

    price_message_sent = False  # poslala se v tomto běhu už zpráva s cenami?
    alert = None

    if not new_offers:
        # Neprošel ani jeden dotaz → varování, ale jen poprvé (ne každou hodinu).
        if state.failing_since is None:
            state.failing_since = now.isoformat(timespec="minutes")
            messages.append(zpravy.failure_message(failed, first_error))
    else:
        if state.failing_since is not None:
            state.failing_since = None
            messages.append(zpravy.recovery_message())
        changes = compare(state.offers, new_offers)
        state.offers.update(new_offers)  # selhané kombinace si nechají minulou cenu
        if first_run:
            messages.append(zpravy.overview_message("✈️ Hlídač spuštěn", state.offers))
            price_message_sent = True
        elif changes:
            messages.append(zpravy.changes_message(changes, state.offers))
            price_message_sent = True
        alert = check_alert(state)

    today = now.date().isoformat()
    if now.hour >= nastaveni.DAILY_REPORT_HOUR and state.last_daily_report != today:
        if not first_run:  # při prvním spuštění už přehled odešel
            warning = None
            if state.failing_since:
                since = datetime.fromisoformat(state.failing_since)
                warning = f"⚠️ Ceny se nedaří zjistit od {since:%d. %m. %H:%M} – údaje můžou být staré."
            messages.append(zpravy.overview_message("☀️ Ranní přehled", state.offers, warning))
            price_message_sent = True
        state.last_daily_report = today

    # Hodinová zpráva: každý úspěšný běh pošle aktuální nejlevnější cenu,
    # i když se nic nezměnilo (pokud už neodešla jiná zpráva s cenami).
    if new_offers and not price_message_sent:
        messages.append(zpravy.hourly_message(state.offers))

    if new_offers:
        state.history = graf.add_to_history(state.history, now, state.offers)

    # 📈 Jednou za pár hodin přiložíme ke zprávě s cenami graf vývoje a trend za poslední den.
    if new_offers and graf.chart_due(state.last_chart, now):
        index = len(messages) - 1  # zpráva s cenami je v tuhle chvíli vždy poslední
        chart = make_chart(state.history)
        if chart is not None:
            message = messages[index]
            trend = graf.trend_line(state.history, now)
            body = f"{trend}\n\n{message.body}" if trend else message.body
            messages[index] = replace(message, body=body, chart=chart)
            state.last_chart = now.isoformat(timespec="minutes")

    if alert:
        messages.append(alert)  # poplach poslední = v mobilu úplně nahoře

    for message in messages:
        try:
            if message.chart is not None:
                notify(topic, message.title, message.body, priority=message.priority, attachment=message.chart)
            else:
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
    # Workflow nastaví "0" u pokusů, po kterých ještě může přijít další (na jiném serveru).
    final_attempt = os.environ.get("HLIDAC_FINAL_ATTEMPT", "1") != "0"
    try:
        return run(STATE_PATH, topic, now, final_attempt=final_attempt)
    except StateError as error:
        log.error("%s", error)
        return 2


if __name__ == "__main__":
    sys.exit(main())
