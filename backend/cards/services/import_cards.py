import requests

from cards.models import Card, Set

TCGDEX_SETS_API = "https://api.tcgdex.net/v2/pt/sets"


def import_cards_from_tcgdex_set(set_obj: Set) -> dict:
    if not set_obj.tcgdex_id:
        return {"set": set_obj.codigo_liga, "total_cards": 0, "created": 0, "updated": 0}

    url = f"{TCGDEX_SETS_API}/{set_obj.tcgdex_id}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = response.json()
    cards = data.get("cards", [])
    total_cards = int(data.get("cardCount", {}).get("total", 0) or 0)

    created = 0
    updated = 0

    for card_data in cards:
        image = card_data.get("image")
        if isinstance(image, dict):
            image_small = image.get("low") or image.get("small")
            image_large = image.get("high") or image.get("large")
        else:
            image_small = image
            image_large = image

        defaults = {
            "nome": card_data.get("name", ""),
            "numero": str(card_data.get("localId", "")),
            "total_set": total_cards,
            "numero_completo": f'{card_data.get("localId", "")}/{total_cards}',
            "raridade": card_data.get("rarity"),
            "imagem": image_small,
            "imagem_grande": image_large,
            "set": set_obj,
        }

        card, was_created = Card.objects.update_or_create(
            tcgdex_id=card_data.get("id"),
            defaults=defaults,
        )

        if was_created:
            created += 1
        else:
            updated += 1

    return {
        "set": set_obj.codigo_liga,
        "total_cards": len(cards),
        "created": created,
        "updated": updated,
    }
