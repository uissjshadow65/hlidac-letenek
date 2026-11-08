"""Testy textů notifikací – vymyšlené ceny."""

import zpravy
from ceny import Offer
from porovnani import Change, ChangeKind


def offer(origin: str, return_date: str, price: int, airline: str = "Vymyšlené aerolinky") -> Offer:
    return Offer(origin, return_date, price, (airline,), url=f"https://example.test/{origin}")


def test_cena_s_mezerou_mezi_tisici():
    assert zpravy.format_price(2656) == "2 656 Kč"
    assert zpravy.format_price(950) == "950 Kč"


def test_termin_cesty():
    assert zpravy.format_trip("2027-05-12") == "8.–12. 5."


def test_radek_se_zlevnenim():
    change = Change(ChangeKind.CHEAPER, "VIE 2027-05-12", offer("VIE", "2027-05-12", 2113), offer("VIE", "2027-05-12", 1963))

    assert zpravy.format_change(change) == "📉 Vídeň 8.–12. 5.: 1 963 Kč/os. (Vymyšlené aerolinky), −150 Kč"


def test_radek_se_zdrazenim():
    change = Change(ChangeKind.PRICIER, "PRG 2027-05-13", offer("PRG", "2027-05-13", 2155), offer("PRG", "2027-05-13", 2240))

    assert zpravy.format_change(change) == "📈 Praha 8.–13. 5.: 2 240 Kč/os. (Vymyšlené aerolinky), +85 Kč"


def test_radek_novy_let_a_zmizely_let():
    new = Change(ChangeKind.NEW, "BTS 2027-05-12", None, offer("BTS", "2027-05-12", 3000))
    gone = Change(ChangeKind.GONE, "KTW 2027-05-12", offer("KTW", "2027-05-12", 6000), None)

    assert zpravy.format_change(new).startswith("✈️ Nový let – Bratislava")
    assert zpravy.format_change(gone) == "❌ Katovice 8.–12. 5.: let už není v nabídce (byl 6 000 Kč/os.)"


def test_souhrnna_zprava_ukaze_nejlevnejsi_a_odkaz_na_nej():
    offers = {"VIE 2027-05-12": offer("VIE", "2027-05-12", 1963), "KRK 2027-05-13": offer("KRK", "2027-05-13", 1800)}
    changes = [Change(ChangeKind.CHEAPER, "VIE 2027-05-12", offer("VIE", "2027-05-12", 2113), offers["VIE 2027-05-12"])]

    message = zpravy.changes_message(changes, offers)

    assert message.body.endswith("Nejlevnější teď: Krakov 8.–13. 5.: 1 800 Kč/os. (Vymyšlené aerolinky)")
    assert message.click_url == "https://example.test/KRK"


def test_prehled_seradi_od_nejlevnejsi_a_vypise_letiste_bez_letu():
    offers = {
        "PRG 2027-05-12": offer("PRG", "2027-05-12", 4000),
        "KRK 2027-05-12": offer("KRK", "2027-05-12", 2000),
        "BTS 2027-05-12": None,
        "BTS 2027-05-13": None,
    }

    message = zpravy.overview_message("Přehled", offers)

    lines = message.body.split("\n")
    assert lines[0].startswith("Krakov")
    assert lines[1].startswith("Praha")
    assert lines[-1] == "Bez letů: Bratislava"


def test_prehled_s_varovanim_ho_da_na_zacatek():
    message = zpravy.overview_message("Přehled", {"PRG 2027-05-12": offer("PRG", "2027-05-12", 4000)}, warning="⚠️ Pozor")

    assert message.body.startswith("⚠️ Pozor")


def test_prehled_bez_letu():
    message = zpravy.overview_message("Přehled", {"BTS 2027-05-12": None})

    assert message.body.startswith("Zatím žádné lety.")
    assert message.click_url is None
