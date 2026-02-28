from cards.models import Set, Card
set_jtg = Set.objects.get(codigo_liga="JTG")


 python manage.py atualizar_precos

 ## Celery no Windows

Durante desenvolvimento em Windows, o worker deve ser iniciado com:

celery -A pokepricebr worker -l info --pool=solo

Em produção (Linux), o pool padrão pode ser utilizado.

## Scan (`POST /api/scan/`)

O scan de cartas está integrado com serviço de visão e identificação no catálogo local.

Variáveis necessárias em produção:

- `SCAN_VISION_API_KEY`: chave do provedor de visão.
- `SCAN_VISION_API_URL` (opcional): padrão `https://api.openai.com/v1/chat/completions`.
- `SCAN_VISION_MODEL` (opcional): padrão `gpt-4o-mini`.
- `SCAN_VISION_TIMEOUT_SECONDS` (opcional): padrão `25`.

A API retorna:
- `200` quando identifica e encontra a carta no catálogo.
- `404` quando identifica, mas não encontra a carta no catálogo.
- `503` quando o serviço de reconhecimento está indisponível ou não configurado.
