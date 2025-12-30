from urllib.parse import quote


def gerar_link_liga(carta):
    """
    Gera a URL oficial da Liga Pokémon para uma carta.
    Compatível com over-number (ex: 125/094).
    """
    card_param = f"{carta.nome} ({carta.numero}/{carta.liga_num})"
    card_encoded = quote(card_param)

    return (
        "https://www.ligapokemon.com.br/"
        f"?view=cards/card&card={card_encoded}"
        f"&ed={carta.set.codigo_liga}&num={carta.numero}"
    )
