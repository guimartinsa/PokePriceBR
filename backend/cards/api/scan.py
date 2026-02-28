from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def scan_card_view(request):
    """
    Endpoint de scan consumido pelo frontend.

    Hoje o backend apenas valida o upload e retorna uma resposta explícita de
    indisponibilidade da identificação automática (evita 404 no app).
    """
    image = request.FILES.get("image")
    if image is None:
        return Response(
            {"detail": "Arquivo de imagem é obrigatório no campo 'image'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Serviço de reconhecimento ainda não está disponível no backend.",
            "card": None,
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )
