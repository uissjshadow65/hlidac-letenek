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
    click: str | None = None,
    priority: int = PRIORITY_DEFAULT,
) -> urllib.request.Request:
    """Připraví HTTP požadavek pro ntfy (zatím nic neodesílá).

    Posíláme JSON, protože hlavičky HTTP neumí češtinu – JSON s UTF-8 ano.
    `click` = odkaz, který se otevře po klepnutí na notifikaci.
    `priority` = 1 (nejnižší) až 5 (nejvyšší, poplach).
    """
    if not topic:
        raise ValueError("Chybí název kanálu ntfy (proměnná prostředí NTFY_TOPIC).")
    payload = {"topic": topic, "title": title, "message": message, "tags": tags or [], "priority": priority}
    if click:
        payload["click"] = click
    return urllib.request.Request(
        NTFY_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )


def send_notification(
    topic: str,
    title: str,
    message: str,
    tags: list[str] | None = None,
    click: str | None = None,
    priority: int = PRIORITY_DEFAULT,
) -> None:
    """Odešle notifikaci. Při chybě (výpadek sítě, ntfy nedostupné) vyhodí výjimku."""
    request = build_request(topic, title, message, tags, click, priority)
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
