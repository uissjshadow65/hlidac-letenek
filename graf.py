"""📈 Historie cen a graf jejich vývoje (obrázek PNG, který se přiloží k notifikaci)."""

import io
from datetime import datetime, timedelta

import nastaveni
from ceny import Offer
from zpravy import format_price


def history_entry(now: datetime, offers: dict[str, Offer | None]) -> dict:
    """Jeden bod historie: pro každé letiště nejlevnější cena za osobu (přes všechna data návratu)."""
    prices: dict[str, int] = {}
    for offer in offers.values():
        if offer is not None:
            prices[offer.origin] = min(prices.get(offer.origin, offer.price_per_person), offer.price_per_person)
    return {"time": now.isoformat(timespec="minutes"), "prices": dict(sorted(prices.items()))}


def add_to_history(history: list[dict], now: datetime, offers: dict[str, Offer | None]) -> list[dict]:
    """Přidá aktuální ceny a zahodí body starší než HISTORY_DAYS."""
    oldest = now - timedelta(days=nastaveni.HISTORY_DAYS)
    kept = [entry for entry in history if datetime.fromisoformat(entry["time"]) >= oldest]
    return kept + [history_entry(now, offers)]


def cheapest_at(entry: dict) -> int | None:
    return min(entry["prices"].values(), default=None)


def trend_line(history: list[dict], now: datetime) -> str | None:
    """Text "📉 Za 24 h: −150 Kč (2 817 → 2 667 Kč/os.)" – jak se změnila nejlevnější cena.

    Porovná s nejstarším bodem v posledních TREND_HOURS hodinách. Bez starších dat vrátí None.
    """
    since = now - timedelta(hours=nastaveni.TREND_HOURS)
    older = [e for e in history if datetime.fromisoformat(e["time"]) >= since and cheapest_at(e) is not None]
    if len(older) < 2:
        return None
    before, after = cheapest_at(older[0]), cheapest_at(older[-1])
    difference = after - before
    if difference < 0:
        icon, change = "📉", f"−{format_price(-difference)} (zlevnění)"
    elif difference > 0:
        icon, change = "📈", f"+{format_price(difference)} (zdražení)"
    else:
        icon, change = "➡️", "beze změny"
    return f"{icon} Za {nastaveni.TREND_HOURS} h: {change}, {format_price(before)} → {format_price(after)}/os."


def chart_png(history: list[dict]) -> bytes | None:
    """Nakreslí graf vývoje cen. Vrátí PNG, nebo None, když ještě nejsou aspoň 2 body."""
    points = [e for e in history if e["prices"]]
    if len(points) < 2:
        return None

    import matplotlib  # až tady: import trvá a bez grafu ho nepotřebujeme

    matplotlib.use("Agg")  # kreslí rovnou do souboru, bez okna
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt

    times = [datetime.fromisoformat(e["time"]) for e in points]
    figure, axes = plt.subplots(figsize=(10, 6), dpi=110)

    # Tenké čáry: každé letiště zvlášť.
    for origin, name in nastaveni.ORIGINS.items():
        prices = [e["prices"].get(origin) for e in points]
        if any(p is not None for p in prices):
            axes.plot(times, [float("nan") if p is None else p for p in prices], linewidth=1.2, alpha=0.6, label=name)

    # Tlustá čára: nejlevnější ze všech – to je ten hlavní trend.
    cheapest = [cheapest_at(e) for e in points]
    axes.plot(times, cheapest, color="black", linewidth=3, label="Nejlevnější", zorder=5)
    axes.annotate(
        format_price(cheapest[-1]),
        (times[-1], cheapest[-1]),
        textcoords="offset points",
        xytext=(6, -4),
        fontsize=11,
        fontweight="bold",
    )

    limit = nastaveni.ALERT_PRICE_PER_PERSON
    axes.axhline(limit, color="red", linestyle="--", linewidth=1.5, label=f"Poplach ({format_price(limit)})")

    axes.set_title("Vývoj cen letenek do Paříže (Kč za osobu)", fontsize=14)
    axes.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}".replace(",", " ")))
    axes.xaxis.set_major_formatter(mdates.DateFormatter("%d. %m.\n%H:%M", tz=times[-1].tzinfo))
    axes.grid(True, alpha=0.3)
    axes.legend(loc="upper left", bbox_to_anchor=(1.01, 1), fontsize=10)
    figure.tight_layout()

    buffer = io.BytesIO()
    figure.savefig(buffer, format="png")
    plt.close(figure)
    return buffer.getvalue()


def chart_due(last_chart: str | None, now: datetime) -> bool:
    """Je čas poslat graf? (jednou za CHART_EVERY_HOURS; 15 min rezerva, běhy nejsou přesně na minutu)"""
    if last_chart is None:
        return True
    elapsed = now - datetime.fromisoformat(last_chart)
    return elapsed >= timedelta(hours=nastaveni.CHART_EVERY_HOURS) - timedelta(minutes=15)
