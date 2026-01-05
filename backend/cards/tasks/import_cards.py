from celery import shared_task
import requests

from cards.models import Set, Card

TCGDEX_API = "https://api.tcgdex.net/v2/en/sets"

@shared_task
def import_cards_from_set_task(set_id: int):
    set_obj = Set.objects.get(id=set_id)

    url = f"{TCGDEX_API}/{set_obj.tcgdex_id}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = response.json()
    cards = data.get("cards", [])

    created = 0

    for c in cards:
        image = c.get("image")

        if isinstance(image, dict):
            image_small = image.get("small")
            image_large = image.get("large")
        else:
            image_small = image
            image_large = image

        card, was_created = Card.objects.get_or_create(
            tcgdex_id=c["id"],
            defaults={
                "nome": c["name"],
                "numero": int(c["localId"]),
                "total_set": int(data["cardCount"]["total"]),
                "numero_completo": f'{c["localId"]}/{data["cardCount"]["total"]}',
                "raridade": c.get("rarity"),
                "imagem": image_small,
                #"imagem_grande": image_large,
                "set": set_obj,
            },
        )


    return {
        "set": set_obj.codigo_liga,
        "total_cards": len(cards),
        "created": created,
    }
