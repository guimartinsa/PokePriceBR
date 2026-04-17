from django.http import JsonResponse


def healthz(request):
    response = JsonResponse({"status": "ok"})
    response["Cache-Control"] = "no-store"
    return response
