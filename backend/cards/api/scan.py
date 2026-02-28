from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def scan_card_view(request):
    """
    Endpoint de scan de cartas.

    Recebe uma imagem enviada pelo frontend.
    Atualmente apenas valida e retorna resposta de sucesso.
    Preparado para futura integração com IA/OCR.
    """

    try:
        image = request.FILES.get("image")

        # Validação básica
        if image is None:
            return Response(
                {
                    "success": False,
                    "error": "Arquivo de imagem é obrigatório no campo 'image'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validação de tamanho (evita crash no Render)
        if image.size > 5 * 1024 * 1024:  # 5MB
            return Response(
                {
                    "success": False,
                    "error": "Imagem muito grande. Máximo permitido: 5MB."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aqui entrará o reconhecimento futuro
        # exemplo:
        # result = scan_card_ai(image)

        return Response(
            {
                "success": True,
                "message": "Imagem recebida com sucesso.",
                "card": None
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "error": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )