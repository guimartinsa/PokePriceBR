from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0017_collection_is_public_collectioncard_custom_photo_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="set",
            name="logo",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="set",
            name="release_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="set",
            name="serie_id",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="set",
            name="serie_nome",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
