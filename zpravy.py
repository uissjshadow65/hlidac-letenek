"""Texty notifikací – čistá logika: dostane ceny, vrátí text. Nic neodesílá."""

from dataclasses import dataclass

import nastaveni
from ceny import Offer
from porovnani import Change, ChangeKind


@dataclass(frozen=True)
class Message:
    title: str
    body: str
    click_url: str | None = None  # klepnutí na notifikaci otevře tento odkaz


def format_price(price: int) -> str:
    """2656 → "2 656 Kč"."""
    return f"{price:,}".replace(",", " ") + " Kč"


def format_trip(return_date: str) -> str:
    """"2027-05-12" → "8.–12. 5." (odlet je pevný z nastavení)."""
    _, dep_month, dep_day = nastaveni.DEPARTURE_DATE.split("-")
    _, ret_month, ret_day = return_date.split("-")
    if dep_month == ret_month:
        return f"{int(dep_day)}.–{int(ret_day)}. {int(ret_month)}."
    return f"{int(dep_day)}. {int(dep_month)}.–{int(ret_day)}. {int(ret_month)}."


def origin_name(origin: str) -> str:
    return nastaveni.ORIGINS.get(origin, origin)


def format_offer(offer: Offer) -> str:
    """"Krakov 8.–13. 5.: 2 656 Kč/os. (Ryanair)"."""
    airlines = ", ".join(offer.airlines)
    return f"{origin_name(offer.origin)} {format_trip(offer.return_date)}: {format_price(offer.price_per_person)}/os. ({airlines})"


def format_change(change: Change) -> str:
    """Jeden řádek o změně."""
    if change.kind == ChangeKind.NEW:
        return f"✈️ Nový let – {format_offer(change.new)}"
    if change.kind == ChangeKind.GONE:
        old = change.old
        return (
            f"❌ {origin_name(old.origin)} {format_trip(old.return_date)}: let už není v nabídce "
            f"(byl {format_price(old.price_per_person)}/os.)"
        )
    sign = "−" if change.difference < 0 else "+"
    icon = "📉" if change.kind == ChangeKind.CHEAPER else "📈"
    return f"{icon} {format_offer(change.new)}, {sign}{format_price(abs(change.difference))}"


def cheapest(offers: dict[str, Offer | None]) -> Offer | None:
    """Nejlevnější ze všech kombinací (None, když není žádný let)."""
    available = [offer for offer in offers.values() if offer is not None]
    return min(available, key=lambda offer: offer.price_per_person) if available else None


SEPARATOR = "━━━━━━━━━━━━━━"


def title_with_best(prefix: str, best: Offer | None) -> str:
    """Titulek s nejlevnější cenou hned na začátku, aby byla vidět i na zamčené obrazovce.

    Např. "💰 Změna ceny · od 1 990 Kč/os."
    """
    if best is None:
        return prefix
    return f"{prefix} · od {format_price(best.price_per_person)}/os."


def best_block(best: Offer) -> list[str]:
    """Zvýrazněný blok s nejlevnější nabídkou – vždy úplně nahoře ve zprávě."""
    return [
        "🏆 NEJLEVNĚJŠÍ TEĎ",
        f"💰 {format_price(best.price_per_person)}/os.",
        f"📍 {origin_name(best.origin)} {format_trip(best.return_date)} · {', '.join(best.airlines)}",
        SEPARATOR,
    ]


def changes_message(changes: list[Change], offers: dict[str, Offer | None]) -> Message:
    """Souhrnná zpráva o všech změnách v jednom běhu. Nejlevnější nabídka je nahoře."""
    best = cheapest(offers)
    lines = best_block(best) if best else []
    lines += ["Změny cen:"] + [format_change(change) for change in changes]
    return Message(
        title=title_with_best("💰 Změna ceny", best),
        body="\n".join(lines),
        click_url=best.url if best else None,
    )


def overview_message(title: str, offers: dict[str, Offer | None], warning: str | None = None) -> Message:
    """Přehled všech kombinací od nejlevnější (ranní hlášení a první spuštění)."""
    available = sorted((o for o in offers.values() if o is not None), key=lambda o: o.price_per_person)
    best = available[0] if available else None
    lines = [warning, ""] if warning else []
    if best:
        lines += best_block(best) + ["Všechny ceny:"]
    lines += [format_offer(offer) for offer in available] or ["Zatím žádné lety."]

    # Letiště, odkud nevede žádný let pro žádné datum návratu.
    origins_with_flight = {offer.origin for offer in available}
    origins_checked = {key.split(" ")[0] for key in offers}
    without = [origin_name(o) for o in nastaveni.ORIGINS if o in origins_checked - origins_with_flight]
    if without:
        lines += ["", "Bez letů: " + ", ".join(without)]

    return Message(title=title_with_best(title, best), body="\n".join(lines), click_url=best.url if best else None)


def failure_message(failed: int) -> Message:
    return Message(
        title="⚠️ Hlídač letenek nefunguje",
        body=(
            f"Ani jeden z {failed} dotazů na Google Lety neprošel. "
            "Zkusím to znovu za hodinu, a až to zase pojede, dám vědět."
        ),
    )


def recovery_message() -> Message:
    return Message(title="✅ Hlídač letenek zase funguje", body="Ceny se opět daří zjišťovat.")
