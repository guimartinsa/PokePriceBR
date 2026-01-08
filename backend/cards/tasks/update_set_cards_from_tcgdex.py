from celery import shared_task

from cards.models import Card
from cards.tasks.update_card_from_tcgdex import update_card_from_tcgdex_task


@shared_task
def update_set_cards_from_tcgdex_task(set_id: int):
    cards = Card.objects.filter(set_id=set_id, ativa=True)

    disparadas = 0

    for card in cards:
        update_card_from_tcgdex_task.delay(card.id)
        disparadas += 1

    return {
        "set_id": set_id,
        "cards_dispatched": disparadas,
    }
