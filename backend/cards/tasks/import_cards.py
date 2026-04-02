from celery import shared_task

from cards.models import Set
from cards.services.import_cards import import_cards_from_tcgdex_set

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=10, retry_kwargs={"max_retries": 3})
def import_cards_from_set_task(self, set_id: int):
    set_obj = Set.objects.get(id=set_id)
    return import_cards_from_tcgdex_set(set_obj)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            