import requests
from cards.models import Series, Set


TCGDEX_SETS_URL = "https://api.tcgdex.net/v2/en/sets"
TCGDEX_SET_DETAIL_URL = "https://api.tcgdex.net/v2/en/sets/{set_id}"

TCGDEX_SERIES_URL = "https://api.tcgdex.net/v2/en/series"


def import_series_from_tcgdex():
    """Importa séries da TCGdex sem reprocessar sets."""
    response = requests.get(TCGDEX_SERIES_URL, timeout=30)
    response.raise_for_status()
    series_data = response.json()

    created = 0
    updated = 0
    skipped = 0

    for item in series_data:
        tcgdex_id = item.get("id")
        nome = item.get("name")
        logo = _normalize_logo_url(item.get("logo"))

        if not tcgdex_id or not nome:
            skipped += 1
            continue

        _, was_created = Series.objects.update_or_create(
            tcgdex_id=tcgdex_id,
            defaults={"nome": nome, "logo": logo},
        )

        if was_created:
            created += 1
        else:
            updated += 1

    return {
        "total": len(series_data),
        "created": created,
        "updated": updated,
        "skipped": skipped,
    }


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


def import_sets_from_tcgdex(tcgdex_ids=None):
    """
    Importa todos os sets da TCGdex com dados detalhados.
    Usa tcgdex_id como chave única.
    Pode ser chamado manualmente, via Celery ou via painel admin.
    """

    if tcgdex_ids:
        sets_data = [{"id": tcgdex_id} for tcgdex_id in tcgdex_ids]
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

        defaults = {
            "nome": nome,
            "codigo_liga": codigo_liga,
            "logo": _normalize_logo_url(set_data.get("logo")),
            "release_date": set_data.get("releaseDate"),
            "serie_id": serie.get("id"),
            "serie_nome": serie.get("name"),
        }

        existing_sets = Set.objects.filter(tcgdex_id=tcgdex_id).order_by("id")

        if existing_sets.exists():
            target_set = existing_sets.first()
            existing_sets.exclude(id=target_set.id).delete()

            for field, value in defaults.items():
                setattr(target_set, field, value)

            target_set.save(update_fields=list(defaults.keys()))
            was_created = False
        else:
            Set.objects.create(tcgdex_id=tcgdex_id, **defaults)
            was_created = True

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
