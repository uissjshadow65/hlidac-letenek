"""Testy notifikací – nic se doopravdy neodesílá, jen kontrolujeme připravený požadavek."""

import json

import pytest

import notifikace


def test_pozadavek_obsahuje_kanal_titulek_a_zpravu_v_utf8():
    request = notifikace.build_request("testovaci-kanal", "Paříž ✈️", "Cena klesla na 1 999 Kč", ["chart_with_downwards_trend"])

    assert request.full_url == "https://ntfy.sh/"
    assert request.get_method() == "POST"
    payload = json.loads(request.data.decode("utf-8"))
    assert payload == {
        "topic": "testovaci-kanal",
        "title": "Paříž ✈️",
        "message": "Cena klesla na 1 999 Kč",
        "tags": ["chart_with_downwards_trend"],
        "priority": 3,
    }


def test_notifikace_nema_odkaz_klepnuti_jen_otevre_ntfy():
    payload = json.loads(notifikace.build_request("k", "T", "Z", priority=notifikace.PRIORITY_MAX).data)

    assert "click" not in payload


def test_chybejici_kanal_vyhodi_srozumitelnou_chybu():
    with pytest.raises(ValueError, match="NTFY_TOPIC"):
        notifikace.build_request("", "Titulek", "Zpráva")


def test_odeslani_pouzije_pripraveny_pozadavek(monkeypatch):
    sent = []

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    def fake_urlopen(request, timeout):
        sent.append(request)
        return FakeResponse()

    # Místo skutečného internetu podstrčíme falešnou funkci.
    monkeypatch.setattr(notifikace.urllib.request, "urlopen", fake_urlopen)
    notifikace.send_notification("kanal", "Titulek", "Zpráva")

    assert len(sent) == 1
    assert json.loads(sent[0].data)["topic"] == "kanal"


def test_poplach_ma_prioritu_5():
    payload = json.loads(notifikace.build_request("k", "T", "Z", priority=notifikace.PRIORITY_MAX).data)

    assert payload["priority"] == 5
