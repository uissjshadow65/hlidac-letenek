"""Testy ukládání stavu – vše v dočasné složce tmp_path."""

import pytest

from ceny import Offer
from stav import State, StateError, load_state, save_state


def test_prvni_beh_bez_souboru_vrati_prazdny_stav(tmp_path):
    state = load_state(tmp_path / "ceny.json")

    assert state == State()


def test_ulozeny_stav_jde_znovu_nacist(tmp_path):
    path = tmp_path / "ceny.json"
    original = State(
        offers={
            "VIE 2027-05-12": Offer("VIE", "2027-05-12", 1963, ("Vymyšlené aerolinky",), "https://example.test"),
            "BTS 2027-05-12": None,
        },
        failing_since="2026-11-08T14:00+01:00",
        last_daily_report="2026-11-08",
    )

    save_state(path, original)

    assert load_state(path) == original


def test_cestina_se_ulozi_citelne_v_utf8(tmp_path):
    path = tmp_path / "ceny.json"
    save_state(path, State(offers={"VIE 2027-05-12": Offer("VIE", "2027-05-12", 1, ("Aerolinky Říp",), "")}))

    assert "Aerolinky Říp" in path.read_text(encoding="utf-8")


def test_po_ulozeni_nezustane_docasny_soubor(tmp_path):
    save_state(tmp_path / "ceny.json", State())

    assert [p.name for p in tmp_path.iterdir()] == ["ceny.json"]


def test_poskozeny_soubor_vyhodi_stateerror(tmp_path):
    path = tmp_path / "ceny.json"
    path.write_text("{tohle není json", encoding="utf-8")

    with pytest.raises(StateError):
        load_state(path)


def test_starsi_soubor_bez_poplachu_jde_nacist(tmp_path):
    path = tmp_path / "ceny.json"
    path.write_text('{"offers": {}, "failing_since": null, "last_daily_report": null}', encoding="utf-8")

    assert load_state(path).alert_price is None
