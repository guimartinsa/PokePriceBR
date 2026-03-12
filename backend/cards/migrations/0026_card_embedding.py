from django.db import migrations
from pgvector.django import VectorField


class Migration(migrations.Migration):
    dependencies = [
        ("cards", "0025_collectioncard_owned_variations"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="",
        ),
        migrations.AddField(
            model_name="card",
            name="embedding",
            field=VectorField(dimensions=512, null=True, blank=True),
        ),
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS card_embedding_idx "
                "ON cards_card USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
            ),
            reverse_sql="DROP INDEX IF EXISTS card_embedding_idx;",
        ),
    ]