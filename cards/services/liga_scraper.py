from playwright.sync_api import sync_playwright
from decimal import Decimal
import time

from cards.models import Card


def _parse_preco(texto: str) -> Decimal:
    texto = (
        texto.replace("R$", "")
        .replace(".", "")
        .replace(",", ".")
        .strip()
    )
    return Decimal(texto)


def extrair_precos_liga(url: str) -> dict:
    """
    Retorna:
    {
        "normal": {"min": Decimal, "med": Decimal, "max": Decimal},
        "foil":   {"min": Decimal, "med": Decimal, "max": Decimal}
    }
    """

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(url, timeout=60_000)
        page.wait_for_selector(".container-price-mkp", timeout=60_000)

        time.sleep(1)

        blocos = page.query_selector_all(".container-price-mkp")

        resultado = {}

        for bloco in blocos:
            tipo = bloco.query_selector(".extras").inner_text().strip()

            if tipo == "N":
                chave = "normal"
            elif tipo == "F":
                chave = "foil"
            else:
                continue

            min_ = bloco.query_selector(".min .price").inner_text()
            med_ = bloco.query_selector(".medium .price").inner_text()
            max_ = bloco.query_selector(".max .price").inner_text()

            resultado[chave] = {
                "min": _parse_preco(min_),
                "med": _parse_preco(med_),
                "max": _parse_preco(max_),
            }

        browser.close()
        return resultado


def atualizar_preco_carta(card: Card) -> bool:
    """
    Atualiza os preços da carta usando a Liga Pokémon
    """
    if not card.liga_url:
        return False

    precos = extrair_precos_liga(card.liga_url)

    if "normal" in precos:
        card.preco_min = precos["normal"]["min"]
        card.preco_med = precos["normal"]["med"]
        card.preco_max = precos["normal"]["max"]

    if "foil" in precos:
        card.preco_min_foil = precos["foil"]["min"]
        card.preco_med_foil = precos["foil"]["med"]
        card.preco_max_foil = precos["foil"]["max"]

    card.save()
    return True
