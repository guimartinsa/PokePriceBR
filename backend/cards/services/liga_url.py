from urllib.parse import quote_plus


BASE_LIGA_URL = "https://www.ligapokemon.com.br/?view=cards/card"


def gerar_liga_url(card) -> str:
    """
    Gera a URL oficial da Liga Pokémon para a carta
    """
    nome = card.nome.strip()
    numero_completo = card.numero_completo.strip()
    codigo_set = card.set.codigo_liga
    numero = card.numero

    card_param = f"{nome} ({numero_completo})"

    return (
        f"{BASE_LIGA_URL}"
        f"&card={quote_plus(card_param)}"
        f"&ed={codigo_set}"
        f"&num={numero}"
    )
