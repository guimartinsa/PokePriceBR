from urllib.parse import quote_plus


BASE_LIGA_URL = "https://www.ligapokemon.com.br/?view=cards/card"


def _formatar_numero_liga(numero: str) -> str:
    try:
        numero_int = int(numero)
    except (TypeError, ValueError):
        return str(numero).strip()

    if numero_int < 100:
        return f"{numero_int:03d}"

    return str(numero_int)


def gerar_liga_url(card) -> str:
    """
    Gera a URL oficial da Liga Pokémon para a carta
    """
    nome = card.nome.strip()
    numero_formatado = _formatar_numero_liga(card.numero)
    numero_completo = f"{numero_formatado}/{card.total_set}"
    codigo_set = card.set.codigo_liga
    numero = card.numero

    card_param = f"{nome} ({numero_completo})"

    return (
        f"{BASE_LIGA_URL}"
        f"&card={quote_plus(card_param)}"
        f"&ed={codigo_set}"
        f"&num={numero}"
    )
