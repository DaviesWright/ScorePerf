"""
Create the ScoReview color theme and make it the default.

Palette comes from the ScoReview logo: blue #5B97F5 (primary_500) and
charcoal #383838. primary_600 is the button color: #2157D4, the primary on
senrabconsultech.com, which gives white text 6.3:1 contrast (WCAG AA).
"""

from django.db import migrations

THEME_NAME = "ScoReview Theme"

THEME = {
    "description": "ScoReview brand blue and charcoal",
    "is_default": True,
    "primary_50": "#EFF5FE",
    "primary_100": "#E3EDFD",
    "primary_200": "#CCDFFC",
    "primary_300": "#AFCCFA",
    "primary_400": "#8CB4F8",
    "primary_500": "#5B97F5",
    "primary_600": "#2157D4",
    "primary_700": "#1C49B4",
    "primary_800": "#163A90",
    "primary_900": "#102B6C",
    "dark_50": "#E6E6E6",
    "dark_100": "#A8A8A8",
    "dark_200": "#515151",
    "dark_300": "#383838",
    "dark_400": "#64748B",
    "dark_500": "#1C1C1C",
    "dark_600": "#000000",
    "secondary_50": "#F8FAFC",
    "secondary_100": "#F1F5F9",
    "secondary_200": "#E2E8F0",
    "secondary_300": "#CBD5E1",
    "secondary_400": "#8CB4F8",
    "secondary_500": "#5B97F5",
    "secondary_600": "#2157D4",
    "secondary_700": "#383838",
    "secondary_800": "#262626",
    "secondary_900": "#171717",
}


def create_theme(apps, schema_editor):
    """Create or refresh the theme, then make it the only default."""
    HorillaColorTheme = apps.get_model("horilla_theme", "HorillaColorTheme")
    HorillaColorTheme.objects.exclude(name=THEME_NAME).update(is_default=False)
    HorillaColorTheme.objects.update_or_create(name=THEME_NAME, defaults=THEME)


def remove_theme(apps, schema_editor):
    """Drop the theme; the upstream default is not restored automatically."""
    HorillaColorTheme = apps.get_model("horilla_theme", "HorillaColorTheme")
    HorillaColorTheme.objects.filter(name=THEME_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("horilla_theme", "0002_alter_companytheme_is_active_and_more"),
    ]

    operations = [migrations.RunPython(create_theme, remove_theme)]
