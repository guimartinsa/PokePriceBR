import logging
import time

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def worker_diagnostic_task(self, sleep_seconds: int = 2):
    """
    Task mínima para validar estabilidade estrutural do worker sem scraping/DB externa.
    """
    logger.info(
        "worker_diagnostic_task.start task_id=%s sleep_seconds=%s",
        self.request.id,
        sleep_seconds,
    )
    time.sleep(max(0, sleep_seconds))
    logger.info("worker_diagnostic_task.success task_id=%s", self.request.id)
    return {"status": "ok", "task_id": self.request.id, "sleep_seconds": sleep_seconds}
