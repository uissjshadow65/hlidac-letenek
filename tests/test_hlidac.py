"""Testy celého běhu hlídače – falešný Google, falešné notifikace, žádné čekání."""

from datetime import datetime
from zoneinfo import ZoneInfo

import hlidac
from ceny import Offer, PriceFetchError
from stav import State, load_state, save_state

PRAGUE = ZoneInfo("Europe/Prague")
MORNING = datetime(2026, 11, 9, 9, 0, tzinfo=PRAGUE)  # po 8:00 → ranní přehled
NIGHT = datetime(2026, 11, 9, 3, 0, tzinfo=PRAGUE)  # před 8:00 → bez přehledu


class FakeGoogle:
    """Vrací vymyšlené ceny. Ve výchozím stavu 3 000 Kč/os. všude, kromě zadaných výjimek."""

    def __init__(self, prices=None, failing=False):
        self.prices = prices or {}
        self.failing = failing

    def __call__(self, origin, return_date):
        if self.failing:
            raise PriceFetchError("vymyšlený výpadek")
        price = self.prices.get(f"{origin} {return_date}", 3000)
        if price is None:
            return None
        return Offer(origin, return_date, price, ("Vymyšlené aerolinky",), f"https://example.test/{origin}")


class FakeNotify:
    """Místo odeslání do mobilu si zprávy jen zapamatuje."""

    def __init__(self, broken=False):
        self.sent = []
        self.broken = broken

    def __call__(self, topic, title, body, click=None):
        if self.broken:
            raise OSError("vymyšlený výpadek ntfy")
        self.sent.append(title)


def run(tmp_path, google, notify, now=NIGHT):
    return hlidac.run(tmp_path / "ceny.json", "kanal", now, get_offer=google, notify=notify, sleep=lambda s: None)


def test_prvni_beh_posle_prehled_a_ulozi_vsech_14_kombinaci(tmp_path):
    notify = FakeNotify()

    assert run(tmp_path, FakeGoogle(), notify) == 0

    assert notify.sent == ["Hlídač letenek spuštěn ✈️"]
    assert len(load_state(tmp_path / "ceny.json").offers) == 14


def test_beze_zmeny_ceny_neprijde_nic(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle(), notify)

    assert notify.sent == []


def test_zmena_ceny_posle_jednu_souhrnnou_zpravu(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"VIE 2027-05-12": 2850, "KRK 2027-05-13": 3100}), notify)

    assert notify.sent == ["Změna ceny letenek do Paříže"]
    assert load_state(tmp_path / "ceny.json").offers["VIE 2027-05-12"].price_per_person == 2850


def test_selhani_vsech_dotazu_varuje_jen_jednou(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    first, second = FakeNotify(), FakeNotify()

    run(tmp_path, FakeGoogle(failing=True), first)
    run(tmp_path, FakeGoogle(failing=True), second)

    assert first.sent == ["⚠️ Hlídač letenek nefunguje"]
    assert second.sent == []


def test_po_vypadku_prijde_zprava_ze_zase_funguje(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    run(tmp_path, FakeGoogle(failing=True), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle(), notify)

    assert notify.sent == ["✅ Hlídač letenek zase funguje"]
    assert load_state(tmp_path / "ceny.json").failing_since is None


def test_pri_vypadku_zustanou_posledni_zname_ceny(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())

    run(tmp_path, FakeGoogle(failing=True), FakeNotify())

    assert load_state(tmp_path / "ceny.json").offers["PRG 2027-05-12"].price_per_person == 3000


def test_selhani_jedne_kombinace_neni_let_zmizel(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())

    def google_failing_for_prague(origin, return_date):
        if origin == "PRG":
            raise PriceFetchError("vymyšlená blokace")
        return FakeGoogle()(origin, return_date)

    notify = FakeNotify()
    run(tmp_path, google_failing_for_prague, notify)

    assert notify.sent == []


def test_neocekavana_chyba_u_jedne_kombinace_neshodi_beh(tmp_path):
    def buggy_google(origin, return_date):
        if origin == "KTW":
            raise ZeroDivisionError("vymyšlená chyba")
        return FakeGoogle()(origin, return_date)

    assert run(tmp_path, buggy_google, FakeNotify()) == 0
    assert len(load_state(tmp_path / "ceny.json").offers) == 12


def test_ranni_prehled_prijde_jednou_denne(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())  # první běh v noci
    morning, later = FakeNotify(), FakeNotify()

    run(tmp_path, FakeGoogle(), morning, now=MORNING)
    run(tmp_path, FakeGoogle(), later, now=MORNING.replace(hour=10))

    assert morning.sent == ["Ranní přehled letenek ☀️"]
    assert later.sent == []


def test_prvni_beh_rano_neposle_prehled_dvakrat(tmp_path):
    notify = FakeNotify()

    run(tmp_path, FakeGoogle(), notify, now=MORNING)

    assert notify.sent == ["Hlídač letenek spuštěn ✈️"]


def test_kdyz_notifikace_selze_stav_se_neulozi(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())

    result = run(tmp_path, FakeGoogle({"VIE 2027-05-12": 2500}), FakeNotify(broken=True))

    assert result == 1
    # Stará cena zůstala → příští běh změnu najde znovu a pošle ji.
    assert load_state(tmp_path / "ceny.json").offers["VIE 2027-05-12"].price_per_person == 3000


def test_chybejici_kanal_ntfy_vrati_kod_2(monkeypatch):
    monkeypatch.delenv("NTFY_TOPIC", raising=False)

    assert hlidac.main() == 2


def test_poskozeny_stav_vrati_kod_2(tmp_path, monkeypatch):
    (tmp_path / "ceny.json").write_text("poškozeno", encoding="utf-8")
    monkeypatch.setenv("NTFY_TOPIC", "kanal")
    monkeypatch.setattr(hlidac, "STATE_PATH", tmp_path / "ceny.json")

    assert hlidac.main() == 2
