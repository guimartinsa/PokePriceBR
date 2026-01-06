import requests
from cards.models import Set


TCGDEX_SETS_URL = "https://api.tcgdex.net/v2/en/sets"


def import_sets_from_tcgdex():
    """
    Importa todos os sets da TCGdex.
    Usa tcgdex_id como chave única.
    Pode ser chamado manualmente ou via Celery.
    """

    response = requests.get(TCGDEX_SETS_URL, timeout=30)
    response.raise_for_status()

    sets_data = response.json()

    created = 0
    updated = 0

    for item in sets_data:
        tcgdex_id = item.get("id")
        nome = item.get("name")
        codigo_liga = item.get("abbreviation")

        if not tcgdex_id or not nome or not codigo_liga:
            continue

        obj, was_created = Set.objects.update_or_create(
            tcgdex_id=tcgdex_id,
            defaults={
                "nome": nome,
                "codigo_liga": codigo_liga,
            },
        )

        if was_created:
            created += 1
        else:
            updated += 1

    return {
        "total": len(sets_data),
        "created": created,
        "updated": updated,
    }
