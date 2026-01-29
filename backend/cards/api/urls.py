from django.urls import path
from .views import (
    CardListView,
    CardDetailView,
    AtualizarPrecoCartaView,
    AtualizarTodasCartasView,
    ExcluirCartaView,
    ImportCardsFromSetView,
    RestaurarCartaView,
    CardAdminLogView,
    SetAutocompleteView,
    SetDetailView,
    SetListView,
    ImportSetsFromTCGDexView,
    RaridadesListView,  # 🆕 NOVO
    IlustradoresAutocompleteView,  # 🆕 NOVO
)

urlpatterns = [
    path("cards/", CardListView.as_view(), name="card-list"),
    path("cards/<int:pk>/", CardDetailView.as_view(), name="card-detail"),

    path("cards/<int:pk>/atualizar-preco/", AtualizarPrecoCartaView.as_view(), name="card-atualizar-preco",),
    path("cards/atualizar-todas/", AtualizarTodasCartasView.as_view(), name="cards-atualizar-todas",),

    path("cards/<int:pk>/excluir/", ExcluirCartaView.as_view()),
    path("cards/<int:pk>/restaurar/", RestaurarCartaView.as_view()),
    
    path("cards/<int:pk>/logs/", CardAdminLogView.as_view()),

    # 🆕 NOVO: Endpoints de filtros
    path("raridades/", RaridadesListView.as_view(), name="raridades-list"),
    path("ilustradores/", IlustradoresAutocompleteView.as_view(), name="ilustradores-autocomplete"),

    path("sets/", SetListView.as_view(), name="set-list"),
    path("sets/importar-tcgdex/", ImportSetsFromTCGDexView.as_view(), name="set-import-tcgdex"),
    path(
        "sets/<int:pk>/importar-cartas/",
        ImportCardsFromSetView.as_view(),
        name="set-import-cards",
    ),
    path("sets/<int:pk>/", SetDetailView.as_view(), name="set-detail"),
    path("sets/autocomplete/", SetAutocompleteView.as_view(), name="set-autocomplete"),
]