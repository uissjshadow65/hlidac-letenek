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


# Barvy ve stylu telemetrie: tmavý podklad, svítivé stopy.
BACKGROUND = "#0b0f14"
PANEL = "#11161d"
GRID = "#243040"
TEXT = "#c9d4e0"
TRACE_COLORS = ["#00e5ff", "#ff2bd6", "#39ff14", "#ffb000", "#8a7dff", "#ff5c5c", "#00ffa8"]
BEST_COLOR = "#ffffff"
FASTER = "#39ff14"  # zlevnění = zelená (jako rychlejší kolo)
SLOWER = "#ff3b3b"  # zdražení = červená


def chart_png(history: list[dict]) -> bytes | None:
    """Nakreslí graf ve stylu telemetrie z auta. Vrátí PNG, nebo None, když nejsou aspoň 2 body.

    Nahoře: stopy všech letišť přes sebe, nejlevnější svítí bíle.
    Dole: delta stopa – o kolik je nejlevnější cena jinde než na začátku grafu
    (pod nulou zeleně = zlevnilo, nad nulou červeně = zdražilo).
    """
    points = [e for e in history if e["prices"]]
    if len(points) < 2:
        return None

    import matplotlib  # až tady: import trvá a bez grafu ho nepotřebujeme

    matplotlib.use("Agg")  # kreslí rovnou do souboru, bez okna
    import matplotlib.dates as mdates
    import matplotlib.patheffects as effects
    import matplotlib.pyplot as plt
    import matplotlib.transforms
    from matplotlib.ticker import FuncFormatter

    times = [datetime.fromisoformat(e["time"]) for e in points]
    cheapest = [cheapest_at(e) for e in points]
    delta = [price - cheapest[0] for price in cheapest]
    thousands = FuncFormatter(lambda v, _: f"{v:,.0f}".replace(",", " "))

    figure, (top, bottom) = plt.subplots(
        2, 1, figsize=(10, 7), dpi=110, sharex=True, gridspec_kw={"height_ratios": [3, 1], "hspace": 0.08}
    )
    figure.patch.set_facecolor(BACKGROUND)
    for axes in (top, bottom):
        axes.set_facecolor(PANEL)
        axes.grid(True, color=GRID, linewidth=0.7)
        axes.tick_params(colors=TEXT, labelsize=9)
        for spine in axes.spines.values():
            spine.set_color(GRID)
        axes.yaxis.set_major_formatter(thousands)
        axes.yaxis.tick_right()  # čísla vpravo jako na displeji

    # Stopy letišť přes sebe; jméno a cena na konci každé stopy místo legendy.
    labels = []
    for (origin, name), color in zip(nastaveni.ORIGINS.items(), TRACE_COLORS):
        prices = [e["prices"].get(origin) for e in points]
        if all(p is None for p in prices):
            continue
        values = [float("nan") if p is None else p for p in prices]
        line, = top.plot(times, values, color=color, linewidth=1.6, alpha=0.9)
        line.set_path_effects([effects.Stroke(linewidth=6, alpha=0.15, foreground=color), effects.Normal()])
        last = next((p for p in reversed(prices) if p is not None), None)
        if last is not None:
            labels.append((last, f"{name} {format_price(last)}", color))

    # Nejlevnější: bílá svítící stopa, čárkovaně, ať je vidět i letiště pod ní.
    best, = top.plot(times, cheapest, color=BEST_COLOR, linewidth=2.2, linestyle=(0, (4, 2)), zorder=5)
    best.set_path_effects([effects.Stroke(linewidth=9, alpha=0.2, foreground=BEST_COLOR), effects.Normal()])

    limit = nastaveni.ALERT_PRICE_PER_PERSON
    top.axhline(limit, color=SLOWER, linestyle=":", linewidth=1.4)
    top.text(times[0], limit, f" POPLACH {format_price(limit)}", color=SLOWER, fontsize=8, va="bottom")

    # Popisky na konci stop (vpravo za grafem), rozestrčené, ať se nepřekrývají.
    low, high = top.get_ylim()
    gap = (high - low) * 0.06
    beside = matplotlib.transforms.blended_transform_factory(top.transAxes, top.transData)
    previous = None
    for value, text, color in sorted(labels):
        y = value if previous is None else max(value, previous + gap)
        previous = y
        top.text(1.09, y, text, transform=beside, color=color, fontsize=9, va="center")
    figure.subplots_adjust(left=0.03, right=0.70, top=0.9, bottom=0.1)

    # Delta stopa.
    bottom.axhline(0, color=TEXT, linewidth=0.8, alpha=0.6)
    bottom.fill_between(times, delta, 0, where=[d <= 0 for d in delta], color=FASTER, alpha=0.25, interpolate=True)
    bottom.fill_between(times, delta, 0, where=[d >= 0 for d in delta], color=SLOWER, alpha=0.25, interpolate=True)
    bottom.plot(times, delta, color=FASTER if delta[-1] <= 0 else SLOWER, linewidth=1.8)
    bottom.set_ylabel("Δ Kč", color=TEXT, fontsize=9)
    sign = "−" if delta[-1] < 0 else "+"
    bottom.text(1.09, 0.5, f"Δ {sign}{format_price(abs(delta[-1]))}", transform=bottom.transAxes,
                color=FASTER if delta[-1] <= 0 else SLOWER, fontsize=12, fontweight="bold", va="center")
    bottom.xaxis.set_major_formatter(mdates.DateFormatter("%d. %m.\n%H:%M", tz=times[-1].tzinfo))

    # Hlavička jako na displeji: nejlevnější cena velkým písmem.
    figure.text(0.03, 0.95, "LETENKY → PAŘÍŽ  |  KČ ZA OSOBU", color=TEXT, fontsize=10, family="monospace")
    figure.text(0.70, 0.95, f"BEST {format_price(cheapest[-1])}", color=BEST_COLOR, fontsize=16,
                fontweight="bold", family="monospace", ha="right")

    buffer = io.BytesIO()
    figure.savefig(buffer, format="png", facecolor=BACKGROUND)
    plt.close(figure)
    return buffer.getvalue()


def chart_due(last_chart: str | None, now: datetime) -> bool:
    """Je čas poslat graf? (jednou za CHART_EVERY_HOURS; 15 min rezerva, běhy nejsou přesně na minutu)"""
    if last_chart is None:
        return True
    elapsed = now - datetime.fromisoformat(last_chart)
    return elapsed >= timedelta(hours=nastaveni.CHART_EVERY_HOURS) - timedelta(minutes=15)
