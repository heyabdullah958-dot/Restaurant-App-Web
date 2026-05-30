"""
Initial migration for config app — creates AdminAuditLog table.
Auto-generated but written manually since migrations couldn't run in sandbox.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AdminAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(
                    choices=[
                        ('create', 'Created'),
                        ('update', 'Updated'),
                        ('delete', 'Deleted'),
                        ('login', 'Logged In'),
                        ('logout', 'Logged Out'),
                    ],
                    max_length=20
                )),
                ('model_name', models.CharField(max_length=100)),
                ('object_id', models.IntegerField(blank=True, null=True)),
                ('object_repr', models.CharField(blank=True, max_length=255)),
                ('changes', models.JSONField(default=dict)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='audit_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Audit Log',
                'verbose_name_plural': 'Audit Logs',
                'ordering': ['-timestamp'],
            },
        ),
    ]
