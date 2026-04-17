from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse
from cards.api.scan import scan_card_view
from .views import healthz


def api_root(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("", api_root),
    path("healthz/", healthz, name="healthz"),
    path('admin/', admin.site.urls),
    #path('api/', include('cards.urls')),
    path("api/", include("cards.api.urls")),
    path("api/billing/", include("billing.urls")),
    path("scan/", scan_card_view),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)