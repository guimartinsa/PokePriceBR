from django.contrib import admin
from cards.tasks.update_card_from_tcgdex import update_card_from_tcgdex_task
from cards.tasks.update_set_cards_from_tcgdex import update_set_cards_from_tcgdex_task
from cards.tasks.atualizar_precos_set_task import atualizar_precos_set_task
from cards.models import Card, CardAdminLog
from django.contrib import messages
from cards.services.admin_log import log_admin_action

from cards.models import Set, Card

from cards.tasks.import_cards import import_cards_from_set_task
from cards.tasks.atualizar_todas_cartas import atualizar_todas_cartas



@admin.register(CardAdminLog)
class CardAdminLogAdmin(admin.ModelAdmin):
    list_display = ("card", "action", "user", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("card__nome", "user__username")
    readonly_fields = ("card", "action", "user", "created_at", "note")

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "numero_completo",
        "set",
        "raridade",
        "ativa",
    )

    list_filter = ("ativa", "set", "raridade")
    search_fields = ("nome", "numero_completo")

    actions = [
        "excluir_cartas",
        "restaurar_cartas",
        "atualizar_precos_global",   
        "atualizar_detalhes_tcgdex",
    ]

    @admin.action(description="Excluir cartas selecionadas")
    def excluir_cartas(self, request, queryset):
        atualizadas = 0

        for card in queryset.filter(ativa=True):
            card.ativa = False
            card.save()

            log_admin_action(
                card=card,
                user=request.user,
                action="delete",
                note="Exclusão via Django Admin",
            )

            atualizadas += 1

        self.message_user(
            request,
            f"{atualizadas} carta(s) excluída(s).",
            level=messages.SUCCESS,
        )

    @admin.action(description="Restaurar cartas selecionadas")
    def restaurar_cartas(self, request, queryset):
        atualizadas = 0

        for card in queryset.filter(ativa=False):
            card.ativa = True
            card.save()

            log_admin_action(
                card=card,
                user=request.user,
                action="restore",
                note="Restauração via Django Admin",
            )

            atualizadas += 1

        self.message_user(
            request,
            f"{atualizadas} carta(s) restaurada(s).",
            level=messages.SUCCESS,
        )

    @admin.action(description="Atualizar preços (GLOBAL)")
    def atualizar_precos_global(self, request, queryset):
        atualizar_todas_cartas.delay()

        self.message_user(
            request,
            "Atualização GLOBAL de preços iniciada (Celery).",
            level=messages.SUCCESS,
        )


    @admin.action(description="Atualizar detalhes via TCGdex")
    def atualizar_detalhes_tcgdex(self, request, queryset):
        total = 0

        for card in queryset:
            if card.tcgdex_id:
                update_card_from_tcgdex_task.delay(card.id)
                total += 1

        self.message_user(
            request,
            f"{total} carta(s) enviadas para atualização de detalhes.",
            level=messages.SUCCESS,
        )
#------sets---------#

class CardInline(admin.TabularInline):
    model = Card
    extra = 0
    fields = ("nome", "numero_completo", "ativa")
    readonly_fields = fields
    can_delete = False


@admin.register(Set)
class SetAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "codigo_liga",
        #"total_cartas",
    )

    search_fields = ("nome", "codigo_liga", "tcgdex_id")
    ordering = ("nome",)
    inlines = [CardInline]

    actions = [
        "importar_cartas_do_set",
        "atualizar_precos_do_set",
        "atualizar_detalhes_do_set",
    ]

    # -------- AÇÕES -------- #

    @admin.action(description="Importar cartas do set (TCGdex)")
    def importar_cartas_do_set(self, request, queryset):
        disparados = 0

        for set_obj in queryset:
            if not set_obj.tcgdex_id:
                self.message_user(
                    request,
                    f'Set "{set_obj.nome}" não possui tcgdex_id.',
                    level=messages.WARNING,
                )
                continue

            import_cards_from_set_task.delay(set_obj.id)
            disparados += 1

        if disparados:
            self.message_user(
                request,
                f"Importação iniciada para {disparados} set(s).",
                level=messages.SUCCESS,
            )

    @admin.action(description="Atualizar preços das cartas do set")
    def atualizar_precos_do_set(self, request, queryset):
        total_cartas = 0

        for set_obj in queryset:
            cartas = Card.objects.filter(set=set_obj, ativa=True)
            total_cartas += cartas.count()

            for card in cartas:
                atualizar_precos_set_task.delay(card.id)

        self.message_user(
            request,
            f"Atualização de preços iniciada para {total_cartas} carta(s).",
            level=messages.SUCCESS,
        )

    @admin.action(description="Atualizar detalhes das cartas do set (TCGdex)")
    def atualizar_detalhes_do_set(self, request, queryset):
        disparados = 0

        for set_obj in queryset:
            update_set_cards_from_tcgdex_task.delay(set_obj.id)
            disparados += 1

        self.message_user(
            request,
            f"Atualização de detalhes iniciada para {disparados} set(s).",
            level=messages.SUCCESS,
        )

    def total_cartas(self, obj):
        return obj.cartas.count()

    total_cartas.short_description = "Qtd. Cartas"

    def has_delete_permission(self, request, obj=None):
        if obj and obj.cartas.exists():
            return False
        return True

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ("codigo_liga",)
        return ()
