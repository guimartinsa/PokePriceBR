from urllib.parse import quote


def gerar_url_liga(card):
    """
    Exemplo final:
    https://www.ligapokemon.com.br/?view=cards/card
    &card=Mega%20Charizard%20X%20ex%20(125%2F094)
    &ed=PRC
    &num=125
    """

    nome_url = f"{card.nome} ({card.numero_completo})"
    nome_url = quote(nome_url)

    return (
        "https://www.ligapokemon.com.br/?view=cards/card"
        f"&card={nome_url}"
        f"&ed={card.set.codigo_liga}"
        f"&num={card.numero}"
    )
