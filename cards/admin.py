from django.contrib import admin
from cards.models import Card, CardAdminLog
from django.contrib import messages
from cards.services.admin_log import log_admin_action

from cards.models import Set, Card



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

    actions = ["excluir_cartas", "restaurar_cartas"]


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

    search_fields = ("nome", "codigo_liga")
    ordering = ("nome",)
    inlines = [CardInline]

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
