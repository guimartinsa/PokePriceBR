from django.urls import path
from .views import (
    CardListView,
    CardDetailView,
    AtualizarPrecoCartaView,
    AtualizarTodasCartasView,
)

urlpatterns = [
    path("cards/", CardListView.as_view(), name="card-list"),
    path("cards/<int:pk>/", CardDetailView.as_view(), name="card-detail"),
    path(
        "cards/<int:pk>/atualizar-preco/",
        AtualizarPrecoCartaView.as_view(),
        name="card-atualizar-preco",
    ),
    path(
        "cards/atualizar-todas/",
        AtualizarTodasCartasView.as_view(),
        name="cards-atualizar-todas",
    ),

]

