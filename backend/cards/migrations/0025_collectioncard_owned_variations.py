from django.db import migrations, models


def populate_owned_variations(apps, schema_editor):
    CollectionCard = apps.get_model("cards", "CollectionCard")
    CollectionCard.objects.filter(owned=True).update(
        owned_normal=True,
        owned_foil=True,
        owned_reverse_foil=True,
        owned_master_ball=True,
        owned_pokeball_foil=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0024_card_possui_foil_card_possui_master_ball_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="collectioncard",
            name="owned_foil",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="collectioncard",
            name="owned_master_ball",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="collectioncard",
            name="owned_normal",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="collectioncard",
            name="owned_pokeball_foil",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="collectioncard",
            name="owned_reverse_foil",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(populate_owned_variations, migrations.RunPython.noop),
    ]
