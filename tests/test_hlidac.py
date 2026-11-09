"""Testy celého běhu hlídače – falešný Google, falešné notifikace, žádné čekání."""

from datetime import datetime, timedelta
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
    """Místo odeslání do mobilu si zprávy jen zapamatuje.

    Ukládá jen začátek titulku (před " · od …"), cena se v testech mění.
    Poplach s nejvyšší prioritou ukládá jako "🚨 POPLACH".
    """

    def __init__(self, broken=False):
        self.sent = []
        self.charts = []  # titulky zpráv, ke kterým byl přiložený graf
        self.bodies = []
        self.broken = broken

    def __call__(self, topic, title, body, priority=3, attachment=None):
        if self.broken:
            raise OSError("vymyšlený výpadek ntfy")
        name = "🚨 POPLACH" if priority == 5 else title.split(" · ")[0]
        self.sent.append(name)
        self.bodies.append(body)
        if attachment is not None:
            assert attachment.startswith(b"\x89PNG")
            self.charts.append(name)


def run(tmp_path, google, notify, now=NIGHT):
    return hlidac.run(tmp_path / "ceny.json", "kanal", now, get_offer=google, notify=notify, sleep=lambda s: None)


def test_prvni_beh_posle_prehled_a_ulozi_vsech_14_kombinaci(tmp_path):
    notify = FakeNotify()

    assert run(tmp_path, FakeGoogle(), notify) == 0

    assert notify.sent == ["✈️ Hlídač spuštěn"]
    assert len(load_state(tmp_path / "ceny.json").offers) == 14


def test_beze_zmeny_ceny_prijde_hodinova_kontrola(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle(), notify)

    assert notify.sent == ["🕐 Hodinová kontrola"]


def test_pri_zmene_ceny_hodinova_kontrola_neprijde_navic(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"VIE 2027-05-12": 2900}), notify)

    assert notify.sent == ["💰 Změna ceny"]


def test_zmena_ceny_posle_jednu_souhrnnou_zpravu(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"VIE 2027-05-12": 2850, "KRK 2027-05-13": 3100}), notify)

    assert notify.sent == ["💰 Změna ceny"]
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

    assert notify.sent == ["✅ Hlídač letenek zase funguje", "🕐 Hodinová kontrola"]
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

    assert notify.sent == ["🕐 Hodinová kontrola"]


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

    assert morning.sent == ["☀️ Ranní přehled"]  # ranní přehled nahradí hodinovou kontrolu
    assert later.sent == ["🕐 Hodinová kontrola"]


def test_prvni_beh_rano_neposle_prehled_dvakrat(tmp_path):
    notify = FakeNotify()

    run(tmp_path, FakeGoogle(), notify, now=MORNING)

    assert notify.sent == ["✈️ Hlídač spuštěn"]


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


# --- 🚨 Poplach pod 2 000 Kč/os. ---


def test_pokles_pod_2000_posle_poplach_s_nejvyssi_prioritou(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1990}), notify)

    # Nejdřív běžná zpráva o změně, poplach poslední → v mobilu úplně nahoře.
    assert notify.sent == ["💰 Změna ceny", "🚨 POPLACH"]


def test_cena_presne_2000_neni_poplach(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 2000}), notify)

    assert "🚨 POPLACH" not in notify.sent


def test_poplach_se_neopakuje_kazdou_hodinu(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1990}), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1990}), notify)

    assert notify.sent == ["🕐 Hodinová kontrola"]  # bez dalšího poplachu


def test_dalsi_zlevneni_pod_hranici_posle_poplach_znovu(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1990}), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1850}), notify)

    assert notify.sent == ["💰 Změna ceny", "🚨 POPLACH"]


def test_mirne_zdrazeni_pod_hranici_poplach_neposle(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1900}), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1950}), notify)

    assert notify.sent == ["💰 Změna ceny"]


def test_po_navratu_nad_hranici_a_novem_poklesu_prijde_poplach_znovu(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1990}), FakeNotify())
    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 2100}), FakeNotify())
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 1990}), notify)

    assert notify.sent == ["💰 Změna ceny", "🚨 POPLACH"]


def test_poplach_prijde_i_pri_prvnim_behu(tmp_path):
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"VIE 2027-05-12": 1500}), notify)

    assert notify.sent == ["✈️ Hlídač spuštěn", "🚨 POPLACH"]


# --- Blokace Googlem: další pokus na jiném serveru ---


def test_blokace_pred_poslednim_pokusem_nic_neposle_ani_neulozi(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    before = (tmp_path / "ceny.json").read_text(encoding="utf-8")
    notify = FakeNotify()

    result = hlidac.run(
        tmp_path / "ceny.json", "kanal", NIGHT,
        get_offer=FakeGoogle(failing=True), notify=notify, sleep=lambda s: None, final_attempt=False,
    )

    assert result == hlidac.EXIT_BLOCKED
    assert notify.sent == []
    assert (tmp_path / "ceny.json").read_text(encoding="utf-8") == before


def test_uspesny_pokus_pred_poslednim_pokusem_funguje_normalne(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    result = hlidac.run(
        tmp_path / "ceny.json", "kanal", NIGHT,
        get_offer=FakeGoogle(), notify=notify, sleep=lambda s: None, final_attempt=False,
    )

    assert result == 0
    assert notify.sent == ["🕐 Hodinová kontrola"]


def test_blokace_pri_poslednim_pokusu_posle_varovani(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify())
    notify = FakeNotify()

    result = run(tmp_path, FakeGoogle(failing=True), notify)

    assert result == 0
    assert notify.sent == ["⚠️ Hlídač letenek nefunguje"]


def test_promenna_prostredi_urci_posledni_pokus(monkeypatch):
    seen = []
    monkeypatch.setenv("NTFY_TOPIC", "kanal")
    monkeypatch.setattr(hlidac, "run", lambda *args, final_attempt: seen.append(final_attempt) or 0)

    monkeypatch.setenv("HLIDAC_FINAL_ATTEMPT", "0")
    hlidac.main()
    monkeypatch.setenv("HLIDAC_FINAL_ATTEMPT", "1")
    hlidac.main()
    monkeypatch.delenv("HLIDAC_FINAL_ATTEMPT")
    hlidac.main()

    assert seen == [False, True, True]


# --- 📈 Graf vývoje cen ---

HOUR = timedelta(hours=1)


def test_prvni_beh_graf_neposle_neni_z_ceho_kreslit(tmp_path):
    notify = FakeNotify()

    run(tmp_path, FakeGoogle(), notify)

    assert notify.charts == []
    assert len(load_state(tmp_path / "ceny.json").history) == 1


def test_graf_prijde_s_hodinovou_kontrolou_jednou_za_6_hodin(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify(), now=NIGHT - HOUR)
    with_chart = [run_and_charts(tmp_path, NIGHT + i * HOUR) for i in range(8)]

    # 3:00 graf, pak 6 hodin nic, v 9:00 zase (s ranním přehledem)
    assert with_chart == [True, False, False, False, False, False, True, False]


def test_graf_prida_trend_za_24_hodin(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify(), now=NIGHT - HOUR)
    notify = FakeNotify()

    run(tmp_path, FakeGoogle({"KRK 2027-05-13": 2800}), notify)

    assert notify.charts == ["💰 Změna ceny"]
    assert notify.bodies[0].startswith("📉 Za 24 h: −200 Kč (zlevnění), 3 000 Kč → 2 800 Kč/os.")


def test_historie_si_pamatuje_nejlevnejsi_cenu_kazdeho_letiste(tmp_path):
    run(tmp_path, FakeGoogle({"PRG 2027-05-12": 2500, "BRQ 2027-05-12": None, "BRQ 2027-05-13": None}), FakeNotify())

    prices = load_state(tmp_path / "ceny.json").history[0]["prices"]
    assert prices["PRG"] == 2500
    assert "BRQ" not in prices


def test_stara_historie_se_maze(tmp_path):
    run(tmp_path, FakeGoogle(), FakeNotify(), now=NIGHT - timedelta(days=31))

    run(tmp_path, FakeGoogle(), FakeNotify())

    assert len(load_state(tmp_path / "ceny.json").history) == 1


def test_kdyz_graf_nejde_nakreslit_zprava_prijde_bez_nej(tmp_path, monkeypatch):
    run(tmp_path, FakeGoogle(), FakeNotify(), now=NIGHT - HOUR)
    monkeypatch.setattr(hlidac.graf, "chart_png", lambda history: 1 / 0)
    notify = FakeNotify()

    assert run(tmp_path, FakeGoogle(), notify) == 0

    assert notify.sent == ["🕐 Hodinová kontrola"]
    assert notify.charts == []


def run_and_charts(tmp_path, now):
    notify = FakeNotify()
    run(tmp_path, FakeGoogle(), notify, now=now)
    return bool(notify.charts)
