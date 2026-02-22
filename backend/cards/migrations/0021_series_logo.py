from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0020_series"),
    ]

    operations = [
        migrations.AddField(
            model_name="series",
            name="logo",
            field=models.URLField(blank=True, null=True),
        ),
    ]
