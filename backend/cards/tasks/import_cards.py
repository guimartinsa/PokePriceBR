from celery import shared_task
from cards.services.tcgdex_cards import import_cards_from_set

@shared_task
def import_cards_from_set_task(set_codigo):
    import_cards_from_set(set_codigo)
