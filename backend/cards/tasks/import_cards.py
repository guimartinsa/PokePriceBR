from celery import shared_task

from cards.models import Set
from cards.services.import_cards import import_cards_from_tcgdex_set

@shared_task
def import_cards_from_set_task(set_id: int):
    set_obj = Set.objects.get(id=set_id)
    return import_cards_from_tcgdex_set(set_obj)
