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

TIMEZONE = "Europe/Prague"
DAILY_REPORT_HOUR = 8  # ranní přehled při prvním běhu po 8:00
PAUSE_SECONDS = (3, 8)  # náhodná pauza mezi dotazy na Google (od, do)
