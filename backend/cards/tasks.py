from celery import shared_task


@shared_task
def processar_imagem_fake(card_id: str, passos: int = 3) -> dict:
    """Task de exemplo para validar o fluxo assíncrono (Django -> Redis -> Celery)."""
    return {
        "card_id": card_id,
        "status": "processado",
        "passos": passos,
    }


# Exemplo de chamada:
# processar_imagem_fake.delay("card_001", passos=5)
