"""Zjištění nejlevnější zpáteční letenky pro jednu kombinaci (odkud + datum návratu)."""

import json
import math
import re
from dataclasses import dataclass

from fast_flights import FlightQuery, Passengers, Query, create_query
from primp import Client

import nastaveni

GOOGLE_FLIGHTS_URL = "https://www.google.com/travel/flights"
# Z EU Google nejdřív ukáže stránku se souhlasem s cookies ("Než budete pokračovat").
# Cookie SOCS=CAI odpovídá volbě "Odmítnout vše" – data pak přijdou rovnou.
CONSENT_COOKIES = {"SOCS": "CAI"}
TIMEOUT_SECONDS = 30


class PriceFetchError(Exception):
    """Cenu se nepodařilo zjistit (Google vrátil jinou stránku, výpadek sítě…)."""


@dataclass(frozen=True)
class Offer:
    """Nejlevnější nabídka pro jednu kombinaci."""

    origin: str
    return_date: str
    price_per_person: int  # Kč, zaokrouhleno nahoru
    airlines: tuple[str, ...]
    url: str  # odkaz do Google Letů pro kontrolu v prohlížeči


def build_query(origin: str, return_date: str) -> Query:
    """Sestaví dotaz na zpáteční let origin → Paříž → origin."""
    return create_query(
        flights=[
            FlightQuery(date=nastaveni.DEPARTURE_DATE, from_airport=origin, to_airport=nastaveni.DESTINATION),
            FlightQuery(date=return_date, from_airport=nastaveni.DESTINATION, to_airport=origin),
        ],
        trip="round-trip",
        passengers=Passengers(adults=nastaveni.PASSENGERS),
        language="cs",
        currency=nastaveni.CURRENCY,
    )


def fetch_html(query: Query) -> str:
    """Stáhne stránku s výsledky z Google Letů (jediné místo, kde se jde na internet)."""
    # Klient se tváří jako prohlížeč Chrome, jinak by Google dotaz odmítl.
    client = Client(
        impersonate="chrome_145", impersonate_os="macos", referer=True, cookie_store=True, timeout=TIMEOUT_SECONDS
    )
    try:
        return client.get(GOOGLE_FLIGHTS_URL, params=query.params(), cookies=CONSENT_COOKIES).text
    except Exception as error:  # síťové chyby knihovny primp nemají společnou třídu
        raise PriceFetchError(f"Google Lety nejsou dostupné: {error}") from error


def extract_prices(html: str) -> list[tuple[int, tuple[str, ...]]]:
    """Vytáhne ze stránky Google Letů dvojice (celková cena, aerolinky).

    Data jsou ve stránce jako JSON uvnitř <script class="ds:1">…data:[…], sideChannel…</script>.
    Lety jsou ve dvou seznamech: payload[2] = "Nejlepší lety", payload[3] = "Ostatní lety".
    Knihovna fast-flights čte jen payload[3] – a nejlevnější let (často Ryanair) je
    přitom v payload[2]. Proto čteme oba. Prázdný seznam = Google žádný let nenašel.
    """
    match = re.search(r'<script[^>]*class="ds:1"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise PriceFetchError("Google nevrátil výsledky hledání (možná stránka se souhlasem nebo blokace).")
    try:
        data = match.group(1).split("data:", 1)[1].rsplit(", sideChannel", 1)[0]
        payload = json.loads(data)
        prices = []
        for section in (payload[2], payload[3]):
            if not section or not section[0]:
                continue  # tento seznam je prázdný
            for item in section[0]:
                price_info = item[1][0] if item[1] else None
                if not price_info or not price_info[1]:
                    continue  # let bez ceny
                prices.append((int(price_info[1]), tuple(item[0][1])))
        return prices
    except (IndexError, KeyError, TypeError, ValueError) as error:  # Google změnil strukturu stránky
        raise PriceFetchError(f"Nepodařilo se přečíst výsledky z Google Letů: {error!r}") from error


def cheapest_offer(
    origin: str, return_date: str, prices: list[tuple[int, tuple[str, ...]]], url: str
) -> Offer | None:
    """Vybere nejlevnější let a přepočte cenu na osobu. Prázdný seznam → None."""
    priced = [(price, airlines) for price, airlines in prices if price > 0]
    if not priced:
        return None
    total_price, airlines = min(priced, key=lambda pair: pair[0])
    return Offer(
        origin=origin,
        return_date=return_date,
        price_per_person=math.ceil(total_price / nastaveni.PASSENGERS),
        airlines=airlines,
        url=url,
    )


def get_offer(origin: str, return_date: str, fetch=fetch_html) -> Offer | None:
    """Zjistí nejlevnější nabídku. None = Google žádný let nenašel.

    Parametr `fetch` jde v testech nahradit falešnou funkcí, aby testy nešly na internet.
    """
    query = build_query(origin, return_date)
    prices = extract_prices(fetch(query))
    return cheapest_offer(origin, return_date, prices, query.url())
