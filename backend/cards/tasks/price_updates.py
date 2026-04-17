from datetime import timedelta
import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from cards.models import Card, Collection, CollectionCard
from cards.services.liga_scraper import atualizar_preco_carta

logger = logging.getLogger(__name__)


@shared_task(bind=True, rate_limit="10/m", soft_time_limit=300, time_limit=360)
def atualizar_preco_task(self, card_id):
    logger.info("atualizar_preco_task.start task_id=%s card_id=%s", self.request.id, card_id)
    now = timezone.now()
    cutoff = now - timedelta(hours=24)

    with transaction.atomic():
        try:
            card = Card.objects.select_for_update().get(id=card_id)
        except Card.DoesNotExist:
            logger.warning(
                "atualizar_preco_task.card_not_found task_id=%s card_id=%s",
                self.request.id,
                card_id,
            )
            return {
                "status": "skipped",
                "card_id": card_id,
                "reason": "card_not_found",
            }

        if card.is_updating:
            logger.info(
                "atualizar_preco_task.already_updating task_id=%s card_id=%s",
                self.request.id,
                card_id,
            )
            return {
                "status": "skipped",
                "card_id": card_id,
                "reason": "already_updating",
            }

        if card.last_price_update and card.last_price_update > cutoff:
            logger.info(
                "atualizar_preco_task.recently_updated task_id=%s card_id=%s last_price_update=%s",
                self.request.id,
                card_id,
                card.last_price_update,
            )
            return {
                "status": "skipped",
                "card_id": card_id,
                "reason": "updated_in_last_24h",
            }

        card.is_updating = True
        card.save(update_fields=["is_updating"])
        logger.info("atualizar_preco_task.locked task_id=%s card_id=%s", self.request.id, card_id)

    try:
        try:
            logger.info(
                "atualizar_preco_task.scrape_begin task_id=%s card_id=%s",
                self.request.id,
                card_id,
            )
            encontrou_preco = atualizar_preco_carta(card)
            logger.info(
                "atualizar_preco_task.scrape_end task_id=%s card_id=%s",
                self.request.id,
                card_id,
            )
        except Exception as exc:
            logger.exception(
                "atualizar_preco_task.scrape_error task_id=%s card_id=%s",
                self.request.id,
                card_id,
            )
            return {
                "status": "failed",
                "card_id": card_id,
                "error": str(exc),
            }

        if not encontrou_preco:
            logger.warning(
                "atualizar_preco_task.no_prices_found task_id=%s card_id=%s",
                self.request.id,
                card_id,
            )
            return {
                "status": "skipped",
                "card_id": card_id,
                "reason": "no_prices_found",
            }

        logger.info("atualizar_preco_task.db_update_begin task_id=%s card_id=%s", self.request.id, card_id)
        Card.objects.filter(id=card_id).update(last_price_update=timezone.now())
        logger.info("atualizar_preco_task.success task_id=%s card_id=%s", self.request.id, card_id)
        return {
            "status": "updated",
            "card_id": card_id,
        }
    finally:
        Card.objects.filter(id=card_id).update(is_updating=False)
        logger.info("atualizar_preco_task.unlock task_id=%s card_id=%s", self.request.id, card_id)


@shared_task
def atualizar_colecao_task(collection_id):
    logger.info("atualizar_colecao_task.start collection_id=%s", collection_id)
    if not Collection.objects.filter(id=collection_id).exists():
        logger.warning("atualizar_colecao_task.collection_not_found collection_id=%s", collection_id)
        return {
            "status": "collection_not_found",
            "collection_id": collection_id,
        }

    card_ids = list(
        CollectionCard.objects.filter(collection_id=collection_id).values_list(
            "card_id", flat=True
        )
    )

    for card_id in card_ids:
        atualizar_preco_task.delay(card_id)

    logger.info(
        "atualizar_colecao_task.queued collection_id=%s total_cards=%s",
        collection_id,
        len(card_ids),
    )
    return {
        "status": "queued",
        "collection_id": collection_id,
        "total_cards": len(card_ids),
    }


@shared_task
def atualizar_cartas_madrugada(batch_size=5000):
    logger.info("atualizar_cartas_madrugada.start batch_size=%s", batch_size)
    cutoff = timezone.now() - timedelta(hours=24)
    card_ids = list(
        Card.objects.filter(ativa=True, last_price_update__lt=cutoff).values_list(
            "id", flat=True
        )[:batch_size]
    )

    for card_id in card_ids:
        atualizar_preco_task.delay(card_id)

    logger.info("atualizar_cartas_madrugada.queued total_cards=%s", len(card_ids))
    return {
        "status": "queued",
        "total_cards": len(card_ids),
    }
