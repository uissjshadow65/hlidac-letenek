"""Nastavení hlídače – všechno, co se dá měnit, je na jednom místě."""

# Odletová letiště (kódy IATA) a jejich názvy do zpráv.
ORIGINS = {
    "PRG": "Praha",
    "VIE": "Vídeň",
    "BTS": "Bratislava",
    "KRK": "Krakov",
    "BRQ": "Brno",
    "KTW": "Katovice",
    "OSR": "Ostrava",
}

DESTINATION = "PAR"  # Paříž – všechna letiště (CDG, ORY, BVA)
DEPARTURE_DATE = "2027-05-08"
RETURN_DATES = ["2027-05-12", "2027-05-13"]

PASSENGERS = 2  # ptáme se na cenu pro 2, ve zprávě ukazujeme cenu za osobu
CURRENCY = "CZK"

# 🚨 Poplach: když cena za osobu klesne POD tuto hranici, přijde zvláštní "křičící" notifikace
# s nejvyšší prioritou. Znovu přijde jen při dalším zlevnění, nebo když cena hranici
# překročí a pak pod ni zase spadne.
ALERT_PRICE_PER_PERSON = 2000

# Priorita notifikací v ntfy (1 = nejnižší … 5 = poplach).
# 3 = "normální": v mobilu se často jen tiše uloží do lišty (Android ji nevyhodí jako
# vyskakovací okno, iPhone ji může schovat do souhrnu nebo ztlumit v režimu Spánek/Soustředění).
# 4 = "vysoká": vyskočí na displeji a na iPhonu je "časově citlivá", takže projde i přes souhrn.
PRIORITY_IMPORTANT = 4  # ranní přehled, změna ceny, spuštění, výpadek a obnovení
PRIORITY_HOURLY = 4  # hodinová kontrola – taky vyskočí, ať je vidět každou hodinu

# 📈 Graf vývoje cen: přiloží se ke zprávě s cenami jednou za tolik hodin.
CHART_EVERY_HOURS = 6
HISTORY_DAYS = 30  # jak dlouho zpátky si pamatujeme ceny (a kolik ukáže graf)
TREND_HOURS = 24  # ve zprávě s grafem: o kolik se změnila nejlevnější cena za tuto dobu

TIMEZONE = "Europe/Prague"
DAILY_REPORT_HOUR = 8  # ranní přehled při prvním běhu po 8:00
PAUSE_SECONDS = (3, 8)  # náhodná pauza mezi dotazy na Google (od, do)
