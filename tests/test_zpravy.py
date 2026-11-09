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


def test_souhrnna_zprava_ma_nejlevnejsi_v_titulku_i_nahore():
    offers = {"VIE 2027-05-12": offer("VIE", "2027-05-12", 1963), "KRK 2027-05-13": offer("KRK", "2027-05-13", 1800)}
    changes = [Change(ChangeKind.CHEAPER, "VIE 2027-05-12", offer("VIE", "2027-05-12", 2113), offers["VIE 2027-05-12"])]

    message = zpravy.changes_message(changes, offers)

    assert message.title == "💰 Změna ceny · od 1 800 Kč/os."
    assert message.body.split("\n")[:4] == [
        "🏆 NEJLEVNĚJŠÍ TEĎ",
        "💰 1 800 Kč/os.",
        "📍 Krakov 8.–13. 5. · Vymyšlené aerolinky",
        zpravy.SEPARATOR,
    ]
    assert message.body.split("\n")[4:] == ["Změny cen:", "📉 Vídeň 8.–12. 5.: 1 963 Kč/os. (Vymyšlené aerolinky), −150 Kč"]


def test_prehled_ma_nejlevnejsi_nahore_pak_vsechny_od_nejlevnejsi():
    offers = {
        "PRG 2027-05-12": offer("PRG", "2027-05-12", 4000),
        "KRK 2027-05-12": offer("KRK", "2027-05-12", 2000),
        "BTS 2027-05-12": None,
        "BTS 2027-05-13": None,
    }

    message = zpravy.overview_message("☀️ Ranní přehled", offers)

    lines = message.body.split("\n")
    assert message.title == "☀️ Ranní přehled · od 2 000 Kč/os."
    assert lines[0] == "🏆 NEJLEVNĚJŠÍ TEĎ"
    assert lines[4] == "Všechny ceny:"
    assert lines[5].startswith("Krakov")
    assert lines[6].startswith("Praha")
    assert lines[-1] == "Bez letů: Bratislava"


def test_prehled_s_varovanim_ho_da_na_zacatek():
    message = zpravy.overview_message("Přehled", {"PRG 2027-05-12": offer("PRG", "2027-05-12", 4000)}, warning="⚠️ Pozor")

    assert message.body.startswith("⚠️ Pozor")


def test_prehled_bez_letu():
    message = zpravy.overview_message("Přehled", {"BTS 2027-05-12": None})

    assert message.title == "Přehled"
    assert message.body.startswith("Zatím žádné lety.")


def test_poplach_krici_a_ma_nejvyssi_prioritu():
    offers = {
        "KRK 2027-05-13": offer("KRK", "2027-05-13", 1890),
        "VIE 2027-05-12": offer("VIE", "2027-05-12", 1990),
        "PRG 2027-05-12": offer("PRG", "2027-05-12", 4000),
    }

    message = zpravy.alert_message(offers, 2000)

    assert message.priority == 5
    assert message.title == "🚨🚨 POD 2 000 Kč! 1 890 Kč/os. 🚨🚨"
    assert "‼️ CENA POD 2 000 KČ ‼️" in message.body
    assert "📍 Krakov 8.–13. 5. · Vymyšlené aerolinky" in message.body
    assert "Další pod 2 000 Kč:" in message.body
    assert "Vídeň" in message.body
    assert "Praha" not in message.body  # 4 000 Kč není pod hranicí
    assert "👉👉 KUP HNED na Kiwi 👈👈" in message.body


def test_ranni_prehled_ma_vysokou_prioritu_aby_vyskocil():
    message = zpravy.overview_message("☀️ Ranní přehled", {"PRG 2027-05-12": offer("PRG", "2027-05-12", 4000)})

    assert message.priority == 4


def test_hodinova_kontrola_ma_normalni_prioritu():
    message = zpravy.hourly_message({"PRG 2027-05-12": offer("PRG", "2027-05-12", 4000)})

    assert message.priority == 3


def test_hodinova_kontrola_ukaze_nejlevnejsi_a_vsechna_letiste():
    offers = {
        "KRK 2027-05-13": offer("KRK", "2027-05-13", 2656),
        "PRG 2027-05-12": offer("PRG", "2027-05-12", 4488),
        "BTS 2027-05-12": None,
    }

    message = zpravy.hourly_message(offers)

    assert message.title == "🕐 Hodinová kontrola · od 2 656 Kč/os."
    assert message.body.split("\n") == [
        "🏆 NEJLEVNĚJŠÍ TEĎ",
        "💰 2 656 Kč/os.",
        "📍 Krakov 8.–13. 5. · Vymyšlené aerolinky",
        zpravy.SEPARATOR,
        "Všechny ceny:",
        "Krakov 8.–13. 5.: 2 656 Kč/os. (Vymyšlené aerolinky)",
        "Praha 8.–12. 5.: 4 488 Kč/os. (Vymyšlené aerolinky)",
        "",
        "Bez letů: Bratislava",
        "",
        "Beze změny od minulé kontroly.",
    ]


def test_hodinova_kontrola_bez_letu():
    message = zpravy.hourly_message({"BTS 2027-05-12": None})

    assert message.title == "🕐 Hodinová kontrola"
    assert message.body.startswith("Zatím žádné lety.")


def test_varovani_obsahuje_duvod_chyby():
    message = zpravy.failure_message(14, "Google nevrátil výsledky hledání")

    assert message.body.endswith("Důvod: Google nevrátil výsledky hledání")


def test_varovani_bez_duvodu():
    assert "Důvod" not in zpravy.failure_message(14).body
