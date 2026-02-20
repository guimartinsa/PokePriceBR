from django.urls import path

from cards.api.collection import collection_view
from cards.api.profile import avatars_view, profile_view
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
    IlustradoresAutocompleteView,
    collection_delete_view,  # 🆕 NOVO
    collections_view,
    collection_cards_view,
    toggle_card_owned,
    atualizar_colecao_view,
    admin_force_downgrade_view,
    admin_suspend_user_view,
    export_collection_view,
)

from .auth import (
    google_login,
    login_with_email,
    me,
    register_with_email,
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
    #users
    path("auth/google/", google_login),
    path("auth/login/", login_with_email),
    path("auth/register/", register_with_email),
    path("me/", me, name="me"),
    path("profile/", profile_view),
    path("profile/avatars/", avatars_view),
    # Collections
    path("collections/", collections_view),
    path("collections/<int:collection_id>/", collection_delete_view),  # 🆕 NOVA ROTA
    path("collections/<int:collection_id>/cards/", collection_cards_view),
    path("collections/<int:collection_id>/toggle/", toggle_card_owned),
    path("collections/<int:collection_id>/atualizar-precos/", atualizar_colecao_view),
    path("collections/<int:collection_id>/export/", export_collection_view),
    path("admin/users/<int:user_id>/suspend/", admin_suspend_user_view),
    path("admin/users/<int:user_id>/force-downgrade/", admin_force_downgrade_view),

]