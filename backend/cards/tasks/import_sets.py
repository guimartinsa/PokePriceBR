from celery import shared_task
from cards.services.import_sets import import_sets_from_tcgdex


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=10, retry_kwargs={"max_retries": 3})
def import_sets_from_tcgdex_task(self):
    """
    Task Celery para importar sets da TCGdex.
    """
    return import_sets_from_tcgdex()
