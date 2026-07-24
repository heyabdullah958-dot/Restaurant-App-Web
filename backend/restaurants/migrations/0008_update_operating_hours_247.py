import datetime
from django.db import migrations

def update_hours_to_247(apps, schema_editor):
    Restaurant = apps.get_model('restaurants', 'Restaurant')
    Restaurant.objects.all().update(
        opens_at=datetime.time(0, 0),
        closes_at=datetime.time(23, 59, 59)
    )

class Migration(migrations.Migration):
    dependencies = [
        ('restaurants', '0007_restaurant_is_force_closed'),
    ]

    operations = [
        migrations.RunPython(update_hours_to_247, reverse_code=migrations.RunPython.noop),
    ]
