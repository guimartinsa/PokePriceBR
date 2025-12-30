from cards.models import Set, Card
set_jtg = Set.objects.get(codigo_liga="JTG")


 python manage.py atualizar_precos

 ## Celery no Windows

Durante desenvolvimento em Windows, o worker deve ser iniciado com:

celery -A pokepricebr worker -l info --pool=solo

Em produção (Linux), o pool padrão pode ser utilizado.
