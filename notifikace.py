"""Odeslání notifikace do mobilu přes službu ntfy.sh.

Jak to funguje: v aplikaci ntfy v mobilu se přihlásíš k odběru "kanálu" (topic)
s tajným názvem. Cokoli na tento kanál pošleme, přijde ti jako notifikace.
Název kanálu je jediná "ochrana" – proto je náhodný a nepatří do kódu,
čte se z proměnné prostředí NTFY_TOPIC.

Zkušební zpráva (PowerShell):
    $env:NTFY_TOPIC = "tvuj-tajny-kanal"
    .venv\\Scripts\\python.exe notifikace.py
"""

import json
import os
import urllib.parse
import urllib.request

NTFY_URL = "https://ntfy.sh/"
TIMEOUT_SECONDS = 15


PRIORITY_DEFAULT = 3
PRIORITY_MAX = 5  # ntfy: nejdelší vibrace, vyskakovací okno; na iPhonu "časově citlivé"


def build_request(
    topic: str,
    title: str,
    message: str,
    tags: list[str] | None = None,
    priority: int = PRIORITY_DEFAULT,
) -> urllib.request.Request:
    """Připraví HTTP požadavek pro ntfy (zatím nic neodesílá).

    Posíláme JSON, protože hlavičky HTTP neumí češtinu – JSON s UTF-8 ano.
    `priority` = 1 (nejnižší) až 5 (nejvyšší, poplach).
    Bez odkazu ("click"): klepnutí na notifikaci jen otevře aplikaci ntfy.
    """
    if not topic:
        raise ValueError("Chybí název kanálu ntfy (proměnná prostředí NTFY_TOPIC).")
    payload = {"topic": topic, "title": title, "message": message, "tags": tags or [], "priority": priority}
    return urllib.request.Request(
        NTFY_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )


def build_attachment_request(
    topic: str,
    title: str,
    message: str,
    attachment: bytes,
    filename: str,
    tags: list[str] | None = None,
    priority: int = PRIORITY_DEFAULT,
) -> urllib.request.Request:
    """Notifikace s přílohou (např. obrázek grafu – v mobilu se ukáže přímo ve zprávě).

    Soubor jde v těle požadavku (PUT), titulek a text v adrese (?title=…&message=…).
    Adresa je zakódovaná v UTF-8, takže čeština i emoji projdou.
    """
    if not topic:
        raise ValueError("Chybí název kanálu ntfy (proměnná prostředí NTFY_TOPIC).")
    params = {"title": title, "message": message, "priority": str(priority), "filename": filename}
    if tags:
        params["tags"] = ",".join(tags)
    url = NTFY_URL + urllib.parse.quote(topic) + "?" + urllib.parse.urlencode(params)
    return urllib.request.Request(url, data=attachment, method="PUT")


def send_notification(
    topic: str,
    title: str,
    message: str,
    tags: list[str] | None = None,
    priority: int = PRIORITY_DEFAULT,
    attachment: bytes | None = None,
    filename: str = "graf.png",
) -> None:
    """Odešle notifikaci (případně s přílohou). Při chybě (výpadek sítě, ntfy nedostupné) vyhodí výjimku."""
    if attachment is None:
        request = build_request(topic, title, message, tags, priority)
    else:
        request = build_attachment_request(topic, title, message, attachment, filename, tags, priority)
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        if response.status != 200:
            raise RuntimeError(f"ntfy odpovědělo kódem {response.status}")


if __name__ == "__main__":
    send_notification(
        topic=os.environ.get("NTFY_TOPIC", ""),
        title="Hlídač letenek ✈️",
        message="Zkušební zpráva: notifikace fungují.",
        tags=["white_check_mark"],
    )
    print("Zpráva odeslána.")
