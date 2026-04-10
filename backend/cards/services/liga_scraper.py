from decimal import Decimal
import logging
import time

from cards.models import Card

logger = logging.getLogger(__name__)
_PLAYWRIGHT_IMPORT_ATTEMPTED = False
_PLAYWRIGHT_SYNC = None
_PLAYWRIGHT_TIMEOUT_ERROR = None
_PLAYWRIGHT_ERROR = None
_PLAYWRIGHT_WARNING_LOGGED = False


def _get_playwright():
    global _PLAYWRIGHT_IMPORT_ATTEMPTED
    global _PLAYWRIGHT_SYNC
    global _PLAYWRIGHT_TIMEOUT_ERROR
    global _PLAYWRIGHT_ERROR
    global _PLAYWRIGHT_WARNING_LOGGED

    if _PLAYWRIGHT_IMPORT_ATTEMPTED:
        return _PLAYWRIGHT_SYNC, _PLAYWRIGHT_TIMEOUT_ERROR, _PLAYWRIGHT_ERROR

    _PLAYWRIGHT_IMPORT_ATTEMPTED = True

    try:
        from playwright.sync_api import sync_playwright
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import Error as PlaywrightError
    except ModuleNotFoundError:
        if not _PLAYWRIGHT_WARNING_LOGGED:
            logger.warning(
                "Playwright não está instalado; scraping de preços da Liga foi ignorado."
            )
            _PLAYWRIGHT_WARNING_LOGGED = True
        return None, None, None

    _PLAYWRIGHT_SYNC = sync_playwright
    _PLAYWRIGHT_TIMEOUT_ERROR = PlaywrightTimeoutError
    _PLAYWRIGHT_ERROR = PlaywrightError
    return _PLAYWRIGHT_SYNC, _PLAYWRIGHT_TIMEOUT_ERROR, _PLAYWRIGHT_ERROR


def _parse_preco(texto: str) -> Decimal:
    texto = (
        texto.replace("R$", "")
        .replace(".", "")
        .replace(",", ".")
        .strip()
    )
    return Decimal(texto)


def extrair_precos_liga(url: str) -> dict:
    sync_playwright, PlaywrightTimeoutError, PlaywrightError = _get_playwright()
    if not sync_playwright:
        return {}

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except PlaywrightError as exc:
            logger.error("Falha ao iniciar navegador Playwright: %s", exc)
            return {}
        try:
            page = browser.new_page()

            # Mantém a task responsiva quando a página da Liga não responde.
            page.goto(url, timeout=20_000, wait_until="domcontentloaded")
            page.wait_for_selector(".container-price-mkp", timeout=20_000)

            time.sleep(1)

            blocos = page.query_selector_all(".container-price-mkp")
            resultado = {}

            for bloco in blocos:
                extras_el = bloco.query_selector(".extras")
                if not extras_el:
                    continue

                tipo_raw = extras_el.inner_text().strip()

                MAPA_TIPOS = {
                    "N": "normal",
                    "F": "foil",
                    "RF": "reverse foil",
                    "MB": "master ball",
                    "PF": "pokeball foil",
                }

                chave = MAPA_TIPOS.get(tipo_raw)
                if not chave:
                    continue

                try:
                    min_ = bloco.query_selector(".min .price").inner_text()
                    med_ = bloco.query_selector(".medium .price").inner_text()
                    max_ = bloco.query_selector(".max .price").inner_text()
                except Exception:
                    continue

                resultado[chave] = {
                    "min": _parse_preco(min_),
                    "med": _parse_preco(med_),
                    "max": _parse_preco(max_),
                }

            return resultado
        except PlaywrightTimeoutError:
            return {}
        finally:
            browser.close()



def atualizar_preco_carta(card: Card) -> bool:
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

    if "reverse foil" in precos:
        card.preco_min_reverse_foil = precos["reverse foil"]["min"]
        card.preco_med_reverse_foil = precos["reverse foil"]["med"]
        card.preco_max_reverse_foil = precos["reverse foil"]["max"]

    if "master ball" in precos:
        card.preco_min_master_ball = precos["master ball"]["min"]
        card.preco_med_master_ball = precos["master ball"]["med"]
        card.preco_max_master_ball = precos["master ball"]["max"]

    if "pokeball foil" in precos:
        card.preco_min_pokeball_foil = precos["pokeball foil"]["min"]
        card.preco_med_pokeball_foil = precos["pokeball foil"]["med"]
        card.preco_max_pokeball_foil = precos["pokeball foil"]["max"]

    card.save()
    return True
