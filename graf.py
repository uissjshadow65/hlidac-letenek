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


def signed_price(value: int) -> str:
    """−120 → "−120 Kč", 80 → "+80 Kč", 0 → "±0 Kč"."""
    sign = "−" if value < 0 else "+" if value > 0 else "±"
    return sign + format_price(abs(value))


def change_color(value: int) -> str:
    return FASTER if value < 0 else SLOWER if value > 0 else TEXT


def chart_png(history: list[dict]) -> bytes | None:
    """Nakreslí graf ve stylu telemetrie z auta. Vrátí PNG, nebo None, když nejsou aspoň 2 body.

    Aby byly vidět i malé změny, neukazuje celé ceny na jedné ose (6 000 vs. 2 600 Kč
    by změnu o 100 Kč úplně schovalo), ale:
    Nahoře: o kolik se změnila cena každého letiště od začátku grafu (všechna letiště přes sebe kolem nuly).
    Dole: nejlevnější cena s přiblíženou osou a popiskem u každé změny.
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
    total = cheapest[-1] - cheapest[0]
    thousands = FuncFormatter(lambda v, _: f"{v:+,.0f}".replace(",", " ").replace("-", "−") if v else "0")
    plain = FuncFormatter(lambda v, _: f"{v:,.0f}".replace(",", " "))

    figure, (top, bottom) = plt.subplots(
        2, 1, figsize=(10, 8), dpi=110, sharex=True, gridspec_kw={"height_ratios": [3, 2], "hspace": 0.12}
    )
    figure.patch.set_facecolor(BACKGROUND)
    for axes in (top, bottom):
        axes.set_facecolor(PANEL)
        axes.grid(True, color=GRID, linewidth=0.7)
        axes.tick_params(colors=TEXT, labelsize=9)
        for spine in axes.spines.values():
            spine.set_color(GRID)
        axes.yaxis.tick_right()  # čísla vpravo jako na displeji
    top.yaxis.set_major_formatter(thousands)
    bottom.yaxis.set_major_formatter(plain)

    def glow(line, color, width):
        line.set_path_effects([effects.Stroke(linewidth=width, alpha=0.2, foreground=color), effects.Normal()])

    # --- Nahoře: změna ceny každého letiště od jeho první ceny v grafu ---
    top.axhline(0, color=TEXT, linewidth=1, alpha=0.6)
    labels = []
    biggest = 0
    for (origin, name), color in zip(nastaveni.ORIGINS.items(), TRACE_COLORS):
        prices = [e["prices"].get(origin) for e in points]
        known = [p for p in prices if p is not None]
        if not known:
            continue
        deltas = [float("nan") if p is None else p - known[0] for p in prices]
        biggest = max(biggest, max(abs(p - known[0]) for p in known))
        line, = top.plot(times, deltas, color=color, linewidth=2.2, drawstyle="steps-post")
        glow(line, color, 8)
        changed = [i for i in range(1, len(prices)) if prices[i] is not None and prices[i - 1] is not None and prices[i] != prices[i - 1]]
        top.scatter([times[i] for i in changed], [deltas[i] for i in changed], color=color, s=22, zorder=6)
        change = known[-1] - known[0]
        labels.append((change, f"{name:<10} {format_price(known[-1]):>9}  {signed_price(change)}", color))
    span = max(150, biggest * 1.25)  # i malá změna zabere velký kus grafu
    top.set_ylim(-span, span)
    top.text(0.01, 0.97, "ZMĚNA OD ZAČÁTKU GRAFU (Kč/os.)", transform=top.transAxes, color=TEXT,
             fontsize=9, family="monospace", va="top")
    top.text(0.01, 0.03, "▼ zlevnění", transform=top.transAxes, color=FASTER, fontsize=9, family="monospace")
    top.text(0.01, 0.90, "▲ zdražení", transform=top.transAxes, color=SLOWER, fontsize=9, family="monospace", va="top")

    # Popisky vpravo: letiště, aktuální cena a změna; rozestrčené, ať se nepřekrývají.
    beside = matplotlib.transforms.blended_transform_factory(top.transAxes, top.transData)
    gap = span * 2 * 0.075
    previous = None
    for change, text, color in sorted(labels, reverse=True):
        y = change if previous is None else min(change, previous - gap)
        previous = y
        top.text(1.09, y, text, transform=beside, color=color, fontsize=9, va="center", family="monospace")

    # --- Dole: nejlevnější cena, osa přiblížená na její rozsah ---
    low, high = min(cheapest), max(cheapest)
    pad = max(60, (high - low) * 0.35)
    bottom.set_ylim(low - pad, high + pad)
    bottom.fill_between(times, cheapest, low - pad, step="post", color=BEST_COLOR, alpha=0.06)
    bottom.plot(times, cheapest, color=BEST_COLOR, linewidth=2.6, drawstyle="steps-post")
    for i in range(1, len(times)):  # skok zeleně při zlevnění, červeně při zdražení
        if cheapest[i] != cheapest[i - 1]:
            bottom.plot([times[i], times[i]], [cheapest[i - 1], cheapest[i]],
                        color=change_color(cheapest[i] - cheapest[i - 1]), linewidth=4, zorder=5)
    changes = [i for i in range(1, len(cheapest)) if cheapest[i] != cheapest[i - 1]]
    for i in changes[-12:]:  # popisek u každé změny (u posledních 12, ať to není přeplácané)
        difference = cheapest[i] - cheapest[i - 1]
        bottom.annotate(f"{format_price(cheapest[i])}\n{signed_price(difference)}", (times[i], cheapest[i]),
                        xytext=(0, -26 if difference < 0 else 10), textcoords="offset points", ha="center",
                        color=change_color(difference), fontsize=8, family="monospace")
    limit = nastaveni.ALERT_PRICE_PER_PERSON
    if low - pad <= limit <= high + pad:
        bottom.axhline(limit, color=SLOWER, linestyle=":", linewidth=1.4)
        bottom.text(times[0], limit, f" POPLACH {format_price(limit)}", color=SLOWER, fontsize=8, va="bottom")
    else:
        bottom.text(0.99, 0.04, f"do poplachu ({format_price(limit)}) chybí {format_price(low - limit)}",
                    transform=bottom.transAxes, color=SLOWER, fontsize=8, ha="right", family="monospace")
    bottom.text(0.01, 0.95, "NEJLEVNĚJŠÍ (Kč/os.)", transform=bottom.transAxes, color=TEXT,
                fontsize=9, family="monospace", va="top")
    bottom.text(1.09, 0.5, signed_price(total), transform=bottom.transAxes, color=change_color(total),
                fontsize=15, fontweight="bold", va="center", family="monospace")
    bottom.xaxis.set_major_formatter(mdates.DateFormatter("%d. %m.\n%H:%M", tz=times[-1].tzinfo))

    figure.subplots_adjust(left=0.03, right=0.66, top=0.9, bottom=0.08)

    # Hlavička jako na displeji.
    figure.text(0.03, 0.95, "LETENKY → PAŘÍŽ  |  KČ ZA OSOBU", color=TEXT, fontsize=10, family="monospace")
    figure.text(0.97, 0.95, f"BEST {format_price(cheapest[-1])}  {signed_price(total)}", color=change_color(total),
                fontsize=16, fontweight="bold", family="monospace", ha="right")

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
