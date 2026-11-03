"""
Rename the background-job system user from "Horilla Bot" to "ScoReview Bot".

The scheduler, history and report code look this user up by username, and that
username now reads "ScoReview Bot" (see the rebrand in CUSTOMIZATIONS.md).
Existing databases still hold the old row, so rename it. Skipped if a user with
the new name already exists.
"""

from django.conf import settings
from django.db import migrations

OLD_NAME = "Horilla Bot"
NEW_NAME = "ScoReview Bot"


def _rename(apps, old, new):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    if User.objects.filter(username=new).exists():
        return
    User.objects.filter(username=old).update(username=new)


def forwards(apps, schema_editor):
    _rename(apps, OLD_NAME, NEW_NAME)


def backwards(apps, schema_editor):
    _rename(apps, NEW_NAME, OLD_NAME)


class Migration(migrations.Migration):

    dependencies = [
        ("scoreview_performance", "0001_scoreview_theme"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
