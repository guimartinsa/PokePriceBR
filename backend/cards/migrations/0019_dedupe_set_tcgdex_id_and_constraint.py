from django.db import migrations, models


def dedupe_sets_by_tcgdex_id(apps, schema_editor):
    Set = apps.get_model("cards", "Set")

    duplicated_ids = (
        Set.objects.exclude(tcgdex_id__isnull=True)
        .exclude(tcgdex_id="")
        .values_list("tcgdex_id", flat=True)
    )

    seen = set()
    for tcgdex_id in duplicated_ids:
        if tcgdex_id in seen:
            continue
        seen.add(tcgdex_id)

        duplicates = Set.objects.filter(tcgdex_id=tcgdex_id).order_by("id")
        keeper = duplicates.first()

        for duplicate in duplicates.exclude(id=keeper.id):
            Set.objects.filter(id=keeper.id).update(
                nome=duplicate.nome or keeper.nome,
                codigo_liga=duplicate.codigo_liga or keeper.codigo_liga,
                logo=duplicate.logo or keeper.logo,
                release_date=duplicate.release_date or keeper.release_date,
                serie_id=duplicate.serie_id or keeper.serie_id,
                serie_nome=duplicate.serie_nome or keeper.serie_nome,
            )
            duplicate.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0018_set_additional_fields"),
    ]

    operations = [
        migrations.RunPython(dedupe_sets_by_tcgdex_id, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="set",
            constraint=models.UniqueConstraint(
                condition=~models.Q(tcgdex_id__isnull=True) & ~models.Q(tcgdex_id=""),
                fields=("tcgdex_id",),
                name="cards_set_unique_non_blank_tcgdex_id",
            ),
        ),
    ]
