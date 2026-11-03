# Data migration to seed initial FrameworkType records (OKR, MBO, BSC)

from django.db import migrations


def seed_framework_types(apps, schema_editor):
    FrameworkType = apps.get_model("scoreview_core", "FrameworkType")
    frameworks = [
        {
            "code": "OKR",
            "name": "Objectives and Key Results",
            "description": "Quarterly and annual outcome-focused goal setting framework.",
            "is_active": True,
        },
        {
            "code": "MBO",
            "name": "Management by Objectives",
            "description": "Annual cascading objective management framework.",
            "is_active": True,
        },
        {
            "code": "BSC",
            "name": "Balanced Scorecard",
            "description": "Four-perspective strategy and performance tracking framework.",
            "is_active": True,
        },
    ]

    for item in frameworks:
        FrameworkType.objects.update_or_create(
            code=item["code"],
            defaults={
                "name": item["name"],
                "description": item["description"],
                "is_active": item["is_active"],
            },
        )


def unseed_framework_types(apps, schema_editor):
    FrameworkType = apps.get_model("scoreview_core", "FrameworkType")
    FrameworkType.objects.filter(code__in=["OKR", "MBO", "BSC"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("scoreview_core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_framework_types, reverse_code=unseed_framework_types),
    ]

