"""Testy zjišťování cen – jen vymyšlená data, nikdy skutečný internet."""

import json

import pytest

import ceny


def fake_item(total_price: int | None, airline: str) -> list:
    """Jeden vymyšlený let ve stejném tvaru, jaký posílá Google: [[typ, [aerolinky]], [[None, cena]]]."""
    return [["", [airline]], [[None, total_price]]]


def fake_page(best: list | None, other: list | None) -> str:
    """Vymyšlená stránka Google Letů. best = "Nejlepší lety", other = "Ostatní lety"."""
    payload = [None, None, [best] if best is not None else None, [other] if other is not None else None]
    payload += [None] * 20
    return (
        '<html><script class="ds:1" nonce="x">AF_initDataCallback({key: \'ds:1\', hash: \'1\', data:'
        + json.dumps(payload)
        + ", sideChannel: {}});</script></html>"
    )


def test_cte_lety_z_obou_seznamu():
    html = fake_page(best=[fake_item(6600, "Levné aerolinky")], other=[fake_item(9000, "Drahé aerolinky")])

    assert ceny.extract_prices(html) == [(6600, ("Levné aerolinky",)), (9000, ("Drahé aerolinky",))]


def test_nejlevnejsi_let_v_seznamu_nejlepsi_neni_prehlednut():
    html = fake_page(best=[fake_item(6600, "Levné")], other=[fake_item(9200, "Dražší"), fake_item(9800, "Nejdražší")])

    offer = ceny.get_offer("KRK", "2027-05-12", fetch=lambda query: html)

    assert offer.price_per_person == 3300
    assert offer.airlines == ("Levné",)


def test_vybere_nejlevnejsi_let_a_vydeli_cenu_dvema():
    prices = [(9000, ("Drahé",)), (4200, ("Levné",)), (6000, ("Střední",))]

    offer = ceny.cheapest_offer("VIE", "2027-05-12", prices, "https://example.test")

    assert offer.price_per_person == 2100
    assert offer.airlines == ("Levné",)
    assert offer.origin == "VIE"
    assert offer.return_date == "2027-05-12"


def test_licha_celkova_cena_se_zaokrouhli_nahoru():
    offer = ceny.cheapest_offer("PRG", "2027-05-12", [(4201, ("X",))], "")

    assert offer.price_per_person == 2101


def test_let_bez_ceny_se_preskoci():
    html = fake_page(best=[fake_item(None, "Bez ceny"), fake_item(5000, "S cenou")], other=None)

    assert ceny.extract_prices(html) == [(5000, ("S cenou",))]


def test_zadne_lety_vrati_none():
    offer = ceny.get_offer("BTS", "2027-05-12", fetch=lambda query: fake_page(best=None, other=None))

    assert offer is None


def test_stranka_se_souhlasem_vyhodi_pricefetcherror():
    def fake_fetch(query):
        return "<html><title>Než budete pokračovat</title></html>"

    with pytest.raises(ceny.PriceFetchError):
        ceny.get_offer("PRG", "2027-05-12", fetch=fake_fetch)


def test_chybovy_stav_googlu_je_selhany_dotaz_ne_zadny_let():
    page = '<script class="ds:1">AF_initDataCallback({data:[null], errorHasStatus: true, sideChannel: {}});</script>'

    with pytest.raises(ceny.PriceFetchError, match="chybový stav"):
        ceny.extract_prices(page)


def test_zmena_struktury_stranky_vyhodi_pricefetcherror():
    broken = '<script class="ds:1">AF_initDataCallback({data:[1, 2], sideChannel: {}});</script>'

    with pytest.raises(ceny.PriceFetchError):
        ceny.extract_prices(broken)


def test_odkaz_vede_do_google_letu():
    offer = ceny.get_offer("PRG", "2027-05-13", fetch=lambda query: fake_page(best=[fake_item(5000, "A")], other=None))

    assert offer.url.startswith("https://www.google.com/travel/flights/search?tfs=")
