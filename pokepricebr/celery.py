import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pokepricebr.settings")

app = Celery("pokepricebr")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
