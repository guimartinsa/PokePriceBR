'''import requests
from cards.models import Set

TCGDEX_BASE = "https://api.tcgdex.net/v2/en"

def import_sets_from_tcgdex():
    url = f"{TCGDEX_BASE}/sets"
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    sets = response.json()
    created = 0

    for s in sets:
        _, is_created = Set.objects.update_or_create(
            tcgdex_id=s["id"],
            defaults={
                "codigo": s["id"].upper(),
                "nome": s["name"],
                "release_date": s.get("releaseDate"),
            }
        )
        if is_created:
            created += 1

    return created
'''