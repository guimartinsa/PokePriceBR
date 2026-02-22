import requests
from cards.models import Set


TCGDEX_SETS_URL = "https://api.tcgdex.net/v2/en/sets"
TCGDEX_SET_DETAIL_URL = "https://api.tcgdex.net/v2/en/sets/{set_id}"


def _extract_codigo_liga(set_data):
    abbreviation = set_data.get("abbreviation")

    if isinstance(abbreviation, dict):
        return abbreviation.get("official") or abbreviation.get("legacy")

    if isinstance(abbreviation, str):
        return abbreviation

    return None


def _normalize_logo_url(logo_url):
    if not logo_url:
        return None

    return logo_url if logo_url.endswith(".webp") else f"{logo_url}.webp"


def import_sets_from_tcgdex(set_ids=None):
    """
    Importa sets da TCGdex com dados detalhados.
    Usa tcgdex_id como chave única.
    Quando set_ids é informado, importa/atualiza apenas os sets informados.
    """

    if set_ids:
        sets_data = [{"id": set_id} for set_id in set_ids]
    else:
        response = requests.get(TCGDEX_SETS_URL, timeout=30)
        response.raise_for_status()
        sets_data = response.json()

    created = 0
    updated = 0
    skipped = 0

    for item in sets_data:
        tcgdex_id = item.get("id")
        if not tcgdex_id:
            skipped += 1
            continue

        detail_response = requests.get(TCGDEX_SET_DETAIL_URL.format(set_id=tcgdex_id), timeout=30)
        detail_response.raise_for_status()
        set_data = detail_response.json()

        nome = set_data.get("name")
        codigo_liga = _extract_codigo_liga(set_data)

        if not nome:
            skipped += 1
            continue

        serie = set_data.get("serie") or {}

        _, was_created = Set.objects.update_or_create(
            tcgdex_id=tcgdex_id,
            defaults={
                "nome": nome,
                "codigo_liga": codigo_liga,
                "logo": _normalize_logo_url(set_data.get("logo")),
                "release_date": set_data.get("releaseDate"),
                "serie_id": serie.get("id"),
                "serie_nome": serie.get("name"),
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
        "skipped": skipped,
    }
