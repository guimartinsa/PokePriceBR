from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, reverse
from django.utils.html import format_html
from celery.result import AsyncResult
from cards.tasks.update_card_from_tcgdex import update_card_from_tcgdex_task
from cards.tasks.update_set_cards_from_tcgdex import update_set_cards_from_tcgdex_task
from cards.tasks.atualizar_precos_set_task import atualizar_precos_set_task
from cards.models import Card, CardAdminLog
from django.contrib import messages
from cards.services.admin_log import log_admin_action

from cards.models import Set, Card, Avatar, Profile, Series

from cards.tasks.import_cards import import_cards_from_set_task
from cards.tasks.atualizar_todas_cartas import atualizar_todas_cartas
from cards.tasks.import_sets import import_series_from_tcgdex_task, import_sets_from_tcgdex_task
from cards.services.liga_url import gerar_liga_url

@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    list_display = ("nome", "tcgdex_id")
    search_fields = ("nome", "tcgdex_id")
    ordering = ("nome",)

    actions = ["importar_series_tcgdex"]

    @admin.action(description="Importar/atualizar séries da TCGdex")
    def importar_series_tcgdex(self, request, queryset):
        task = import_series_from_tcgdex_task.delay()

        self.message_user(
            request,
            f"Importação/atualização de séries iniciada (task {task.id}).",
            level=messages.SUCCESS,
        )



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
        "atualizar_links_liga",
    ]

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "task-status/",
                self.admin_site.admin_view(self.task_status_view),
                name="cards_card_task_status",
            )
        ]
        return custom_urls + urls

    def task_status_view(self, request):
        task_id = request.GET.get("task_id")
        if not task_id:
            return JsonResponse(
                {
                    "error": "Informe task_id na querystring, ex: ?task_id=<uuid>",
                },
                status=400,
            )

        result = AsyncResult(task_id)
        payload = {
            "task_id": task_id,
            "state": result.state,
        }

        if isinstance(result.info, dict):
            payload["meta"] = result.info
            total = result.info.get("total")
            atualizadas = result.info.get("atualizadas")
            if total and isinstance(total, int) and isinstance(atualizadas, int):
                payload["progress"] = min(round((atualizadas / total) * 100, 2), 100.0)
        elif result.info:
            payload["meta"] = str(result.info)

        if result.successful():
            payload["result"] = result.result

        return JsonResponse(payload)


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
        task = atualizar_todas_cartas.delay()
        status_url = reverse("admin:cards_card_task_status")

        self.message_user(
            request,
            format_html(
                'Atualização GLOBAL de preços iniciada (task {}). '
                '<a href="{}?task_id={}" target="_blank" rel="noopener">Ver andamento</a>.',
                task.id,
                status_url,
                task.id,
            ),
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

    @admin.action(description="Atualizar link da Liga das cartas selecionadas")
    def atualizar_links_liga(self, request, queryset):
        atualizadas = 0

        for card in queryset.select_related("set"):
            if not card.set or not card.set.codigo_liga:
                continue

            card.liga_url = gerar_liga_url(card)
            card.save(update_fields=["liga_url"])
            atualizadas += 1

        self.message_user(
            request,
            f"{atualizadas} link(s) da Liga atualizados.",
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
        "release_date",
        "total_cartas",
    )

    search_fields = ("nome", "codigo_liga", "tcgdex_id")
    ordering = ("-release_date", "nome")
    inlines = [CardInline]

    actions = [
        "importar_sets_tcgdex",
        "importar_cartas_do_set",
        "atualizar_precos_do_set",
        "atualizar_detalhes_do_set",
        "atualizar_links_liga_dos_sets",
    ]

    # -------- AÇÕES -------- #

    @admin.action(description="Importar/atualizar sets selecionados da TCGdex")
    def importar_sets_tcgdex(self, request, queryset):
        tcgdex_ids = list(
            queryset.exclude(tcgdex_id__isnull=True)
            .exclude(tcgdex_id="")
            .values_list("tcgdex_id", flat=True)
        )

        if not tcgdex_ids:
            self.message_user(
                request,
                "Nenhum set selecionado possui tcgdex_id para atualização.",
                level=messages.WARNING,
            )
            return

        task = import_sets_from_tcgdex_task.delay(tcgdex_ids=tcgdex_ids)

        self.message_user(
            request,
            f"Importação/atualização iniciada para {len(tcgdex_ids)} set(s) selecionado(s) (task {task.id}).",
            level=messages.SUCCESS,
        )


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
        sets_disparados = 0

        for set_obj in queryset:
            cartas = Card.objects.filter(set=set_obj, ativa=True)
            total_cartas += cartas.count()

            atualizar_precos_set_task.delay(set_obj.id)
            sets_disparados += 1

        self.message_user(
            request,
            (
                f"Atualização de preços iniciada para {total_cartas} carta(s) "
                f"em {sets_disparados} set(s)."
            ),
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


    @admin.action(description="Atualizar link da Liga de todas as cartas dos sets")
    def atualizar_links_liga_dos_sets(self, request, queryset):
        atualizadas = 0

        for set_obj in queryset:
            if not set_obj.codigo_liga:
                continue

            for card in set_obj.cartas.all():
                card.liga_url = gerar_liga_url(card)
                card.save(update_fields=["liga_url"])
                atualizadas += 1

        self.message_user(
            request,
            f"{atualizadas} link(s) da Liga atualizados nas cartas dos sets selecionados.",
            level=messages.SUCCESS,
        )

    def total_cartas(self, obj):
        return obj.cartas.count()

    total_cartas.short_description = "Qtd. Cartas"

    def has_delete_permission(self, request, obj=None):
        #if obj and obj.cartas.exists():
        #    return False
        return True

    #def get_readonly_fields(self, request, obj=None):
    #    if obj:
    #        return ("codigo_liga",)
    #    return ()


@admin.register(Avatar)
class AvatarAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "avatar_option", "created_at")
    search_fields = ("user__email", "user__first_name")
