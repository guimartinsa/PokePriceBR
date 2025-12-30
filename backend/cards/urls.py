from django.urls import path
from .views import CartaDetailView

urlpatterns = [
    path('cartas/<int:carta_id>/', CartaDetailView.as_view()),
]
