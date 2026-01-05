import requests
from cards.models import Card, Set

TCGDEX_BASE = "https://api.tcgdex.net/v2/en"

def import_cards_from_set(set_codigo: str):
    tcg_set = Set.objects.get(codigo_liga=set_codigo)

    url = f"{TCGDEX_BASE}/sets/{tcg_set.tcgdex_id}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = response.json()

    for card in data["cards"]:
        Card.objects.update_or_create(
            tcgdex_id=card["id"],
            defaults={
                "nome": card["name"],
                "numero": card["localId"],
                "raridade": card.get("rarity"),
                "set": tcg_set,
                "image_small_url": card["image"].get("small"),
                "image_large_url": card["image"].get("large"),
            }
        )
