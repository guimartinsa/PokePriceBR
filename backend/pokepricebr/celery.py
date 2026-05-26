import logging
import os
import sys

from celery import Celery
from celery.signals import setup_logging, task_failure, task_postrun, task_prerun

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pokepricebr.settings")

app = Celery("pokepricebr")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

logger = logging.getLogger(__name__)


@setup_logging.connect
def configure_celery_logging(*_, **__):
    """Force Celery logs to stdout so log aggregators keep correct severity levels."""
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("[%(asctime)s: %(levelname)s/%(processName)s] %(message)s")
    )

    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)


@task_prerun.connect
def log_task_start(task_id=None, task=None, args=None, kwargs=None, **_):
    logger.info(
        "task_start name=%s id=%s args=%s kwargs=%s",
        getattr(task, "name", "<unknown>"),
        task_id,
        args,
        kwargs,
    )


@task_postrun.connect
def log_task_end(task_id=None, task=None, state=None, retval=None, **_):
    logger.info(
        "task_end name=%s id=%s state=%s retval_type=%s",
        getattr(task, "name", "<unknown>"),
        task_id,
        state,
        type(retval).__name__,
    )


@task_failure.connect
def log_task_failure(task_id=None, exception=None, traceback=None, sender=None, **_):
    logger.error(
        "task_failure name=%s id=%s error=%s",
        getattr(sender, "name", "<unknown>"),
        task_id,
        exception,
        exc_info=(type(exception), exception, traceback),
    )
