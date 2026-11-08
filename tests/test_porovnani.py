"""Testy porovnání cen – jen vymyšlené ceny."""

from ceny import Offer
from porovnani import ChangeKind, compare, offer_key

KEY = "VIE 2027-05-12"


def offer(price: int, airline: str = "Vymyšlené aerolinky") -> Offer:
    return Offer(origin="VIE", return_date="2027-05-12", price_per_person=price, airlines=(airline,), url="")


def test_klic_kombinace():
    assert offer_key("VIE", "2027-05-12") == KEY


def test_zlevneni_o_150_kc():
    changes = compare({KEY: offer(2100)}, {KEY: offer(1950)})

    assert len(changes) == 1
    assert changes[0].kind == ChangeKind.CHEAPER
    assert changes[0].difference == -150


def test_zdrazeni_o_85_kc():
    changes = compare({KEY: offer(2155)}, {KEY: offer(2240)})

    assert changes[0].kind == ChangeKind.PRICIER
    assert changes[0].difference == 85


def test_hlasi_i_zmenu_o_jednu_korunu():
    changes = compare({KEY: offer(2000)}, {KEY: offer(1999)})

    assert [change.kind for change in changes] == [ChangeKind.CHEAPER]


def test_stejna_cena_neni_zmena():
    assert compare({KEY: offer(2000)}, {KEY: offer(2000)}) == []


def test_jina_aerolinka_za_stejnou_cenu_neni_zmena():
    assert compare({KEY: offer(2000, "První")}, {KEY: offer(2000, "Druhá")}) == []


def test_novy_let_tam_kde_driv_zadny_nebyl():
    changes = compare({KEY: None}, {KEY: offer(3000)})

    assert changes[0].kind == ChangeKind.NEW
    assert changes[0].new.price_per_person == 3000
    assert changes[0].difference == 0


def test_let_zmizel():
    changes = compare({KEY: offer(3000)}, {KEY: None})

    assert changes[0].kind == ChangeKind.GONE
    assert changes[0].old.price_per_person == 3000


def test_porad_zadny_let_neni_zmena():
    assert compare({KEY: None}, {KEY: None}) == []


def test_kombinace_poprve_zkontrolovana_se_jen_zapamatuje():
    assert compare({}, {KEY: offer(2000)}) == []


def test_selhany_dotaz_neni_let_zmizel():
    # Dotaz na KEY v tomto běhu selhal, proto v nových cenách chybí.
    assert compare({KEY: offer(2000)}, {}) == []


def test_vice_zmen_najednou():
    old = {KEY: offer(2000), "PRG 2027-05-12": offer(4000), "KRK 2027-05-13": offer(2600)}
    new = {KEY: offer(1900), "PRG 2027-05-12": offer(4000), "KRK 2027-05-13": offer(2700)}

    changes = compare(old, new)

    assert {(change.key, change.kind) for change in changes} == {
        (KEY, ChangeKind.CHEAPER),
        ("KRK 2027-05-13", ChangeKind.PRICIER),
    }
